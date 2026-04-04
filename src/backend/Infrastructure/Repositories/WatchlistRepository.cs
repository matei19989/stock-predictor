using Microsoft.EntityFrameworkCore;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Repositories;

public class WatchlistRepository : IWatchlistRepository
{
    private readonly AppDbContext _db;

    public WatchlistRepository(AppDbContext db) => _db = db;

    public Task<List<WatchlistItem>> GetByUserIdAsync(Guid userId) =>
        _db.WatchlistItems
           .Include(w => w.Stock)
           .Where(w => w.UserId == userId)
           .OrderByDescending(w => w.AddedAt)
           .ToListAsync();

    public Task<WatchlistItem?> GetItemAsync(Guid userId, Guid stockId) =>
        _db.WatchlistItems
           .FirstOrDefaultAsync(w => w.UserId == userId && w.StockId == stockId);

    public Task<bool> ExistsAsync(Guid userId, Guid stockId) =>
        _db.WatchlistItems.AnyAsync(w => w.UserId == userId && w.StockId == stockId);

    public async Task AddAsync(WatchlistItem item)
    {
        await _db.WatchlistItems.AddAsync(item);
        await _db.SaveChangesAsync();
    }

    public async Task RemoveAsync(WatchlistItem item)
    {
        _db.WatchlistItems.Remove(item);
        await _db.SaveChangesAsync();
    }

    public Task<List<string>> GetAllWatchedTickersAsync() =>
        _db.WatchlistItems
           .Select(w => w.Stock.Ticker)
           .Distinct()
           .ToListAsync();
}
