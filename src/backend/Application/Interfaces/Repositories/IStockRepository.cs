using StockPredictor.Domain.Entities;

namespace StockPredictor.Application.Interfaces.Repositories;

public interface IStockRepository
{
    Task<Stock?> GetByTickerAsync(string ticker, CancellationToken cancellationToken = default);
    Task<Stock?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<List<Stock>> SearchAsync(string query, int limit = 20, CancellationToken cancellationToken = default);
    Task AddAsync(Stock stock, CancellationToken cancellationToken = default);
    Task UpdateAsync(Stock stock, CancellationToken cancellationToken = default);
}
