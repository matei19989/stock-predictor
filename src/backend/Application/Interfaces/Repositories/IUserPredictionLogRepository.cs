using StockPredictor.Domain.Entities;

namespace StockPredictor.Application.Interfaces.Repositories;

public interface IUserPredictionLogRepository
{
    Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task UpsertAsync(UserPredictionLog entry, CancellationToken cancellationToken = default);
}
