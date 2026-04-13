using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;
using StockPredictor.Application.Settings;

namespace StockPredictor.API.Filters;

/// <summary>
/// Action filter that validates a Cloudflare Turnstile token from the request body
/// by calling Cloudflare's siteverify endpoint. Returns 403 on failure.
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
public class ValidateTurnstileAttribute : Attribute, IFilterFactory
{
    public bool IsReusable => false;

    public IFilterMetadata CreateInstance(IServiceProvider serviceProvider)
    {
        return new ValidateTurnstileFilter(
            serviceProvider.GetRequiredService<IHttpClientFactory>(),
            serviceProvider.GetRequiredService<IOptions<TurnstileSettings>>(),
            serviceProvider.GetRequiredService<ILogger<ValidateTurnstileFilter>>());
    }
}

internal class ValidateTurnstileFilter : IAsyncActionFilter
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly TurnstileSettings _settings;
    private readonly ILogger<ValidateTurnstileFilter> _logger;

    public ValidateTurnstileFilter(
        IHttpClientFactory httpClientFactory,
        IOptions<TurnstileSettings> settings,
        ILogger<ValidateTurnstileFilter> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var turnstileToken = ExtractToken(context);

        if (string.IsNullOrWhiteSpace(turnstileToken))
        {
            _logger.LogWarning("Turnstile token missing from request");
            context.Result = CreateForbiddenResult();
            return;
        }

        var isValid = await VerifyTokenAsync(turnstileToken, context.HttpContext.RequestAborted);

        if (!isValid)
        {
            context.Result = CreateForbiddenResult();
            return;
        }

        await next();
    }

    private static string? ExtractToken(ActionExecutingContext context)
    {
        foreach (var arg in context.ActionArguments.Values)
        {
            if (arg is null) continue;
            var prop = arg.GetType().GetProperty("TurnstileToken");
            if (prop?.GetValue(arg) is string token)
                return token;
        }
        return null;
    }

    private async Task<bool> VerifyTokenAsync(string token, CancellationToken cancellationToken)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Turnstile");
            var payload = new Dictionary<string, string>
            {
                ["secret"] = _settings.SecretKey,
                ["response"] = token
            };

            var response = await client.PostAsync(
                _settings.SiteVerifyUrl,
                new FormUrlEncodedContent(payload),
                cancellationToken);

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<TurnstileVerifyResponse>(json);

            if (result?.Success != true)
            {
                _logger.LogWarning("Turnstile verification failed. Errors: {Errors}",
                    result?.ErrorCodes != null ? string.Join(", ", result.ErrorCodes) : "unknown");
                return false;
            }

            return true;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to reach Cloudflare Turnstile siteverify endpoint");
            return false; // Fail closed
        }
    }

    private static ObjectResult CreateForbiddenResult()
    {
        return new ObjectResult(new ProblemDetails
        {
            Status = StatusCodes.Status403Forbidden,
            Title = "Forbidden",
            Detail = "Bot verification failed. Please try again."
        })
        {
            StatusCode = StatusCodes.Status403Forbidden
        };
    }

    private class TurnstileVerifyResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("error-codes")]
        public string[]? ErrorCodes { get; set; }
    }
}
