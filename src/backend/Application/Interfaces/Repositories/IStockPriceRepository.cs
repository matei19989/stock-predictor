using StockPredictor.Domain.Entities;

namespace StockPredictor.Application.Interfaces.Repositories;

public interface IStockPriceRepository
{
    Task<StockPrice?> GetLatestAsync(Guid stockId, CancellationToken cancellationToken = default);
    Task<List<StockPrice>> GetAllAsync(Guid stockId, CancellationToken cancellationToken = default);
    Task<int> UpsertRangeAsync(Guid stockId, List<StockPrice> prices, CancellationToken cancellationToken = default);
    Task<Dictionary<Guid, StockPrice>> GetLatestForStocksAsync(List<Guid> stockIds, CancellationToken cancellationToken = default);
    Task<Dictionary<Guid, List<StockPrice>>> GetLastNForStocksAsync(List<Guid> stockIds, int countPerStock, CancellationToken cancellationToken = default);
}
