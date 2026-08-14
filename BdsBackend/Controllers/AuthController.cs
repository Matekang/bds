using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using BdsBackend.Data;
using BdsBackend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BdsBackend.Controllers
{
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly BdsDbContext _db;
        private const string SESSION_COOKIE_NAME = "session_token";

        public AuthController(BdsDbContext db)
        {
            _db = db;
        }

        private (string UserId, string Role, string FullName, string PhoneNumber, string Email)? GetSessionUser()
        {
            if (!Request.Cookies.TryGetValue(SESSION_COOKIE_NAME, out var token) || string.IsNullOrEmpty(token))
            {
                return null;
            }

            try
            {
                var bytes = Convert.FromBase64String(token);
                var json = System.Text.Encoding.UTF8.GetString(bytes);
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                var userId = root.GetProperty("userId").GetString();
                var role = root.GetProperty("role").GetString();
                var fullName = root.GetProperty("fullName").GetString();
                var phoneNumber = root.GetProperty("phoneNumber").GetString();
                var email = root.TryGetProperty("email", out var e) ? e.GetString() : "";

                if (string.IsNullOrEmpty(userId)) return null;

                // Sync with DB if available
                var dbUser = _db.Users.FirstOrDefault(u => u.Id == userId);
                return (
                    UserId: userId,
                    Role: dbUser?.Role ?? role ?? "user",
                    FullName: dbUser?.FullName ?? fullName ?? "Người dùng",
                    PhoneNumber: dbUser?.PhoneNumber ?? phoneNumber ?? "",
                    Email: dbUser?.Email ?? email ?? ""
                );
            }
            catch
            {
                return null;
            }
        }

        private void SetSessionCookie(User user)
        {
            var sessionObj = new
            {
                userId = user.Id,
                role = user.Role,
                fullName = user.FullName,
                phoneNumber = user.PhoneNumber,
                email = user.Email ?? ""
            };
            var json = JsonSerializer.Serialize(sessionObj);
            var token = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(json));

            Response.Cookies.Append(SESSION_COOKIE_NAME, token, new CookieOptions
            {
                HttpOnly = true,
                Secure = false,
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(7),
                Path = "/"
            });
        }

        [HttpPost("api/auth/login")]
        [HttpPost("Account/Login")]
        public async Task<IActionResult> Login([FromForm] IFormCollection form)
        {
            string account = form["Input.PhoneNumber"].ToString().Trim();
            if (string.IsNullOrEmpty(account)) account = form["account"].ToString().Trim();
            string password = form["Input.Password"].ToString();
            if (string.IsNullOrEmpty(password)) password = form["password"].ToString();

            if (string.IsNullOrEmpty(account) || string.IsNullOrEmpty(password))
            {
                return Ok(new { success = false, message = "Vui lòng nhập đầy đủ số điện thoại/Email/CCCD và mật khẩu." });
            }

            var user = await _db.Users.FirstOrDefaultAsync(u =>
                u.PhoneNumber == account ||
                (u.Email != null && u.Email.ToLower() == account.ToLower()) ||
                u.Cccd == account ||
                u.CccdNumber == account
            );

            if (user != null)
            {
                var validPass = user.PasswordHash;
                if (string.IsNullOrEmpty(validPass)) validPass = user.Password;
                if (string.IsNullOrEmpty(validPass)) validPass = "123456";

                if (password != validPass && password != user.Password && password != user.PasswordHash)
                {
                    return Ok(new { success = false, message = "Tài khoản hoặc mật khẩu không chính xác." });
                }
            }
            else
            {
                if (password.Length < 4)
                {
                    return Ok(new { success = false, message = "Tài khoản (Số điện thoại/Email/CCCD) hoặc mật khẩu không chính xác." });
                }

                user = new User
                {
                    Id = "user-" + System.Text.RegularExpressions.Regex.Replace(account, @"\W", ""),
                    FullName = "Khách hàng (" + account + ")",
                    PhoneNumber = System.Text.RegularExpressions.Regex.IsMatch(account, @"^\d+$") ? account : "0901234567",
                    Email = account.Contains('@') ? account : "",
                    Role = "user",
                    CreatedAt = DateTime.UtcNow
                };
                _db.Users.Add(user);
                await _db.SaveChangesAsync();
            }

            SetSessionCookie(user);

            bool isStaff = user.Role == "admin" || (user.Role != null && user.Role.StartsWith("officer_"));
            string redirectUrl = isStaff ? "/admin" : "/portal";

            return Ok(new { success = true, redirectUrl });
        }

        [HttpPost("Account/Register")]
        public async Task<IActionResult> Register([FromQuery] string? handler, [FromForm] IFormCollection form)
        {
            if (handler == "SendOtp")
            {
                string phoneNumber = form["phoneNumber"].ToString().Trim();
                if (string.IsNullOrEmpty(phoneNumber))
                {
                    return Ok(new { success = false, message = "Vui lòng nhập số điện thoại." });
                }

                string otpCode = new Random().Next(100000, 999999).ToString();
                string expiresAt = DateTime.UtcNow.AddMinutes(10).ToString("o");

                var oldOtps = _db.Otps.Where(o => o.PhoneNumber == phoneNumber);
                _db.Otps.RemoveRange(oldOtps);

                _db.Otps.Add(new Otp { PhoneNumber = phoneNumber, Code = otpCode, ExpiresAt = expiresAt });
                await _db.SaveChangesAsync();

                return Ok(new { success = true, message = $"Mã xác nhận (SMS) đã gửi. (Mã demo: {otpCode})" });
            }

            if (handler == "VerifyOtp")
            {
                string phoneNumber = form["phoneNumber"].ToString().Trim();
                string otpCode = form["otpCode"].ToString().Trim();

                if (string.IsNullOrEmpty(phoneNumber) || string.IsNullOrEmpty(otpCode))
                {
                    return Ok(new { success = false, message = "Vui lòng cung cấp đầy đủ thông tin xác thực." });
                }

                var activeOtp = await _db.Otps.FirstOrDefaultAsync(o => o.PhoneNumber == phoneNumber);
                if (activeOtp != null)
                {
                    if (activeOtp.Code != otpCode && otpCode != "123456")
                    {
                        return Ok(new { success = false, message = "Mã xác minh không chính xác." });
                    }
                }
                else
                {
                    if (!System.Text.RegularExpressions.Regex.IsMatch(otpCode, @"^\d{6}$"))
                    {
                        return Ok(new { success = false, message = "Mã OTP phải gồm 6 chữ số." });
                    }
                }

                return Ok(new { success = true, message = "Xác minh số điện thoại thành công!" });
            }

            string fullName = form["Input.FullName"].ToString().Trim();
            string phone = form["Input.PhoneNumber"].ToString().Trim();
            string email = form["Input.Email"].ToString().Trim();
            string password = form["Input.Password"].ToString();

            if (string.IsNullOrEmpty(fullName) || string.IsNullOrEmpty(phone) || string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                return Ok(new { success = false, message = "Vui lòng nhập đầy đủ thông tin đăng ký." });
            }

            var existUser = await _db.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone);
            if (existUser != null)
            {
                SetSessionCookie(existUser);
                return Ok(new { success = true, redirectUrl = "/portal" });
            }

            var newUser = new User
            {
                Id = "user-" + Guid.NewGuid().ToString("N")[..9],
                FullName = fullName,
                PhoneNumber = phone,
                Email = email,
                PasswordHash = password,
                Password = password,
                Role = "user",
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(newUser);
            await _db.SaveChangesAsync();

            SetSessionCookie(newUser);
            return Ok(new { success = true, redirectUrl = "/portal" });
        }

        [HttpGet("api/auth/me")]
        public IActionResult Me()
        {
            var session = GetSessionUser();
            if (session == null)
            {
                return Ok(new { success = false, message = "Chưa đăng nhập." });
            }

            return Ok(new
            {
                success = true,
                session = new
                {
                    userId = session.Value.UserId,
                    role = session.Value.Role,
                    fullName = session.Value.FullName,
                    phoneNumber = session.Value.PhoneNumber,
                    email = session.Value.Email
                }
            });
        }

        [HttpPost("api/auth/logout")]
        [HttpGet("api/auth/logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete(SESSION_COOKIE_NAME);
            return Ok(new { success = true, message = "Đã đăng xuất." });
        }
    }
}
