using Microsoft.EntityFrameworkCore;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Repositories;

public class WatchlistRepository : IWatchlistRepository
{
    private readonly AppDbContext _db;

    public WatchlistRepository(AppDbContext db) => _db = db;

    public Task<List<WatchlistItem>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _db.WatchlistItems
           .AsNoTracking()
           .Include(w => w.Stock)
           .Where(w => w.UserId == userId)
           .OrderByDescending(w => w.AddedAt)
           .ToListAsync(cancellationToken);

    public Task<WatchlistItem?> GetItemAsync(Guid userId, Guid stockId, CancellationToken cancellationToken = default) =>
        _db.WatchlistItems
           .FirstOrDefaultAsync(w => w.UserId == userId && w.StockId == stockId, cancellationToken);

    public Task<bool> ExistsAsync(Guid userId, Guid stockId, CancellationToken cancellationToken = default) =>
        _db.WatchlistItems.AnyAsync(w => w.UserId == userId && w.StockId == stockId, cancellationToken);

    public async Task AddAsync(WatchlistItem item, CancellationToken cancellationToken = default)
    {
        await _db.WatchlistItems.AddAsync(item, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveAsync(WatchlistItem item, CancellationToken cancellationToken = default)
    {
        _db.WatchlistItems.Remove(item);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public Task<List<string>> GetAllWatchedTickersAsync(CancellationToken cancellationToken = default) =>
        _db.WatchlistItems
           .Select(w => w.Stock.Ticker)
           .Distinct()
           .ToListAsync(cancellationToken);
}
