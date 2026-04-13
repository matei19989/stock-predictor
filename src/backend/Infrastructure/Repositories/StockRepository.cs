using Microsoft.EntityFrameworkCore;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Repositories;

public class StockRepository : IStockRepository
{
    private readonly AppDbContext _db;

    public StockRepository(AppDbContext db) => _db = db;

    public Task<Stock?> GetByTickerAsync(string ticker, CancellationToken cancellationToken = default) =>
        _db.Stocks.FirstOrDefaultAsync(s => s.Ticker == ticker.ToUpper(), cancellationToken);

    public Task<Stock?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        _db.Stocks.FirstOrDefaultAsync(s => s.Id == id, cancellationToken);

    public Task<List<Stock>> SearchAsync(string query, int limit = 20, CancellationToken cancellationToken = default) =>
        _db.Stocks
           .AsNoTracking()
           .Where(s => EF.Functions.ILike(s.Ticker, $"%{query}%") ||
                       (s.Name != null && EF.Functions.ILike(s.Name, $"%{query}%")))
           .OrderBy(s => s.Ticker)
           .Take(limit)
           .ToListAsync(cancellationToken);

    public async Task AddAsync(Stock stock, CancellationToken cancellationToken = default)
    {
        await _db.Stocks.AddAsync(stock, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Stock stock, CancellationToken cancellationToken = default)
    {
        _db.Stocks.Update(stock);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<Stock>> GetAllAsync(CancellationToken cancellationToken = default)
        => await _db.Stocks.OrderBy(s => s.Ticker).ToListAsync(cancellationToken);

    public async Task AddRangeAsync(List<Stock> stocks, CancellationToken cancellationToken = default)
    {
        _db.Stocks.AddRange(stocks);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
