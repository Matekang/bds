using System;
using System.IO;
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
    [Route("api/users")]
    public class UsersController : ControllerBase
    {
        private readonly BdsDbContext _db;
        private const string SESSION_COOKIE_NAME = "session_token";

        public UsersController(BdsDbContext db)
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

        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var session = GetSessionUser();
            if (session == null || session.Value.Role != "admin")
            {
                return StatusCode(403, new { success = false, message = "Chỉ Admin mới có quyền xem danh sách tài khoản." });
            }

            var users = await _db.Users
                .AsNoTracking()
                .OrderByDescending(u => u.CreatedAt)
                .Select(u => new
                {
                    id = u.Id,
                    fullName = u.FullName,
                    phoneNumber = u.PhoneNumber,
                    email = u.Email,
                    role = u.Role,
                    createdAt = u.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, users });
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] JsonElement body)
        {
            var session = GetSessionUser();
            if (session == null || session.Value.Role != "admin")
            {
                return StatusCode(403, new { success = false, message = "Chỉ Admin mới có quyền thêm tài khoản quản lý." });
            }

            string fullName = body.TryGetProperty("fullName", out var fn) ? fn.GetString()?.Trim() ?? "" : "";
            string phoneNumber = body.TryGetProperty("phoneNumber", out var pn) ? pn.GetString()?.Trim() ?? "" : "";
            string email = body.TryGetProperty("email", out var em) ? em.GetString()?.Trim() ?? "" : "";
            string password = body.TryGetProperty("password", out var pw) ? pw.GetString() ?? "" : "";
            string role = body.TryGetProperty("role", out var r) ? r.GetString()?.Trim() ?? "" : "";

            if (string.IsNullOrEmpty(fullName) || string.IsNullOrEmpty(phoneNumber) || string.IsNullOrEmpty(password) || string.IsNullOrEmpty(role))
            {
                return Ok(new { success = false, message = "Vui lòng nhập đầy đủ Họ tên, Số điện thoại, Mật khẩu và Vai trò." });
            }

            // Check if user with phone already exists
            var existingUser = await _db.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phoneNumber);
            if (existingUser != null)
            {
                return Ok(new { success = false, message = $"Số điện thoại {phoneNumber} đã tồn tại trong hệ thống." });
            }

            var newUser = new User
            {
                Id = "user-" + Guid.NewGuid().ToString("N")[..9],
                FullName = fullName,
                PhoneNumber = phoneNumber,
                Email = email,
                PasswordHash = password,
                Password = password,
                Role = role,
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(newUser);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Thêm tài khoản quản lý thành công!",
                user = new
                {
                    id = newUser.Id,
                    fullName = newUser.FullName,
                    phoneNumber = newUser.PhoneNumber,
                    email = newUser.Email,
                    role = newUser.Role,
                    createdAt = newUser.CreatedAt
                }
            });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(string id)
        {
            var session = GetSessionUser();
            if (session == null || session.Value.Role != "admin")
            {
                return StatusCode(403, new { success = false, message = "Chỉ Admin mới có quyền xóa tài khoản." });
            }

            if (id == "admin-id" || id == session.Value.UserId)
            {
                return Ok(new { success = false, message = "Không thể xóa tài khoản Super Admin chính hoặc tài khoản đang đăng nhập." });
            }

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
            {
                return Ok(new { success = false, message = "Tài khoản không tồn tại." });
            }

            _db.Users.Remove(user);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Đã xóa tài khoản thành công." });
        }
    }
}
