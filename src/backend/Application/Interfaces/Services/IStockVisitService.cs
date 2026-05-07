using StockPredictor.Application.DTOs.Stocks;

namespace StockPredictor.Application.Interfaces.Services;

public interface IStockVisitService
{
    Task RecordAsync(Guid userId, string ticker, CancellationToken cancellationToken = default);
    Task<List<RecentlyViewedDto>> GetRecentlyViewedAsync(Guid userId, CancellationToken cancellationToken = default);
}
