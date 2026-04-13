using Microsoft.EntityFrameworkCore;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Repositories;

public class StockPriceRepository : IStockPriceRepository
{
    private readonly AppDbContext _db;

    public StockPriceRepository(AppDbContext db) => _db = db;

    public Task<StockPrice?> GetLatestAsync(Guid stockId, CancellationToken cancellationToken = default) =>
        _db.StockPrices
           .AsNoTracking()
           .Where(p => p.StockId == stockId)
           .OrderByDescending(p => p.Date)
           .FirstOrDefaultAsync(cancellationToken);

    public Task<List<StockPrice>> GetAllAsync(Guid stockId, CancellationToken cancellationToken = default) =>
        _db.StockPrices
           .AsNoTracking()
           .Where(p => p.StockId == stockId)
           .OrderBy(p => p.Date)
           .ToListAsync(cancellationToken);

    public async Task<int> UpsertRangeAsync(Guid stockId, List<StockPrice> prices, CancellationToken cancellationToken = default)
    {
        var incoming = prices.Select(p => p.Date).ToList();

        var existing = await _db.StockPrices
            .Where(p => p.StockId == stockId && incoming.Contains(p.Date))
            .Select(p => p.Date)
            .ToHashSetAsync(cancellationToken);

        var newPrices = prices.Where(p => !existing.Contains(p.Date)).ToList();
        if (newPrices.Count == 0) return 0;

        await _db.StockPrices.AddRangeAsync(newPrices, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        return newPrices.Count;
    }

    public async Task<Dictionary<Guid, StockPrice>> GetLatestForStocksAsync(List<Guid> stockIds, CancellationToken cancellationToken = default)
    {
        if (stockIds.Count == 0) return new();

        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

        var prices = await _db.StockPrices
            .AsNoTracking()
            .Where(p => stockIds.Contains(p.StockId) && p.Date >= cutoff)
            .OrderByDescending(p => p.Date)
            .ToListAsync(cancellationToken);

        return prices
            .GroupBy(p => p.StockId)
            .ToDictionary(g => g.Key, g => g.First());
    }

    public async Task<Dictionary<Guid, List<StockPrice>>> GetLastNForStocksAsync(
        List<Guid> stockIds, int countPerStock, CancellationToken cancellationToken = default)
    {
        if (stockIds.Count == 0) return new();

        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

        var prices = await _db.StockPrices
            .AsNoTracking()
            .Where(p => stockIds.Contains(p.StockId) && p.Date >= cutoff)
            .OrderByDescending(p => p.Date)
            .ToListAsync(cancellationToken);

        return prices
            .GroupBy(p => p.StockId)
            .ToDictionary(g => g.Key, g => g.Take(countPerStock).ToList());
    }
}
