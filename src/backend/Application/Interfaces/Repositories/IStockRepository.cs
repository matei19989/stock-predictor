using StockPredictor.Domain.Entities;

namespace StockPredictor.Application.Interfaces.Repositories;

public interface IStockRepository
{
    Task<Stock?> GetByTickerAsync(string ticker);
    Task<Stock?> GetByIdAsync(Guid id);
    Task<List<Stock>> SearchAsync(string query, int limit = 20);
    Task AddAsync(Stock stock);
    Task UpdateAsync(Stock stock);
}
