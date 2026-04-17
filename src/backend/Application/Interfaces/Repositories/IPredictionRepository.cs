using StockPredictor.Domain.Entities;
using StockPredictor.Domain.Enums;

namespace StockPredictor.Application.Interfaces.Repositories;

public interface IPredictionRepository
{
    Task<Prediction?> GetValidAsync(Guid stockId, Horizon horizon, CancellationToken cancellationToken = default);    // ExpiresAt > UtcNow
    Task<Prediction?> GetLatestAsync(Guid stockId, Horizon horizon, CancellationToken cancellationToken = default);   // most recent regardless of expiry
    Task AddAsync(Prediction prediction, CancellationToken cancellationToken = default);
    Task<Dictionary<Guid, Prediction>> GetValidForStocksAsync(List<Guid> stockIds, Horizon horizon, CancellationToken cancellationToken = default);
    Task<int> DeleteExpiredAsync(DateTime olderThan, CancellationToken cancellationToken = default);
}
