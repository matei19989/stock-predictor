using Microsoft.Extensions.Logging;
using StockPredictor.Application.Interfaces.Repositories;

namespace StockPredictor.Infrastructure.Jobs;

public class CleanupExpiredPredictionsJob
{
    private readonly IPredictionRepository _predictions;
    private readonly ILogger<CleanupExpiredPredictionsJob> _logger;

    public CleanupExpiredPredictionsJob(
        IPredictionRepository predictions,
        ILogger<CleanupExpiredPredictionsJob> logger)
    {
        _predictions = predictions;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        var deleted = await _predictions.DeleteExpiredAsync(DateTime.UtcNow, cancellationToken);
        _logger.LogInformation("Cleanup removed {Count} expired predictions", deleted);
    }
}
