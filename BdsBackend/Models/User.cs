using System;

namespace BdsBackend.Models
{
    public class User
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string FullName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Cccd { get; set; }
        public string? CccdNumber { get; set; }
        public string PasswordHash { get; set; } = string.Empty;
        public string Password { get; set; } = "123456";
        public string Role { get; set; } = "user"; // admin, officer_intake, officer_control, officer_hardcopy, officer_archive, user, citizen
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
