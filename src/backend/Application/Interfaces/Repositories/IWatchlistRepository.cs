using StockPredictor.Domain.Entities;

namespace StockPredictor.Application.Interfaces.Repositories;

public interface IWatchlistRepository
{
    Task<List<WatchlistItem>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<WatchlistItem?> GetItemAsync(Guid userId, Guid stockId, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(Guid userId, Guid stockId, CancellationToken cancellationToken = default);
    Task AddAsync(WatchlistItem item, CancellationToken cancellationToken = default);
    Task RemoveAsync(WatchlistItem item, CancellationToken cancellationToken = default);
    Task<List<string>> GetAllWatchedTickersAsync(CancellationToken cancellationToken = default);
}
