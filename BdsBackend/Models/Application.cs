using System;

namespace BdsBackend.Models
{
    public class Application
    {
        public string Id { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string MaKH { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string CccdNumber { get; set; } = string.Empty;
        public string InfoChannel { get; set; } = "social_media";
        public string NeedLoanConsult { get; set; } = "yes";
        public string TargetObject { get; set; } = "K1";
        public string TargetObjectDetail { get; set; } = string.Empty;
        public string UnitType { get; set; } = "Căn 1 phòng ngủ";
        public string PreferredFloor { get; set; } = "mid";
        public string Status { get; set; } = "submitted";
        public int Stage { get; set; } = 1;
        public int ProgressPercent { get; set; } = 0;
        public string Notes { get; set; } = string.Empty;
        public string Dob { get; set; } = string.Empty;
        public string Gender { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string IssueDate { get; set; } = string.Empty;
        public string OldCmnd { get; set; } = string.Empty;
        public string? CccdImage { get; set; }
        public string? CccdFrontImage { get; set; }
        public string? CccdBackImage { get; set; }
        public string? QrParsedDataJson { get; set; }
        public string? DocumentsJson { get; set; }
        public bool AgreedTerms1 { get; set; } = false;
        public bool AgreedTerms2 { get; set; } = false;
        public string EkycStatus { get; set; } = "unverified";
        public string? EkycDataJson { get; set; }
        public string? AppointmentTicketJson { get; set; }
        public string AssignedOfficer { get; set; } = "Nguyễn Văn Tùng";
        public string Shift { get; set; } = "morning";
        public string? SlaDeadline { get; set; }
        public string? HardCopyDeadline { get; set; }
        public string MaritalStatus { get; set; } = "Độc thân/ Độc thân nuôi con";
        public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
        public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("o");
    }
}
