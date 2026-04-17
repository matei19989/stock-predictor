using System.Text;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using FluentValidation;
using FluentValidation.AspNetCore;
using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Serilog;
using StockPredictor.API.HealthChecks;
using StockPredictor.API.Middleware;
using StockPredictor.Application.Validators;
using StockPredictor.Infrastructure;
using StockPredictor.Infrastructure.Jobs;
using StockPredictor.Infrastructure.Persistence;
using StockPredictor.Infrastructure.Seeding;
using StockPredictor.Application.Settings;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Serilog
    builder.Host.UseSerilog((ctx, config) =>
        config.ReadFrom.Configuration(ctx.Configuration)
              .WriteTo.Console()
              .WriteTo.File("logs/api-.txt", rollingInterval: RollingInterval.Day)
              .Enrich.FromLogContext());

    // Infrastructure (DB, repos, services, ML client, Hangfire)
    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.Configure<TurnstileSettings>(builder.Configuration.GetSection("Turnstile"));

    // Controllers + FluentValidation
    builder.Services.AddControllers();
    builder.Services.AddFluentValidationAutoValidation();
    builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();
    builder.Services.Configure<ApiBehaviorOptions>(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var problemDetails = new ValidationProblemDetails(context.ModelState)
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation Failed",
                Instance = context.HttpContext.Request.Path
            };

            var correlationId = context.HttpContext.Response.Headers["X-Correlation-Id"].ToString();
            if (!string.IsNullOrEmpty(correlationId))
                problemDetails.Extensions["correlationId"] = correlationId;

            return new BadRequestObjectResult(problemDetails);
        };
    });

    // JWT Authentication
    var jwtKey = builder.Configuration["Jwt:Key"];
    if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32 || jwtKey.StartsWith("CHANGE_ME"))
        throw new InvalidOperationException("Jwt:Key must be a secure random string of at least 32 characters.");

    // Email confirmation must be wired in Production. Without it, registration silently auto-confirms.
    if (builder.Environment.IsProduction() &&
        string.IsNullOrWhiteSpace(builder.Configuration["Email:ConnectionString"]))
    {
        throw new InvalidOperationException(
            "Email:ConnectionString must be configured in Production. " +
            "Empty in Production would silently auto-confirm registrations, bypassing the email-verification gate.");
    }

    // Health checks: database reachability + ML service availability.
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<AppDbContext>("database")
        .AddCheck<MlServiceHealthCheck>("ml");

    builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = builder.Configuration["Jwt:Issuer"],
                ValidAudience = builder.Configuration["Jwt:Audience"],
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
            };

            options.Events = new JwtBearerEvents
            {
                OnChallenge = async context =>
                {
                    context.HandleResponse();
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "application/problem+json";

                    var detail = string.IsNullOrEmpty(context.ErrorDescription)
                        ? "Authentication is required to access this resource."
                        : context.ErrorDescription;

                    await context.Response.WriteAsJsonAsync(new ProblemDetails
                    {
                        Status = StatusCodes.Status401Unauthorized,
                        Title = "Unauthorized",
                        Detail = detail
                    });
                },
                OnForbidden = async context =>
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    context.Response.ContentType = "application/problem+json";

                    await context.Response.WriteAsJsonAsync(new ProblemDetails
                    {
                        Status = StatusCodes.Status403Forbidden,
                        Title = "Forbidden",
                        Detail = "You do not have permission to access this resource."
                    });
                }
            };
        });

    builder.Services.AddAuthorization();

    // Rate limiting — protect auth endpoints from brute force.
    // RateLimit:Auth:Permit overrides the default (10) — tests set it high.
    var authPermit = int.TryParse(builder.Configuration["RateLimit:Auth:Permit"], out var p) ? p : 10;
    builder.Services.AddRateLimiter(options =>
    {
        options.AddFixedWindowLimiter("auth", opt =>
        {
            opt.PermitLimit = authPermit;
            opt.Window = TimeSpan.FromMinutes(15);
        });
        options.OnRejected = async (context, ct) =>
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.HttpContext.Response.ContentType = "application/problem+json";
            await context.HttpContext.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = StatusCodes.Status429TooManyRequests,
                Title = "Too Many Requests",
                Detail = "Rate limit exceeded. Please try again later."
            }, ct);
        };
    });

    // CORS — origins from config
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    builder.Services.AddCors(opts =>
        opts.AddPolicy("FrontendPolicy", policy =>
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()));

    // Swagger with JWT support
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo { Title = "StockPredictor API", Version = "v1" });
        c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            In = ParameterLocation.Header,
            Description = "Enter: Bearer {your_token}",
            Name = "Authorization",
            Type = SecuritySchemeType.ApiKey,
            Scheme = "Bearer"
        });
        c.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
        {
            { new OpenApiSecuritySchemeReference("Bearer", doc), [] }
        });
    });

    var app = builder.Build();

    // Middleware pipeline (order matters)
    app.UseMiddleware<CorrelationIdMiddleware>();
    app.UseSerilogRequestLogging();
    app.UseMiddleware<ExceptionHandlingMiddleware>();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
        app.UseHangfireDashboard("/hangfire", new DashboardOptions
        {
            Authorization = [new Hangfire.Dashboard.LocalRequestsOnlyAuthorizationFilter()]
        });
    }

    app.UseCors("FrontendPolicy");
    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapControllers();

    app.MapHealthChecks("/api/health", new HealthCheckOptions
    {
        ResponseWriter = async (ctx, report) =>
        {
            ctx.Response.ContentType = "application/json";
            var payload = new
            {
                status = report.Status.ToString(),
                totalDuration = report.TotalDuration.TotalMilliseconds,
                checks = report.Entries.ToDictionary(
                    kv => kv.Key,
                    kv => new
                    {
                        status = kv.Value.Status.ToString(),
                        durationMs = kv.Value.Duration.TotalMilliseconds,
                        description = kv.Value.Description
                    })
            };
            await ctx.Response.WriteAsJsonAsync(payload);
        }
    });

    // Apply migrations and seed default stocks
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        var seeder = scope.ServiceProvider.GetRequiredService<DataSeeder>();
        await seeder.SeedAsync();
    }

    // Register recurring Hangfire jobs
    var jobManager = app.Services.GetRequiredService<IRecurringJobManager>();
    jobManager.AddOrUpdate<RefreshStockPricesJob>(
        "refresh-stock-prices",
        job => job.ExecuteAsync(CancellationToken.None),
        builder.Configuration["Hangfire:RefreshCron"] ?? "0 * * * *"
    );
    jobManager.AddOrUpdate<CleanupExpiredPredictionsJob>(
        "cleanup-expired-predictions",
        job => job.ExecuteAsync(CancellationToken.None),
        builder.Configuration["Hangfire:CleanupCron"] ?? "0 3 * * *"
    );

    await app.RunAsync();
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Application startup failed");
}
finally
{
    Log.CloseAndFlush();
}

// Expose the implicit Program class to WebApplicationFactory<Program> in integration tests.
public partial class Program { }
