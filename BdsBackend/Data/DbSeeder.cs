using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BdsBackend.Models;
using Microsoft.EntityFrameworkCore;

namespace BdsBackend.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(BdsDbContext dbContext)
        {
            await dbContext.Database.EnsureCreatedAsync();

            // Ensure default officers exist for 2 officers per stage
            var requiredOfficers = new[]
            {
                new User { Id = "officer-intake-1", FullName = "Nguyễn Văn Tùng (Tổ 1)", PhoneNumber = "0911111111", Email = "tung.nv@hapro.vn", PasswordHash = "intake123", Password = "123456", Role = "officer_intake", CreatedAt = DateTime.UtcNow },
                new User { Id = "officer-intake-2", FullName = "Hoàng Thị Cúc (Tổ 1)", PhoneNumber = "0911111112", Email = "cuc.ht@hapro.vn", PasswordHash = "intake123", Password = "123456", Role = "officer_intake", CreatedAt = DateTime.UtcNow },
                new User { Id = "officer-control-1", FullName = "Lê Hoàng Nam (Tổ 2)", PhoneNumber = "0922222222", Email = "nam.lh@hapro.vn", PasswordHash = "control123", Password = "123456", Role = "officer_control", CreatedAt = DateTime.UtcNow },
                new User { Id = "officer-control-2", FullName = "Đặng Minh Đức (Tổ 2)", PhoneNumber = "0922222223", Email = "duc.dm@hapro.vn", PasswordHash = "control123", Password = "123456", Role = "officer_control", CreatedAt = DateTime.UtcNow },
                new User { Id = "officer-hardcopy-1", FullName = "Trần Thị Mai (Tổ 3)", PhoneNumber = "0933333333", Email = "mai.tt@hapro.vn", PasswordHash = "hardcopy123", Password = "123456", Role = "officer_hardcopy", CreatedAt = DateTime.UtcNow },
                new User { Id = "officer-hardcopy-2", FullName = "Vũ Anh Tuấn (Tổ 3)", PhoneNumber = "0933333334", Email = "tuan.va@hapro.vn", PasswordHash = "hardcopy123", Password = "123456", Role = "officer_hardcopy", CreatedAt = DateTime.UtcNow },
                new User { Id = "officer-archive-1", FullName = "Phạm Quốc Bảo (Tổ 4)", PhoneNumber = "0944444444", Email = "bao.pq@hapro.vn", PasswordHash = "archive123", Password = "123456", Role = "officer_archive", CreatedAt = DateTime.UtcNow },
                new User { Id = "officer-archive-2", FullName = "Ngô Bích Ngọc (Tổ 4)", PhoneNumber = "0944444445", Email = "ngoc.nb@hapro.vn", PasswordHash = "archive123", Password = "123456", Role = "officer_archive", CreatedAt = DateTime.UtcNow }
            };

            foreach (var off in requiredOfficers)
            {
                if (!await dbContext.Users.AnyAsync(u => u.PhoneNumber == off.PhoneNumber))
                {
                    dbContext.Users.Add(off);
                }
            }
            await dbContext.SaveChangesAsync();

            // Seed Units if empty
            if (!await dbContext.Units.AnyAsync())
            {
                GenerateDefaultUnits(dbContext);
                await dbContext.SaveChangesAsync();
            }

            // Seed Applications if empty
            if (!await dbContext.Applications.AnyAsync())
            {
                var now = DateTime.UtcNow.ToString("o");
                dbContext.Applications.AddRange(
                    new Application
                    {
                        Id = "app-demo-001",
                        UserId = "user-id",
                        MaKH = "KH-1001",
                        FullName = "Đào Minh Hoàn",
                        PhoneNumber = "0901234567",
                        Email = "hoan.dao@seabank.com.vn",
                        CccdNumber = "001095012345",
                        InfoChannel = "social_media",
                        NeedLoanConsult = "yes",
                        TargetObject = "K1",
                        TargetObjectDetail = "Người có công với cách mạng",
                        UnitType = "Căn 2 phòng ngủ",
                        PreferredFloor = "mid",
                        Status = "submitted",
                        Stage = 1,
                        ProgressPercent = 25,
                        Notes = "",
                        Dob = "15/08/1990",
                        Gender = "Nam",
                        Address = "Số 12 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội",
                        IssueDate = "20/05/2021",
                        AgreedTerms1 = true,
                        AgreedTerms2 = true,
                        EkycStatus = "verified",
                        AssignedOfficer = "Nguyễn Văn Tùng (Tổ tiếp nhận)",
                        Shift = "morning",
                        MaritalStatus = "Đã kết hôn",
                        CreatedAt = now,
                        UpdatedAt = now
                    },
                    new Application
                    {
                        Id = "app-demo-002",
                        UserId = "user-id-2",
                        MaKH = "KH-1002",
                        FullName = "Trần Thị Thu Hà",
                        PhoneNumber = "0912345678",
                        Email = "thu.ha@gmail.com",
                        CccdNumber = "001192098765",
                        InfoChannel = "referral",
                        NeedLoanConsult = "yes",
                        TargetObject = "K5",
                        TargetObjectDetail = "Người thu nhập thấp tại khu vực đô thị",
                        UnitType = "Căn 1 phòng ngủ",
                        PreferredFloor = "high",
                        Status = "to_kiem_soat",
                        Stage = 2,
                        ProgressPercent = 50,
                        Notes = "",
                        Dob = "10/12/1992",
                        Gender = "Nữ",
                        Address = "Phường Bãi Cháy, TP. Hạ Long, Quảng Ninh",
                        IssueDate = "15/01/2022",
                        AgreedTerms1 = true,
                        AgreedTerms2 = true,
                        EkycStatus = "verified",
                        AssignedOfficer = "Lê Hoàng Nam (Tổ kiểm soát)",
                        Shift = "afternoon",
                        MaritalStatus = "Độc thân/ Độc thân nuôi con",
                        CreatedAt = now,
                        UpdatedAt = now
                    },
                    new Application
                    {
                        Id = "app-demo-003",
                        UserId = "user-id-3",
                        MaKH = "KH-1003",
                        FullName = "Nguyễn Hoàng Anh",
                        PhoneNumber = "0923456789",
                        Email = "hoanganh.nguyen@yahoo.com",
                        CccdNumber = "033096054321",
                        InfoChannel = "press_media",
                        NeedLoanConsult = "no",
                        TargetObject = "K6",
                        TargetObjectDetail = "Công nhân làm việc tại KCN Cái Lân",
                        UnitType = "Căn studio",
                        PreferredFloor = "low",
                        Status = "bo_sung_ban_goc",
                        Stage = 3,
                        ProgressPercent = 75,
                        Notes = "",
                        Dob = "05/04/1996",
                        Gender = "Nam",
                        Address = "Phường Hồng Hải, TP. Hạ Long, Quảng Ninh",
                        IssueDate = "10/10/2020",
                        AgreedTerms1 = true,
                        AgreedTerms2 = true,
                        EkycStatus = "verified",
                        AssignedOfficer = "Trần Thị Mai (Tiếp nhận bản gốc)",
                        Shift = "morning",
                        MaritalStatus = "Độc thân/ Độc thân nuôi con",
                        CreatedAt = now,
                        UpdatedAt = now
                    },
                    new Application
                    {
                        Id = "app-demo-004",
                        UserId = "user-id-4",
                        MaKH = "KH-1004",
                        FullName = "Phạm Đức Huy",
                        PhoneNumber = "0934567890",
                        Email = "duchuy.pham@gov.vn",
                        CccdNumber = "022088011223",
                        InfoChannel = "bim_event",
                        NeedLoanConsult = "no",
                        TargetObject = "K8",
                        TargetObjectDetail = "Cán bộ công chức Sở Xây Dựng",
                        UnitType = "Căn 3 phòng ngủ",
                        PreferredFloor = "high",
                        Status = "approved",
                        Stage = 4,
                        ProgressPercent = 100,
                        Notes = "Hồ sơ đầy đủ, đủ điều kiện tham gia bốc thăm đợt 1",
                        Dob = "22/09/1988",
                        Gender = "Nam",
                        Address = "Phường Hòn Gai, TP. Hạ Long, Quảng Ninh",
                        IssueDate = "05/03/2019",
                        AgreedTerms1 = true,
                        AgreedTerms2 = true,
                        EkycStatus = "verified",
                        AssignedOfficer = "Phạm Quốc Bảo (Bộ phận lưu trữ)",
                        Shift = "morning",
                        MaritalStatus = "Đã kết hôn",
                        CreatedAt = now,
                        UpdatedAt = now
                    },
                    new Application
                    {
                        Id = "app-demo-005",
                        UserId = "user-id-5",
                        MaKH = "KH-1005",
                        FullName = "Vũ Minh Tuấn",
                        PhoneNumber = "0945678901",
                        Email = "minhtuan.vu@gmail.com",
                        CccdNumber = "014093077889",
                        InfoChannel = "agency",
                        NeedLoanConsult = "yes",
                        TargetObject = "K4",
                        TargetObjectDetail = "Hộ cận nghèo khu vực đô thị",
                        UnitType = "Căn 1 phòng ngủ",
                        PreferredFloor = "mid",
                        Status = "returned_for_supplement",
                        Stage = 1,
                        ProgressPercent = 30,
                        Notes = "Vui lòng bổ sung Xác nhận thu nhập Mẫu 03 có dấu đỏ của cơ quan công tác.",
                        Dob = "18/11/1993",
                        Gender = "Nam",
                        Address = "Phường Hà Lầm, TP. Hạ Long, Quảng Ninh",
                        IssueDate = "12/07/2021",
                        AgreedTerms1 = true,
                        AgreedTerms2 = true,
                        EkycStatus = "unverified",
                        AssignedOfficer = "Nguyễn Văn Tùng (Tổ tiếp nhận)",
                        Shift = "afternoon",
                        MaritalStatus = "Đã kết hôn",
                        CreatedAt = now,
                        UpdatedAt = now
                    },
                    new Application
                    {
                        Id = "app-demo-006",
                        UserId = "user-id-6",
                        MaKH = "KH-1006",
                        FullName = "Lê Thị Hồng",
                        PhoneNumber = "0956789012",
                        Email = "hong.le@police.gov.vn",
                        CccdNumber = "019195033445",
                        InfoChannel = "other",
                        NeedLoanConsult = "no",
                        TargetObject = "K7",
                        TargetObjectDetail = "Sĩ quan công an nhân dân",
                        UnitType = "Căn 2 phòng ngủ",
                        PreferredFloor = "mid",
                        Status = "rejected_wrong_k",
                        Stage = 1,
                        ProgressPercent = 15,
                        Notes = "Hồ sơ không đúng đối tượng K7 do thiếu Giấy xác nhận thuộc lực lượng vũ trang nhân dân.",
                        Dob = "02/02/1995",
                        Gender = "Nữ",
                        Address = "Phường Giếng Đáy, TP. Hạ Long, Quảng Ninh",
                        IssueDate = "25/08/2022",
                        AgreedTerms1 = true,
                        AgreedTerms2 = true,
                        EkycStatus = "verified",
                        AssignedOfficer = "Nguyễn Văn Tùng (Tổ tiếp nhận)",
                        Shift = "morning",
                        MaritalStatus = "Độc thân/ Độc thân nuôi con",
                        CreatedAt = now,
                        UpdatedAt = now
                    }
                );
                await dbContext.SaveChangesAsync();
            }

            // Seed Settings if empty
            if (!await dbContext.Settings.AnyAsync())
            {
                dbContext.Settings.Add(new SystemSettings());
                await dbContext.SaveChangesAsync();
            }
        }

        public static void GenerateDefaultUnits(BdsDbContext dbContext)
        {
            int[] floors = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30 };
            foreach (var floor in floors)
            {
                for (int roomIdx = 1; roomIdx <= 8; roomIdx++)
                {
                    string roomNum = $"B-{floor}{roomIdx:D2}";
                    string type = "2PN";
                    double area = 65.5;

                    if (roomIdx == 1 || roomIdx == 8) { type = "Studio"; area = 35.2; }
                    else if (roomIdx == 2 || roomIdx == 7) { type = "1PN"; area = 45.8; }
                    else if (roomIdx == 4) { type = "3PN"; area = 82.4; }

                    dbContext.Units.Add(new Unit
                    {
                        Id = roomNum,
                        Tower = "B",
                        Floor = floor,
                        RoomNumber = roomNum,
                        Area = area,
                        Type = type,
                        Status = "available"
                    });
                }
            }
        }
    }
}
