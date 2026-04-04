using StockPredictor.Application.DTOs.Watchlist;

namespace StockPredictor.Application.Interfaces.Services;

public interface IWatchlistService
{
    Task<List<WatchlistItemDto>> GetAsync(Guid userId);
    Task AddAsync(Guid userId, string ticker);
    Task RemoveAsync(Guid userId, string ticker);
    Task SeedDefaultsAsync(Guid userId);
}
