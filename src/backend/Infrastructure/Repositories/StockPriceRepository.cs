using Microsoft.EntityFrameworkCore;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Repositories;

public class StockPriceRepository : IStockPriceRepository
{
    private readonly AppDbContext _db;

    public StockPriceRepository(AppDbContext db) => _db = db;

    public Task<StockPrice?> GetLatestAsync(Guid stockId) =>
        _db.StockPrices
           .Where(p => p.StockId == stockId)
           .OrderByDescending(p => p.Date)
           .FirstOrDefaultAsync();

    public Task<List<StockPrice>> GetLastNAsync(Guid stockId, int count) =>
        _db.StockPrices
           .Where(p => p.StockId == stockId)
           .OrderByDescending(p => p.Date)
           .Take(count)
           .ToListAsync();

    public Task<List<StockPrice>> GetAllAsync(Guid stockId) =>
        _db.StockPrices
           .Where(p => p.StockId == stockId)
           .OrderBy(p => p.Date)
           .ToListAsync();

    public async Task<int> UpsertRangeAsync(Guid stockId, List<StockPrice> prices)
    {
        var incoming = prices.Select(p => p.Date).ToList();

        var existing = await _db.StockPrices
            .Where(p => p.StockId == stockId && incoming.Contains(p.Date))
            .Select(p => p.Date)
            .ToHashSetAsync();

        var newPrices = prices.Where(p => !existing.Contains(p.Date)).ToList();
        if (newPrices.Count == 0) return 0;

        await _db.StockPrices.AddRangeAsync(newPrices);
        await _db.SaveChangesAsync();
        return newPrices.Count;
    }
}
