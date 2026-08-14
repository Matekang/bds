using System;
using System.IO;
using System.Threading.RateLimiting;
using BdsBackend.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// Connection String SQL Server / SQLite Fallback
var connStr = builder.Configuration.GetConnectionString("DefaultConnection");

// DbContext Pooling (Pool size 1024) - Tái sử dụng DbContext instances giúp giảm 90% chi phí GC & CPU khi 2000 user truy cập cùng lúc
builder.Services.AddDbContextPool<BdsDbContext>(options =>
{
    if (!string.IsNullOrEmpty(connStr))
    {
        try
        {
            options.UseSqlServer(connStr, sqlOptions =>
            {
                sqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
            });
        }
        catch
        {
            options.UseSqlite("Data Source=bds.db");
        }
    }
    else
    {
        options.UseSqlite("Data Source=bds.db");
    }
}, poolSize: 1024);

// In-Memory Cache
builder.Services.AddMemoryCache();

// Response Compression (Brotli & Gzip) - Giảm 80-90% dung lượng JSON truyền qua mạng
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});

// Large Multipart File Upload Limit Config (Tối đa 100MB body, 100MB per file)
builder.Services.Configure<FormOptions>(options =>
{
    options.ValueLengthLimit = int.MaxValue;
    options.MultipartBodyLengthLimit = 104_857_600; // 100MB
    options.MultipartHeadersLengthLimit = int.MaxValue;
});

// ASP.NET Core Rate Limiting & Concurrency Limiter (Chống sập server khi 2.000 người nộp cùng lúc)
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddConcurrencyLimiter("HighConcurrencyPolicy", limiterOptions =>
    {
        limiterOptions.PermitLimit = 2000;
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiterOptions.QueueLimit = 5000;
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// OpenAPI / Swagger
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();

// CORS Policy
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Enable Response Compression
app.UseResponseCompression();

// Enable Rate Limiter
app.UseRateLimiter();

// Auto Seed Data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<BdsDbContext>();
    try
    {
        await DbSeeder.SeedAsync(db);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Startup] Warning seeding DB: {ex.Message}");
    }
}

// Configure HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");

// Static File Serving với Caching 7 ngày
var wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
if (!Directory.Exists(wwwrootPath)) Directory.CreateDirectory(wwwrootPath);

app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Cache-Control", "public, max-age=604800");
    }
});

var publicUploads = Path.Combine(Directory.GetCurrentDirectory(), "..", "public", "uploads");
if (Directory.Exists(publicUploads))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(publicUploads),
        RequestPath = "/uploads",
        OnPrepareResponse = ctx =>
        {
            ctx.Context.Response.Headers.Append("Cache-Control", "public, max-age=604800");
        }
    });
}

app.UseRouting();

app.MapControllers().RequireRateLimiting("HighConcurrencyPolicy");

app.Run("http://localhost:5000");
