using System;

namespace BdsBackend.Models
{
    public class SystemSettings
    {
        public int Id { get; set; }
        public string CountdownDeadline { get; set; } = "2026-08-30T17:00:00.000Z";
        public string OperatingHoursJson { get; set; } = "{\"openTime\":\"08:00\",\"closeTime\":\"17:30\",\"enabled\":true}";
        public string SlaSettingsJson { get; set; } = "{\"overallDays\":30,\"intakeDays\":5,\"controlDays\":10,\"hardCopyDays\":5}";
    }
}
