using Microsoft.AspNetCore.Mvc;
using StockPredictor.Application.Exceptions;

namespace StockPredictor.API.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await _next(ctx);
        }
        catch (Exception ex)
        {
            if (ex is AppException)
                _logger.LogWarning(ex, "Application exception: {Message}", ex.Message);
            else
                _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);

            if (ctx.Response.HasStarted)
            {
                _logger.LogWarning("Response already started — cannot write ProblemDetails");
                throw;
            }

            await HandleAsync(ctx, ex);
        }
    }

    private static Task HandleAsync(HttpContext ctx, Exception ex)
    {
        var (status, title) = ex switch
        {
            AppException appEx => (appEx.StatusCode, appEx.GetType().Name.Replace("Exception", "")),
            _ => (StatusCodes.Status500InternalServerError, "Internal Server Error")
        };

        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/problem+json";

        var detail = ex is AppException ? ex.Message : "An unexpected error occurred.";

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Instance = ctx.Request.Path
        };

        var correlationId = ctx.Response.Headers["X-Correlation-Id"].ToString();
        if (!string.IsNullOrEmpty(correlationId))
            problem.Extensions["correlationId"] = correlationId;

        return ctx.Response.WriteAsJsonAsync(problem);
    }
}
