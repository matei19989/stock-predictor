using StockPredictor.Domain.Entities;

namespace StockPredictor.Application.Interfaces.Repositories;

public interface IStockPriceRepository
{
    Task<StockPrice?> GetLatestAsync(Guid stockId);
    Task<List<StockPrice>> GetLastNAsync(Guid stockId, int count);
    Task<List<StockPrice>> GetAllAsync(Guid stockId);
    Task<int> UpsertRangeAsync(Guid stockId, List<StockPrice> prices);
}
