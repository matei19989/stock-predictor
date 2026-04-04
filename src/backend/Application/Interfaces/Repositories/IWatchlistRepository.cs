using StockPredictor.Domain.Entities;

namespace StockPredictor.Application.Interfaces.Repositories;

public interface IWatchlistRepository
{
    Task<List<WatchlistItem>> GetByUserIdAsync(Guid userId);
    Task<WatchlistItem?> GetItemAsync(Guid userId, Guid stockId);
    Task<bool> ExistsAsync(Guid userId, Guid stockId);
    Task AddAsync(WatchlistItem item);
    Task RemoveAsync(WatchlistItem item);
    Task<List<string>> GetAllWatchedTickersAsync();
}
