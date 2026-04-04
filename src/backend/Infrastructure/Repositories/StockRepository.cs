using Microsoft.EntityFrameworkCore;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Repositories;

public class StockRepository : IStockRepository
{
    private readonly AppDbContext _db;

    public StockRepository(AppDbContext db) => _db = db;

    public Task<Stock?> GetByTickerAsync(string ticker) =>
        _db.Stocks.FirstOrDefaultAsync(s => s.Ticker == ticker.ToUpper());

    public Task<Stock?> GetByIdAsync(Guid id) =>
        _db.Stocks.FirstOrDefaultAsync(s => s.Id == id);

    public Task<List<Stock>> SearchAsync(string query, int limit = 20) =>
        _db.Stocks
           .Where(s => EF.Functions.ILike(s.Ticker, $"%{query}%") ||
                       (s.Name != null && EF.Functions.ILike(s.Name, $"%{query}%")))
           .Take(limit)
           .ToListAsync();

    public async Task AddAsync(Stock stock)
    {
        await _db.Stocks.AddAsync(stock);
        await _db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Stock stock)
    {
        _db.Stocks.Update(stock);
        await _db.SaveChangesAsync();
    }
}
