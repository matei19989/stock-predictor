using StockPredictor.Domain.Entities;

namespace StockPredictor.Application.Interfaces.Repositories;

public interface IStockVisitRepository
{
    Task<List<StockVisit>> GetRecentAsync(Guid userId, int limit = 5, CancellationToken cancellationToken = default);
    Task UpsertAsync(StockVisit visit, CancellationToken cancellationToken = default);
}
