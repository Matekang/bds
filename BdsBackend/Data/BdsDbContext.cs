using Microsoft.EntityFrameworkCore;
using BdsBackend.Models;

namespace BdsBackend.Data
{
    public class BdsDbContext : DbContext
    {
        public BdsDbContext(DbContextOptions<BdsDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Application> Applications { get; set; } = null!;
        public DbSet<Unit> Units { get; set; } = null!;
        public DbSet<Otp> Otps { get; set; } = null!;
        public DbSet<SystemSettings> Settings { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.PhoneNumber);
                entity.HasIndex(e => e.Email);
            });

            modelBuilder.Entity<Application>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.UserId);
            });

            modelBuilder.Entity<Unit>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Floor);
            });

            modelBuilder.Entity<Otp>(entity =>
            {
                entity.HasKey(e => e.Id);
            });

            modelBuilder.Entity<SystemSettings>(entity =>
            {
                entity.HasKey(e => e.Id);
            });
        }
    }
}
