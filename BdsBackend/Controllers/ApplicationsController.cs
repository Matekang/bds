using System;
using System.Collections.Generic;
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
    [Route("api/applications")]
    public class ApplicationsController : ControllerBase
    {
        private readonly BdsDbContext _db;
        private readonly string _uploadBaseDir;
        private const string SESSION_COOKIE_NAME = "session_token";

        public ApplicationsController(BdsDbContext db)
        {
            _db = db;
            _uploadBaseDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(_uploadBaseDir))
            {
                try { Directory.CreateDirectory(_uploadBaseDir); } catch { }
            }
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

        private static object FormatApp(Application a)
        {
            object? qrParsedData = null;
            if (!string.IsNullOrEmpty(a.QrParsedDataJson))
            {
                try { qrParsedData = JsonSerializer.Deserialize<object>(a.QrParsedDataJson); } catch { }
            }

            object? documents = null;
            if (!string.IsNullOrEmpty(a.DocumentsJson))
            {
                try { documents = JsonSerializer.Deserialize<object>(a.DocumentsJson); } catch { }
            }

            object? ekycData = null;
            if (!string.IsNullOrEmpty(a.EkycDataJson))
            {
                try { ekycData = JsonSerializer.Deserialize<object>(a.EkycDataJson); } catch { }
            }

            object? appointmentTicket = null;
            if (!string.IsNullOrEmpty(a.AppointmentTicketJson))
            {
                try { appointmentTicket = JsonSerializer.Deserialize<object>(a.AppointmentTicketJson); } catch { }
            }

            return new
            {
                id = a.Id,
                userId = a.UserId,
                maKH = a.MaKH,
                fullName = a.FullName,
                phoneNumber = a.PhoneNumber,
                email = a.Email,
                cccdNumber = a.CccdNumber,
                infoChannel = a.InfoChannel,
                needLoanConsult = a.NeedLoanConsult,
                targetObject = a.TargetObject,
                targetObjectDetail = a.TargetObjectDetail,
                unitType = a.UnitType,
                preferredFloor = a.PreferredFloor,
                status = a.Status,
                stage = a.Stage,
                progressPercent = a.ProgressPercent,
                notes = a.Notes,
                dob = a.Dob,
                gender = a.Gender,
                address = a.Address,
                issueDate = a.IssueDate,
                oldCmnd = a.OldCmnd,
                cccdImage = a.CccdImage,
                cccdFrontImage = a.CccdFrontImage,
                cccdBackImage = a.CccdBackImage,
                qrParsedData = qrParsedData,
                documents = documents,
                agreedTerms1 = a.AgreedTerms1,
                agreedTerms2 = a.AgreedTerms2,
                ekycStatus = a.EkycStatus,
                ekycData = ekycData,
                appointmentTicket = appointmentTicket,
                assignedOfficer = a.AssignedOfficer,
                shift = a.Shift,
                slaDeadline = a.SlaDeadline,
                hardCopyDeadline = a.HardCopyDeadline,
                maritalStatus = a.MaritalStatus,
                createdAt = a.CreatedAt,
                updatedAt = a.UpdatedAt
            };
        }

        private async Task<string> SaveFileAsync(IFormFile file, string prefix, string userId)
        {
            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrEmpty(ext)) ext = file.ContentType.Contains("image") ? ".jpg" : ".pdf";

            // Phân loại lưu file theo cây thư mục yyyy/MM/dd chống nghẽn hệ thống tệp đĩa khi lưu hàng vạn file
            var now = DateTime.UtcNow;
            var subFolder = Path.Combine(now.ToString("yyyy"), now.ToString("MM"), now.ToString("dd"));
            var targetDir = Path.Combine(_uploadBaseDir, subFolder);
            if (!Directory.Exists(targetDir))
            {
                Directory.CreateDirectory(targetDir);
            }

            var filename = $"{prefix}-{userId}-{Guid.NewGuid():N}{ext}";
            var filePath = Path.Combine(targetDir, filename);

            // Stream bất đồng bộ với buffer size 8192 không làm ngốn bộ nhớ RAM
            using (var stream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None, 8192, useAsync: true))
            {
                await file.CopyToAsync(stream);
            }

            var relativePath = $"/uploads/{subFolder.Replace('\\', '/')}/{filename}";
            return relativePath;
        }

        [HttpGet]
        public async Task<IActionResult> GetApplications()
        {
            var session = GetSessionUser();
            if (session == null)
            {
                return Unauthorized(new { success = false, message = "Chưa đăng nhập." });
            }

            List<Application> apps;
            bool isStaff = session.Value.Role == "admin" || session.Value.Role.StartsWith("officer_");

            if (isStaff)
            {
                apps = await _db.Applications.AsNoTracking().ToListAsync();
            }
            else
            {
                apps = await _db.Applications.AsNoTracking().Where(a => a.UserId == session.Value.UserId).ToListAsync();
            }

            var sortedApps = apps
                .OrderByDescending(a => DateTime.TryParse(a.CreatedAt, out var dt) ? dt : DateTime.MinValue)
                .ThenByDescending(a => a.Id)
                .Select(FormatApp)
                .ToList();

            return Ok(new { success = true, applications = sortedApps });
        }

        [HttpGet("public-approved")]
        public async Task<IActionResult> GetPublicApprovedApplications()
        {
            var apps = await _db.Applications
                .AsNoTracking()
                .Where(a => a.Status == "approved" || a.Status == "luu_tru" || a.Stage == 4)
                .OrderBy(a => a.Id)
                .ToListAsync();

            var result = apps.Select(FormatApp).ToList();
            return Ok(new { success = true, applications = result });
        }

        [HttpPost]
        [RequestSizeLimit(104_857_600)] // 100MB
        public async Task<IActionResult> SubmitApplication([FromForm] IFormCollection form)
        {
            var session = GetSessionUser();
            if (session == null)
            {
                return Unauthorized(new { success = false, message = "Chưa đăng nhập." });
            }

            string appId = form["appId"].ToString();
            bool resetApp = form["resetApp"].ToString().ToLower() == "true";
            string fullName = form["fullName"].ToString();
            if (string.IsNullOrEmpty(fullName)) fullName = session.Value.FullName;
            string email = form["email"].ToString();
            string cccdNumber = form["cccdNumber"].ToString();
            string targetObject = form["targetObject"].ToString();
            if (string.IsNullOrEmpty(targetObject)) targetObject = "K1";
            string targetObjectDetail = form["targetObjectDetail"].ToString();
            bool agreedTerms1 = form["agreedTerms1"].ToString().ToLower() == "true";
            bool agreedTerms2 = form["agreedTerms2"].ToString().ToLower() == "true";
            string ekycStatus = form["ekycStatus"].ToString();
            if (string.IsNullOrEmpty(ekycStatus)) ekycStatus = "unverified";
            string ekycDataRaw = form["ekycData"].ToString();
            string appointmentTicketRaw = form["appointmentTicket"].ToString();

            var existingApp = !string.IsNullOrEmpty(appId)
                ? await _db.Applications.FirstOrDefaultAsync(a => a.Id == appId && a.UserId == session.Value.UserId)
                : await _db.Applications.FirstOrDefaultAsync(a => a.UserId == session.Value.UserId);

            if (resetApp && existingApp != null)
            {
                existingApp.Status = "submitted";
                existingApp.Stage = 1;
                existingApp.TargetObject = targetObject;
                existingApp.TargetObjectDetail = targetObjectDetail;
                existingApp.Notes = "Người dân đã chọn lại nhóm đối tượng K và nộp lại hồ sơ.";
                existingApp.UpdatedAt = DateTime.UtcNow.ToString("o");
                await _db.SaveChangesAsync();
                return Ok(new { success = true, message = "Đã tạo lại hồ sơ thành công!", application = FormatApp(existingApp) });
            }

            Dictionary<string, object> docsDict = new Dictionary<string, object>();
            if (existingApp != null && !string.IsNullOrEmpty(existingApp.DocumentsJson))
            {
                try
                {
                    var parsed = JsonSerializer.Deserialize<Dictionary<string, object>>(existingApp.DocumentsJson);
                    if (parsed != null) docsDict = parsed;
                }
                catch { }
            }

            for (int i = 1; i <= 9; i++)
            {
                string key = $"doc{i}";
                if (!docsDict.ContainsKey(key)) docsDict[key] = null!;
            }

            string? cccdImage = existingApp?.CccdImage;
            string? cccdFrontImage = existingApp?.CccdFrontImage ?? cccdImage;
            string? cccdBackImage = existingApp?.CccdBackImage;

            var cccdFrontFile = form.Files["cccdFrontFile"] ?? form.Files["cccdFile"];
            if (cccdFrontFile != null && cccdFrontFile.Length > 0)
            {
                cccdFrontImage = await SaveFileAsync(cccdFrontFile, "cccd-front", session.Value.UserId);
                cccdImage = cccdFrontImage;
            }

            var cccdBackFile = form.Files["cccdBackFile"];
            if (cccdBackFile != null && cccdBackFile.Length > 0)
            {
                cccdBackImage = await SaveFileAsync(cccdBackFile, "cccd-back", session.Value.UserId);
            }

            string dob = form["dob"].ToString(); if (string.IsNullOrEmpty(dob)) dob = existingApp?.Dob ?? "";
            string gender = form["gender"].ToString(); if (string.IsNullOrEmpty(gender)) gender = existingApp?.Gender ?? "";
            string address = form["address"].ToString(); if (string.IsNullOrEmpty(address)) address = existingApp?.Address ?? "";
            string issueDate = form["issueDate"].ToString(); if (string.IsNullOrEmpty(issueDate)) issueDate = existingApp?.IssueDate ?? "";
            string oldCmnd = form["oldCmnd"].ToString(); if (string.IsNullOrEmpty(oldCmnd)) oldCmnd = existingApp?.OldCmnd ?? "";
            string qrDataRaw = form["qrParsedData"].ToString();
            string? qrParsedDataJson = !string.IsNullOrEmpty(qrDataRaw) ? qrDataRaw : existingApp?.QrParsedDataJson;

            for (int i = 1; i <= 9; i++)
            {
                string docKey = $"doc{i}";
                var file = form.Files[docKey];
                if (file != null && file.Length > 0)
                {
                    string fileUrl = await SaveFileAsync(file, docKey, session.Value.UserId);
                    docsDict[docKey] = new
                    {
                        name = file.FileName,
                        url = fileUrl,
                        uploadedAt = DateTime.UtcNow.ToString("o")
                    };
                }
            }

            string[] requiredKeys = { "doc1", "doc2", "doc3", "doc4", "doc5", "doc7" };
            int filledCount = (!string.IsNullOrEmpty(cccdNumber) || !string.IsNullOrEmpty(cccdImage)) ? 1 : 0;
            foreach (var k in requiredKeys)
            {
                if (docsDict.TryGetValue(k, out var val) && val != null) filledCount++;
            }
            int progressPercent = (int)Math.Round((filledCount / 7.0) * 100);

            string infoChannel = form["infoChannel"].ToString(); if (string.IsNullOrEmpty(infoChannel)) infoChannel = "social_media";
            string needLoanConsult = form["needLoanConsult"].ToString(); if (string.IsNullOrEmpty(needLoanConsult)) needLoanConsult = "yes";
            string maritalStatus = form["maritalStatus"].ToString(); if (string.IsNullOrEmpty(maritalStatus)) maritalStatus = "Độc thân/ Độc thân nuôi con";
            string unitType = form["unitType"].ToString(); if (string.IsNullOrEmpty(unitType)) unitType = "Căn 1 phòng ngủ";
            string preferredFloor = form["preferredFloor"].ToString(); if (string.IsNullOrEmpty(preferredFloor)) preferredFloor = "mid";

            if (existingApp != null)
            {
                existingApp.FullName = fullName;
                existingApp.Email = email;
                existingApp.CccdNumber = cccdNumber;
                existingApp.Dob = dob;
                existingApp.Gender = gender;
                existingApp.Address = address;
                existingApp.IssueDate = issueDate;
                existingApp.OldCmnd = oldCmnd;
                existingApp.InfoChannel = infoChannel;
                existingApp.NeedLoanConsult = needLoanConsult;
                existingApp.TargetObject = targetObject;
                existingApp.TargetObjectDetail = targetObjectDetail;
                existingApp.MaritalStatus = maritalStatus;
                existingApp.UnitType = unitType;
                existingApp.PreferredFloor = preferredFloor;
                existingApp.CccdImage = cccdImage;
                existingApp.CccdFrontImage = cccdFrontImage;
                existingApp.CccdBackImage = cccdBackImage;
                existingApp.QrParsedDataJson = qrParsedDataJson;
                existingApp.DocumentsJson = JsonSerializer.Serialize(docsDict);
                existingApp.AgreedTerms1 = agreedTerms1;
                existingApp.AgreedTerms2 = agreedTerms2;
                existingApp.ProgressPercent = progressPercent;
                if (ekycStatus != "unverified")
                {
                    existingApp.EkycStatus = ekycStatus;
                    if (!string.IsNullOrEmpty(ekycDataRaw)) existingApp.EkycDataJson = ekycDataRaw;
                }
                if (!string.IsNullOrEmpty(appointmentTicketRaw))
                {
                    existingApp.AppointmentTicketJson = appointmentTicketRaw;
                }
                if (existingApp.Status == "returned_for_supplement")
                {
                    existingApp.Status = "submitted";
                    existingApp.Notes = "";
                }
                else
                {
                    if (string.IsNullOrEmpty(existingApp.Status)) existingApp.Status = "submitted";
                }
                existingApp.UpdatedAt = DateTime.UtcNow.ToString("o");

                await _db.SaveChangesAsync();
                return Ok(new { success = true, message = "Cập nhật hồ sơ thành công!", application = FormatApp(existingApp) });
            }
            else
            {
                var now = DateTime.UtcNow;
                var sla30Deadline = now.AddDays(30).ToString("o");
                int maKHNumber = new Random().Next(1000, 9999);
                // Thuật toán Tự động Cân bằng tải (Least Workload & Round-Robin) cho 2 cán bộ thuộc Tổ 1 (GĐ 1)
                var stage1Officers = await _db.Users
                    .AsNoTracking()
                    .Where(u => u.Role == "officer_intake")
                    .Select(u => u.FullName)
                    .ToListAsync();

                string selectedOfficer = "Nguyễn Văn Tùng (Tổ 1)";
                if (stage1Officers.Count > 0)
                {
                    // Đếm số hồ sơ đang thụ lý của từng cán bộ trong Tổ 1
                    var workloadMap = await _db.Applications
                        .AsNoTracking()
                        .Where(a => a.Stage == 1 && stage1Officers.Contains(a.AssignedOfficer))
                        .GroupBy(a => a.AssignedOfficer)
                        .Select(g => new { Officer = g.Key, Count = g.Count() })
                        .ToDictionaryAsync(x => x.Officer, x => x.Count);

                    // Chọn cán bộ có ít hồ sơ đang xử lý nhất
                    selectedOfficer = stage1Officers
                        .OrderBy(off => workloadMap.ContainsKey(off) ? workloadMap[off] : 0)
                        .First();
                }

                var newApp = new Application
                {
                    Id = "HS-2026-" + maKHNumber,
                    UserId = session.Value.UserId,
                    MaKH = $"KH-{maKHNumber}",
                    FullName = fullName,
                    PhoneNumber = session.Value.PhoneNumber,
                    Email = email,
                    CccdNumber = cccdNumber,
                    InfoChannel = infoChannel,
                    NeedLoanConsult = needLoanConsult,
                    TargetObject = targetObject,
                    TargetObjectDetail = targetObjectDetail,
                    UnitType = unitType,
                    PreferredFloor = preferredFloor,
                    Status = "submitted",
                    Stage = 1,
                    ProgressPercent = progressPercent,
                    Notes = "",
                    Dob = dob,
                    Gender = gender,
                    Address = address,
                    IssueDate = issueDate,
                    OldCmnd = oldCmnd,
                    CccdFrontImage = cccdFrontImage,
                    CccdBackImage = cccdBackImage,
                    QrParsedDataJson = qrParsedDataJson,
                    CccdImage = cccdImage,
                    DocumentsJson = JsonSerializer.Serialize(docsDict),
                    AgreedTerms1 = agreedTerms1,
                    AgreedTerms2 = agreedTerms2,
                    EkycStatus = ekycStatus,
                    EkycDataJson = !string.IsNullOrEmpty(ekycDataRaw) ? ekycDataRaw : null,
                    AppointmentTicketJson = !string.IsNullOrEmpty(appointmentTicketRaw) ? appointmentTicketRaw : null,
                    AssignedOfficer = selectedOfficer,
                    Shift = "morning",
                    SlaDeadline = sla30Deadline,
                    CreatedAt = now.ToString("o"),
                    UpdatedAt = now.ToString("o")
                };

                _db.Applications.Add(newApp);
                await _db.SaveChangesAsync();

                return Ok(new { success = true, message = "Nộp hồ sơ thành công!", application = FormatApp(newApp) });
            }
        }

        [HttpPatch("{id}")]
        public async Task<IActionResult> UpdateApplicationStatus(string id, [FromBody] JsonElement body)
        {
            var session = GetSessionUser();
            bool isStaff = session != null && (session.Value.Role == "admin" || session.Value.Role.StartsWith("officer_"));
            if (session == null || !isStaff)
            {
                return StatusCode(403, new { success = false, message = "Quyền truy cập bị từ chối." });
            }

            if (string.IsNullOrEmpty(id))
            {
                return Ok(new { success = false, message = "Thiếu thông tin mã hồ sơ." });
            }

            var app = await _db.Applications.FirstOrDefaultAsync(a => a.Id == id);
            if (app == null)
            {
                return Ok(new { success = false, message = "Không tìm thấy hồ sơ." });
            }

            string role = session.Value.Role;
            if (role == "officer_intake" && app.Stage != 1)
            {
                return StatusCode(403, new { success = false, message = "Tổ tiếp nhận chỉ có quyền xử lý các hồ sơ ở Giai đoạn 1 (Tổ tiếp nhận)." });
            }
            if (role == "officer_control" && app.Stage != 2)
            {
                return StatusCode(403, new { success = false, message = "Tổ kiểm soát chỉ có quyền xử lý các hồ sơ ở Giai đoạn 2 (Tổ kiểm soát)." });
            }
            if (role == "officer_hardcopy" && app.Stage != 3)
            {
                return StatusCode(403, new { success = false, message = "Bộ phận tiếp nhận bản gốc chỉ có quyền xử lý các hồ sơ ở Giai đoạn 3 (Nộp bản gốc)." });
            }
            if (role == "officer_archive" && app.Stage != 4)
            {
                return StatusCode(403, new { success = false, message = "Bộ phận lưu trữ chỉ có quyền thao tác với các hồ sơ ở Giai đoạn 4 (Lưu trữ)." });
            }

            string? status = body.TryGetProperty("status", out var stProp) ? stProp.GetString() : null;
            string? notes = body.TryGetProperty("notes", out var nProp) ? nProp.GetString() : null;
            int? stage = body.TryGetProperty("stage", out var sgProp) && sgProp.ValueKind == JsonValueKind.Number ? sgProp.GetInt32() : null;
            string? action = body.TryGetProperty("action", out var actProp) ? actProp.GetString() : null;
            string? assignedOfficer = body.TryGetProperty("assignedOfficer", out var aoProp) ? aoProp.GetString() : null;
            string? shift = body.TryGetProperty("shift", out var sProp) ? sProp.GetString() : null;
            int hardCopyDays = body.TryGetProperty("hardCopyDays", out var hcProp) && hcProp.ValueKind == JsonValueKind.Number ? hcProp.GetInt32() : 5;

            if (action == "bypass_intake")
            {
                app.Status = "to_kiem_soat";
                app.Stage = 2;
                app.Notes = notes ?? "⚡ Hồ sơ hoàn chỉnh chuẩn hóa, đã Bypass Tổ Tiếp Nhận và chuyển thẳng lên Tổ Kiểm Soát.";
            }
            else if (action == "reject_wrong_k")
            {
                app.Status = "rejected_wrong_k";
                app.Stage = 1;
                app.Notes = notes ?? "❌ Hồ sơ bị từ chối do chọn sai nhóm đối tượng K. Yêu cầu người dân nộp lại từ đầu.";
            }
            else if (action == "return_to_citizen")
            {
                app.Status = "returned_for_supplement";
                app.Notes = notes ?? "🟠 Hồ sơ chưa đủ điều kiện, được trả về cho người dân để bổ sung/sửa đổi.";
            }
            else if (action == "approve_digital")
            {
                app.Status = "bo_sung_ban_goc";
                app.Stage = 3;
                app.HardCopyDeadline = DateTime.UtcNow.AddDays(hardCopyDays).ToString("o");
                app.Notes = notes ?? $"✅ Hồ sơ đã được duyệt bản số. Người dân có {hardCopyDays} ngày để mang hồ sơ gốc đến làm việc.";
            }
            else if (action == "archive")
            {
                app.Status = "luu_tru";
                app.Stage = 4;
                app.Notes = notes ?? "🟢 Hồ sơ gốc đã đối chứng thành công và được đưa vào Lưu Trữ.";
            }
            else
            {
                if (!string.IsNullOrEmpty(status)) app.Status = status;
                if (stage.HasValue) app.Stage = stage.Value;
                if (notes != null) app.Notes = notes;
            }

            if (!string.IsNullOrEmpty(assignedOfficer)) app.AssignedOfficer = assignedOfficer;
            if (!string.IsNullOrEmpty(shift)) app.Shift = shift;
            app.UpdatedAt = DateTime.UtcNow.ToString("o");

            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Cập nhật hồ sơ thành công!", application = FormatApp(app) });
        }

        [HttpPatch("batch")]
        public async Task<IActionResult> BatchUpdateApplications([FromBody] JsonElement body)
        {
            var session = GetSessionUser();
            bool isStaff = session != null && (session.Value.Role == "admin" || session.Value.Role.StartsWith("officer_"));
            if (session == null || !isStaff)
            {
                return StatusCode(403, new { success = false, message = "Quyền truy cập bị từ chối." });
            }

            if (!body.TryGetProperty("ids", out var idsProp) || idsProp.ValueKind != JsonValueKind.Array)
            {
                return BadRequest(new { success = false, message = "Thiếu danh sách IDs hồ sơ." });
            }

            var ids = new List<string>();
            foreach (var idEl in idsProp.EnumerateArray())
            {
                var idStr = idEl.GetString();
                if (!string.IsNullOrEmpty(idStr)) ids.Add(idStr);
            }

            if (ids.Count == 0)
            {
                return BadRequest(new { success = false, message = "Danh sách hồ sơ trống." });
            }

            string? action = body.TryGetProperty("action", out var actProp) ? actProp.GetString() : null;
            string? notes = body.TryGetProperty("notes", out var nProp) ? nProp.GetString() : null;
            string? assignedOfficer = body.TryGetProperty("assignedOfficer", out var aoProp) ? aoProp.GetString() : null;
            string? shift = body.TryGetProperty("shift", out var sProp) ? sProp.GetString() : null;
            int hardCopyDays = body.TryGetProperty("hardCopyDays", out var hcProp) && hcProp.ValueKind == JsonValueKind.Number ? hcProp.GetInt32() : 5;

            var apps = await _db.Applications.Where(a => ids.Contains(a.Id)).ToListAsync();
            int processedCount = 0;

            foreach (var app in apps)
            {
                if (action == "bypass_intake")
                {
                    app.Status = "to_kiem_soat";
                    app.Stage = 2;
                    app.Notes = notes ?? "⚡ Batch: Bypass Tổ Tiếp Nhận → Tổ Kiểm Soát.";
                }
                else if (action == "reject_wrong_k")
                {
                    app.Status = "rejected_wrong_k";
                    app.Stage = 1;
                    app.Notes = notes ?? "❌ Batch: Từ chối do chọn sai nhóm K.";
                }
                else if (action == "return_to_citizen")
                {
                    app.Status = "returned_for_supplement";
                    app.Notes = notes ?? "🟠 Batch: Trả về cho người dân bổ sung.";
                }
                else if (action == "approve_digital")
                {
                    app.Status = "bo_sung_ban_goc";
                    app.Stage = 3;
                    app.HardCopyDeadline = DateTime.UtcNow.AddDays(hardCopyDays).ToString("o");
                    app.Notes = notes ?? $"✅ Batch: Duyệt bản số. Hạn nộp bản gốc {hardCopyDays} ngày.";
                }
                else if (action == "archive")
                {
                    app.Status = "luu_tru";
                    app.Stage = 4;
                    app.Notes = notes ?? "🟢 Batch: Đưa vào Lưu Trữ.";
                }

                if (!string.IsNullOrEmpty(assignedOfficer)) app.AssignedOfficer = assignedOfficer;
                if (!string.IsNullOrEmpty(shift)) app.Shift = shift;
                app.UpdatedAt = DateTime.UtcNow.ToString("o");
                processedCount++;
            }

            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = $"Đã xử lý thành công {processedCount}/{ids.Count} hồ sơ.", processedCount });
        }
    }
}
