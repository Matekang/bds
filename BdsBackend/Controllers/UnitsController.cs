using System;
using System.Collections.Generic;
using System.Linq;
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
    [Route("api/units")]
    public class UnitsController : ControllerBase
    {
        private readonly BdsDbContext _db;
        private readonly IMemoryCache _cache;
        private const string SESSION_COOKIE_NAME = "session_token";
        private const string ALL_UNITS_CACHE_KEY = "bds_all_units_cache";

        public UnitsController(BdsDbContext db, IMemoryCache cache)
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
        public async Task<IActionResult> GetUnits([FromQuery] int? floor)
        {
            try
            {
                if (!_cache.TryGetValue(ALL_UNITS_CACHE_KEY, out List<Unit>? units) || units == null)
                {
                    if (!await _db.Units.AnyAsync())
                    {
                        DbSeeder.GenerateDefaultUnits(_db);
                        await _db.SaveChangesAsync();
                    }

                    units = await _db.Units.AsNoTracking().ToListAsync();
                    _cache.Set(ALL_UNITS_CACHE_KEY, units, TimeSpan.FromSeconds(30));
                }

                if (floor.HasValue)
                {
                    var filtered = units.Where(u => u.Floor == floor.Value).ToList();
                    return Ok(new { success = true, units = filtered });
                }

                return Ok(new { success = true, units });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = $"Lỗi tải danh sách căn hộ: {ex.Message}" });
            }
        }

        // Toggle giữ chỗ căn hộ
        [HttpPost]
        public async Task<IActionResult> ToggleReservation([FromBody] JsonElement body)
        {
            var session = GetSessionUser();
            if (session == null)
            {
                return Ok(new { success = false, message = "Vui lòng đăng nhập để thực hiện đặt chỗ." });
            }

            string? unitId = body.TryGetProperty("unitId", out var uProp) ? uProp.GetString() : null;
            if (string.IsNullOrEmpty(unitId))
            {
                return Ok(new { success = false, message = "Thiếu thông tin mã căn hộ." });
            }

            var unit = await _db.Units.FirstOrDefaultAsync(u => u.Id == unitId);
            if (unit == null)
            {
                return Ok(new { success = false, message = "Không tìm thấy căn hộ này." });
            }

            if (unit.Status == "sold")
            {
                return Ok(new { success = false, message = "Căn hộ này đã bán, không thể đặt giữ chỗ." });
            }

            if (unit.Status == "reserved")
            {
                if (unit.ReservedByUserId != session.Value.UserId && session.Value.Role != "admin")
                {
                    return Ok(new { success = false, message = "Căn hộ này đang được đặt chỗ bởi khách hàng khác." });
                }

                unit.Status = "available";
                unit.ReservedByUserId = null;
                unit.ReservedAt = null;
            }
            else
            {
                unit.Status = "reserved";
                unit.ReservedByUserId = session.Value.UserId;
                unit.ReservedAt = DateTime.UtcNow.ToString("o");
            }

            await _db.SaveChangesAsync();

            // Clear cache để người dùng khác thấy trạng thái mới nhất ngay lập tức
            _cache.Remove(ALL_UNITS_CACHE_KEY);

            return Ok(new { success = true, message = "Cập nhật trạng thái căn hộ thành công.", unit });
        }

        // Admin / Officer cập nhật trạng thái bán trực tiếp
        [HttpPut]
        public async Task<IActionResult> UpdateUnitStatus([FromBody] JsonElement body)
        {
            var session = GetSessionUser();
            bool canManageUnits = session != null && (session.Value.Role == "admin" || session.Value.Role == "officer_archive");
            if (!canManageUnits)
            {
                return StatusCode(403, new { success = false, message = "Chỉ Super Admin và Bộ phận lưu trữ mới có quyền quản lý bảng hàng căn hộ." });
            }

            string? unitId = body.TryGetProperty("unitId", out var uProp) ? uProp.GetString() : null;
            string? status = body.TryGetProperty("status", out var sProp) ? sProp.GetString() : null;

            if (string.IsNullOrEmpty(unitId) || string.IsNullOrEmpty(status))
            {
                return Ok(new { success = false, message = "Thiếu thông tin cập nhật căn hộ." });
            }

            var unit = await _db.Units.FirstOrDefaultAsync(u => u.Id == unitId);
            if (unit == null)
            {
                return Ok(new { success = false, message = "Không tìm thấy căn hộ." });
            }

            unit.Status = status;

            var sessionVal = session!.Value;
            if (status == "available" || status == "sold")
            {
                unit.ReservedByUserId = null;
                unit.ReservedAt = null;
            }
            else if (status == "reserved" && string.IsNullOrEmpty(unit.ReservedByUserId))
            {
                unit.ReservedByUserId = sessionVal.UserId;
                unit.ReservedAt = DateTime.UtcNow.ToString("o");
            }

            await _db.SaveChangesAsync();

            // Clear cache
            _cache.Remove(ALL_UNITS_CACHE_KEY);

            return Ok(new { success = true, message = "Cập nhật trạng thái căn hộ thành công!", unit });
        }

        // Admin / Officer thêm căn hộ mới
        [HttpPost("create")]
        public async Task<IActionResult> CreateUnit([FromBody] JsonElement body)
        {
            var session = GetSessionUser();
            bool canManageUnits = session != null && (session.Value.Role == "admin" || session.Value.Role == "officer_archive");
            if (!canManageUnits)
            {
                return StatusCode(403, new { success = false, message = "Chỉ Super Admin và Bộ phận lưu trữ mới có quyền quản lý bảng hàng căn hộ." });
            }

            string roomNumber = body.TryGetProperty("roomNumber", out var rProp) ? rProp.GetString() ?? "" : "";
            int floor = body.TryGetProperty("floor", out var fProp) ? fProp.GetInt32() : 1;
            string type = body.TryGetProperty("type", out var tProp) ? tProp.GetString() ?? "2PN" : "2PN";
            double area = body.TryGetProperty("area", out var aProp) ? aProp.GetDouble() : 65.0;
            string tower = body.TryGetProperty("tower", out var twProp) ? twProp.GetString() ?? "B" : "B";

            if (string.IsNullOrWhiteSpace(roomNumber))
            {
                return Ok(new { success = false, message = "Vui lòng nhập mã/số phòng." });
            }

            var existing = await _db.Units.FirstOrDefaultAsync(u => u.RoomNumber == roomNumber || u.Id == roomNumber);
            if (existing != null)
            {
                return Ok(new { success = false, message = $"Phòng {roomNumber} đã tồn tại trong hệ thống!" });
            }

            var newUnit = new Unit
            {
                Id = roomNumber,
                Tower = tower,
                Floor = floor,
                RoomNumber = roomNumber,
                Area = area,
                Type = type,
                Status = "available"
            };

            _db.Units.Add(newUnit);
            await _db.SaveChangesAsync();

            _cache.Remove(ALL_UNITS_CACHE_KEY);

            return Ok(new { success = true, message = $"Thêm căn hộ {roomNumber} (Tầng {floor}) thành công!", unit = newUnit });
        }

        // Admin / Officer tạo HÀNG LOẠT TẦNG VÀ PHÒNG THEO MẪU (Batch Floor Generation)
        [HttpPost("batch-floors")]
        public async Task<IActionResult> BatchCreateFloors([FromBody] JsonElement body)
        {
            var session = GetSessionUser();
            bool canManageUnits = session != null && (session.Value.Role == "admin" || session.Value.Role == "officer_archive");
            if (!canManageUnits)
            {
                return StatusCode(403, new { success = false, message = "Chỉ Super Admin mới có quyền tạo đợt tầng/phòng hàng loạt." });
            }

            // Target floors range (e.g. fromFloor: 6, toFloor: 15)
            int fromFloor = body.TryGetProperty("fromFloor", out var ffProp) ? ffProp.GetInt32() : 1;
            int toFloor = body.TryGetProperty("toFloor", out var tfProp) ? tfProp.GetInt32() : fromFloor;
            string tower = body.TryGetProperty("tower", out var twProp) ? twProp.GetString() ?? "B" : "B";

            // Rooms template array e.g. [{ roomIndex: 1, type: "Studio", area: 35.2 }, { roomIndex: 2, type: "2PN", area: 65.5 }]
            if (!body.TryGetProperty("roomsTemplate", out var roomsElem) || roomsElem.ValueKind != JsonValueKind.Array)
            {
                return Ok(new { success = false, message = "Thiếu danh sách cấu hình mẫu phòng." });
            }

            int totalCreated = 0;
            var existingIds = await _db.Units.Select(u => u.Id).ToHashSetAsync();

            for (int f = Math.Min(fromFloor, toFloor); f <= Math.Max(fromFloor, toFloor); f++)
            {
                foreach (var rItem in roomsElem.EnumerateArray())
                {
                    string roomCode = rItem.TryGetProperty("roomCode", out var rcProp) ? rcProp.GetString() ?? "" : "";
                    int roomIdx = rItem.TryGetProperty("roomIndex", out var riProp) ? riProp.GetInt32() : 1;
                    string type = rItem.TryGetProperty("type", out var tProp) ? tProp.GetString() ?? "2PN" : "2PN";
                    double area = rItem.TryGetProperty("area", out var aProp) ? aProp.GetDouble() : 65.0;

                    // Generate standard room number e.g. B-0601, B-1205 or custom code
                    string roomNumber = string.IsNullOrWhiteSpace(roomCode) 
                        ? $"{tower}-{f:D2}{roomIdx:D2}" 
                        : roomCode.Replace("{floor}", f.ToString("D2"));

                    if (!existingIds.Contains(roomNumber))
                    {
                        _db.Units.Add(new Unit
                        {
                            Id = roomNumber,
                            Tower = tower,
                            Floor = f,
                            RoomNumber = roomNumber,
                            Area = area,
                            Type = type,
                            Status = "available"
                        });
                        existingIds.Add(roomNumber);
                        totalCreated++;
                    }
                }
            }

            await _db.SaveChangesAsync();
            _cache.Remove(ALL_UNITS_CACHE_KEY);

            return Ok(new { success = true, message = $"Đã khởi tạo thành công {totalCreated} phòng mới cho từ Tầng {fromFloor} đến Tầng {toFloor}!", totalCreated });
        }

        // Admin / Officer sửa chi tiết căn hộ
        [HttpPut("detail")]
        public async Task<IActionResult> UpdateUnitDetail([FromBody] JsonElement body)
        {
            var session = GetSessionUser();
            bool canManageUnits = session != null && (session.Value.Role == "admin" || session.Value.Role == "officer_archive");
            if (!canManageUnits)
            {
                return StatusCode(403, new { success = false, message = "Chỉ Super Admin và Bộ phận lưu trữ mới có quyền quản lý bảng hàng." });
            }

            string unitId = body.TryGetProperty("unitId", out var uProp) ? uProp.GetString() ?? "" : "";
            if (string.IsNullOrEmpty(unitId)) return Ok(new { success = false, message = "Thiếu ID căn hộ." });

            var unit = await _db.Units.FirstOrDefaultAsync(u => u.Id == unitId);
            if (unit == null) return Ok(new { success = false, message = "Không tìm thấy căn hộ." });

            if (body.TryGetProperty("floor", out var fProp)) unit.Floor = fProp.GetInt32();
            if (body.TryGetProperty("type", out var tProp) && tProp.GetString() != null) unit.Type = tProp.GetString()!;
            if (body.TryGetProperty("area", out var aProp)) unit.Area = aProp.GetDouble();
            if (body.TryGetProperty("status", out var sProp) && sProp.GetString() != null) unit.Status = sProp.GetString()!;

            await _db.SaveChangesAsync();
            _cache.Remove(ALL_UNITS_CACHE_KEY);

            return Ok(new { success = true, message = $"Cập nhật thông tin căn {unit.RoomNumber} thành công!", unit });
        }

        // Admin / Officer xóa căn hộ
        [HttpDelete("{unitId}")]
        public async Task<IActionResult> DeleteUnit(string unitId)
        {
            var session = GetSessionUser();
            bool canManageUnits = session != null && (session.Value.Role == "admin" || session.Value.Role == "officer_archive");
            if (!canManageUnits)
            {
                return StatusCode(403, new { success = false, message = "Chỉ Super Admin mới có quyền xóa căn hộ." });
            }

            var unit = await _db.Units.FirstOrDefaultAsync(u => u.Id == unitId);
            if (unit == null) return Ok(new { success = false, message = "Không tìm thấy căn hộ." });

            _db.Units.Remove(unit);
            await _db.SaveChangesAsync();
            _cache.Remove(ALL_UNITS_CACHE_KEY);

            return Ok(new { success = true, message = $"Đã xóa căn hộ {unit.RoomNumber} thành công!" });
        }

        // Admin / Officer xóa TOÀN BỘ PHÒNG CỦA 1 TẦNG (Xóa Tầng)
        [HttpDelete("floor/{floorNumber}")]
        public async Task<IActionResult> DeleteFloor(int floorNumber)
        {
            var session = GetSessionUser();
            bool canManageUnits = session != null && (session.Value.Role == "admin" || session.Value.Role == "officer_archive");
            if (!canManageUnits)
            {
                return StatusCode(403, new { success = false, message = "Chỉ Super Admin mới có quyền xóa toàn bộ tầng." });
            }

            var floorUnits = await _db.Units.Where(u => u.Floor == floorNumber).ToListAsync();
            if (!floorUnits.Any())
            {
                return Ok(new { success = false, message = $"Không tìm thấy phòng nào ở Tầng {floorNumber} để xóa." });
            }

            _db.Units.RemoveRange(floorUnits);
            await _db.SaveChangesAsync();
            _cache.Remove(ALL_UNITS_CACHE_KEY);

            return Ok(new { success = true, message = $"Đã xóa thành công toàn bộ {floorUnits.Count} phòng tại Tầng {floorNumber}!", deletedCount = floorUnits.Count });
        }
    }
}
