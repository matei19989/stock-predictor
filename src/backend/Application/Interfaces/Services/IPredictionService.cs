using StockPredictor.Application.DTOs.Predictions;

namespace StockPredictor.Application.Interfaces.Services;

public interface IPredictionService
{
    Task<PredictionDto> GetOrCreateAsync(string ticker, string horizon, CancellationToken cancellationToken = default);
    Task<PredictionDto?> GetLatestForUserAsync(Guid userId, string ticker, string horizon, CancellationToken cancellationToken = default);
}
