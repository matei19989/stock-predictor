using StockPredictor.Application.DTOs.Stocks;

namespace StockPredictor.Application.Interfaces.Services;

public interface IStockService
{
    Task<List<StockSearchResultDto>> SearchAsync(string query, Guid userId);
    Task<StockDetailDto> GetDetailAsync(string ticker);
    Task<Guid> EnsureStockExistsAsync(string ticker);
}
