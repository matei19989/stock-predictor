using Microsoft.Extensions.Diagnostics.HealthChecks;
using StockPredictor.Application.Interfaces.External;

namespace StockPredictor.API.HealthChecks;

public class MlServiceHealthCheck : IHealthCheck
{
    private readonly IMlServiceClient _ml;

    public MlServiceHealthCheck(IMlServiceClient ml) => _ml = ml;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var healthy = await _ml.IsHealthyAsync(cancellationToken);
            return healthy
                ? HealthCheckResult.Healthy("ML service reachable and model loaded")
                : HealthCheckResult.Degraded("ML service reachable but not ready");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("ML service unreachable", ex);
        }
    }
}
