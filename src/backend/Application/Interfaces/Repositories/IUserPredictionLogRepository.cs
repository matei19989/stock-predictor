using StockPredictor.Domain.Entities;
using StockPredictor.Domain.Enums;

namespace StockPredictor.Application.Interfaces.Repositories;

public interface IUserPredictionLogRepository
{
    Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task UpsertAsync(UserPredictionLog entry, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(Guid userId, Guid stockId, Horizon horizon, CancellationToken ct = default);
    Task<List<UserPredictionLog>> GetAllForUserAsync(Guid userId, CancellationToken cancellationToken = default);
}
