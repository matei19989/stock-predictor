using StockPredictor.Domain.Entities;

namespace StockPredictor.Application.Interfaces.Repositories;

public interface IPredictionRepository
{
    Task<Prediction?> GetValidAsync(Guid stockId, string horizon);    // ExpiresAt > UtcNow
    Task<Prediction?> GetLatestAsync(Guid stockId, string horizon);   // most recent regardless of expiry
    Task AddAsync(Prediction prediction);
}
