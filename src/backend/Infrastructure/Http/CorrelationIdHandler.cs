using Microsoft.AspNetCore.Http;

namespace StockPredictor.Infrastructure.Http;

public class CorrelationIdHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CorrelationIdHandler(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var correlationId = _httpContextAccessor.HttpContext?
            .Response.Headers["X-Correlation-Id"].FirstOrDefault();

        if (!string.IsNullOrEmpty(correlationId))
            request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        return base.SendAsync(request, cancellationToken);
    }
}
