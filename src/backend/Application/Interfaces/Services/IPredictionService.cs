using StockPredictor.Application.DTOs.Predictions;

namespace StockPredictor.Application.Interfaces.Services;

public interface IPredictionService
{
    Task<PredictionDto> GetOrCreateAsync(Guid userId, string ticker, string horizon, CancellationToken cancellationToken = default);
    Task<PredictionDto?> GetLatestForUserAsync(Guid userId, string ticker, string horizon, CancellationToken cancellationToken = default);
    Task<List<UserPredictionDto>> GetUserPredictedAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<int> GetUserPredictionCountAsync(Guid userId, CancellationToken cancellationToken = default);
}
