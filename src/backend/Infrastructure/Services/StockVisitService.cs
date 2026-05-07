using Microsoft.Extensions.Logging;
using StockPredictor.Application.DTOs.Stocks;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Application.Interfaces.Services;
using StockPredictor.Domain.Entities;

namespace StockPredictor.Infrastructure.Services;

public class StockVisitService : IStockVisitService
{
    private const int RecentlyViewedLimit = 5;

    private readonly IStockRepository _stocks;
    private readonly IStockVisitRepository _visits;
    private readonly ILogger<StockVisitService> _logger;

    public StockVisitService(
        IStockRepository stocks,
        IStockVisitRepository visits,
        ILogger<StockVisitService> logger)
    {
        _stocks = stocks;
        _visits = visits;
        _logger = logger;
    }

    public async Task RecordAsync(Guid userId, string ticker, CancellationToken cancellationToken = default)
    {
        var upper = ticker.ToUpper();
        var stock = await _stocks.GetByTickerAsync(upper, cancellationToken)
            ?? throw new NotFoundException($"Stock '{upper}' not found.");

        try
        {
            await _visits.UpsertAsync(new StockVisit
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                StockId = stock.Id,
                VisitedAt = DateTime.UtcNow,
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to upsert visit for {UserId} {Ticker}; treating as best-effort", userId, upper);
        }
    }

    public async Task<List<RecentlyViewedDto>> GetRecentlyViewedAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var visits = await _visits.GetRecentAsync(userId, RecentlyViewedLimit, cancellationToken);
        return visits.Select(v => new RecentlyViewedDto(v.Stock.Ticker, v.Stock.Name)).ToList();
    }
}
