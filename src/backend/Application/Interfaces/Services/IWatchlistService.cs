using StockPredictor.Application.DTOs.Watchlist;

namespace StockPredictor.Application.Interfaces.Services;

public interface IWatchlistService
{
    Task<List<WatchlistItemDto>> GetAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(Guid userId, string ticker, CancellationToken cancellationToken = default);
    Task RemoveAsync(Guid userId, string ticker, CancellationToken cancellationToken = default);
    Task SeedDefaultsAsync(Guid userId, CancellationToken cancellationToken = default);
}
