using System;
using System.Text.Json;
using System.Threading.Tasks;
using BdsBackend.Data;
using BdsBackend.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BdsBackend.Controllers
{
    [ApiController]
    [Route("api/settings")]
    public class SettingsController : ControllerBase
    {
        private readonly BdsDbContext _db;
        private readonly IMemoryCache _cache;
        private const string SESSION_COOKIE_NAME = "session_token";
        private const string SETTINGS_CACHE_KEY = "bds_system_settings_cache";

        public SettingsController(BdsDbContext db, IMemoryCache cache)
        {
            _db = db;
            _cache = cache;
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
        public async Task<IActionResult> GetSettings()
        {
            try
            {
                if (!_cache.TryGetValue(SETTINGS_CACHE_KEY, out object? cachedResult) || cachedResult == null)
                {
                    var settings = await _db.Settings.AsNoTracking().FirstOrDefaultAsync();
                    if (settings == null)
                    {
                        settings = new SystemSettings();
                        _db.Settings.Add(settings);
                        await _db.SaveChangesAsync();
                    }

                    object operatingHours = JsonSerializer.Deserialize<object>(settings.OperatingHoursJson)!;
                    object slaSettings = JsonSerializer.Deserialize<object>(settings.SlaSettingsJson)!;

                    cachedResult = new
                    {
                        success = true,
                        settings = new
                        {
                            countdownDeadline = settings.CountdownDeadline,
                            operatingHours = operatingHours,
                            slaSettings = slaSettings
                        }
                    };

                    _cache.Set(SETTINGS_CACHE_KEY, cachedResult, TimeSpan.FromMinutes(10));
                }

                return Ok(cachedResult);
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = $"Lỗi tải cài đặt: {ex.Message}" });
            }
        }

        [HttpPost]
        public async Task<IActionResult> UpdateSettings([FromBody] JsonElement body)
        {
            var session = GetSessionUser();
            if (session == null || session.Value.Role != "admin")
            {
                return StatusCode(403, new { success = false, message = "Quyền truy cập bị từ chối." });
            }

            var settings = await _db.Settings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new SystemSettings();
                _db.Settings.Add(settings);
            }

            if (body.TryGetProperty("countdownDeadline", out var cdProp) && cdProp.ValueKind == JsonValueKind.String)
            {
                settings.CountdownDeadline = cdProp.GetString()!;
            }

            if (body.TryGetProperty("operatingHours", out var ohProp))
            {
                settings.OperatingHoursJson = ohProp.GetRawText();
            }

            if (body.TryGetProperty("slaSettings", out var slaProp))
            {
                settings.SlaSettingsJson = slaProp.GetRawText();
            }

            await _db.SaveChangesAsync();

            _cache.Remove(SETTINGS_CACHE_KEY);

            object operatingHours = JsonSerializer.Deserialize<object>(settings.OperatingHoursJson)!;
            object slaSettings = JsonSerializer.Deserialize<object>(settings.SlaSettingsJson)!;

            return Ok(new
            {
                success = true,
                message = "Cập nhật cài đặt hệ thống thành công!",
                settings = new
                {
                    countdownDeadline = settings.CountdownDeadline,
                    operatingHours = operatingHours,
                    slaSettings = slaSettings
                }
            });
        }
    }
}
