using StockPredictor.Application.DTOs.Stocks;

namespace StockPredictor.Application.Interfaces.Services;

public interface IStockService
{
    Task<List<StockSearchResultDto>> SearchAsync(string query, Guid userId, CancellationToken cancellationToken = default);
    Task<StockDetailDto> GetDetailAsync(string ticker, CancellationToken cancellationToken = default);
    Task<Guid> EnsureStockExistsAsync(string ticker, CancellationToken cancellationToken = default);
    Task<List<StockOverviewDto>> GetAllOverviewAsync(CancellationToken cancellationToken = default);
}
