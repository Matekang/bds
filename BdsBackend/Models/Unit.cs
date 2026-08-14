using System;

namespace BdsBackend.Models
{
    public class Unit
    {
        public string Id { get; set; } = string.Empty; // e.g. "B-101"
        public string Tower { get; set; } = "B";
        public int Floor { get; set; }
        public string RoomNumber { get; set; } = string.Empty;
        public double Area { get; set; }
        public string Type { get; set; } = "2PN"; // Studio, 1PN, 2PN, 3PN
        public string Status { get; set; } = "available"; // available, reserved, sold
        public string? ReservedByUserId { get; set; }
        public string? ReservedAt { get; set; }
    }
}
