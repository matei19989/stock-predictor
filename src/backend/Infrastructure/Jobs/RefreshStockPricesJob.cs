using Microsoft.Extensions.Logging;
using StockPredictor.Application.Interfaces.External;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Infrastructure.Mapping;

namespace StockPredictor.Infrastructure.Jobs;

public class RefreshStockPricesJob
{
    private readonly IMlServiceClient _ml;
    private readonly IStockRepository _stocks;
    private readonly IStockPriceRepository _prices;
    private readonly IWatchlistRepository _watchlist;
    private readonly ILogger<RefreshStockPricesJob> _logger;

    public RefreshStockPricesJob(
        IMlServiceClient ml,
        IStockRepository stocks,
        IStockPriceRepository prices,
        IWatchlistRepository watchlist,
        ILogger<RefreshStockPricesJob> logger)
    {
        _ml = ml;
        _stocks = stocks;
        _prices = prices;
        _watchlist = watchlist;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        if (!await _ml.IsHealthyAsync(cancellationToken))
        {
            _logger.LogWarning("ML service unhealthy \u2014 skipping stock price refresh");
            return;
        }

        var tickers = await _watchlist.GetAllWatchedTickersAsync(cancellationToken);
        _logger.LogInformation("Refreshing prices for {Count} watched tickers", tickers.Count);

        var totalInserted = 0;

        foreach (var ticker in tickers)
        {
            try
            {
                var data = await _ml.GetStockDataAsync(ticker, "1mo", cancellationToken);
                if (data == null)
                {
                    _logger.LogWarning("No data returned for {Ticker}", ticker);
                    continue;
                }

                var stock = await _stocks.GetByTickerAsync(ticker, cancellationToken);
                if (stock == null) continue;

                var newPrices = StockPriceMapper.ToEntities(stock.Id, data.Data);
                var inserted = await _prices.UpsertRangeAsync(stock.Id, newPrices, cancellationToken);
                totalInserted += inserted;

                stock.LastUpdatedAt = DateTime.UtcNow;
                await _stocks.UpdateAsync(stock, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to refresh prices for {Ticker}", ticker);
            }
        }

        _logger.LogInformation("Price refresh complete: {Inserted} new rows across {Count} tickers",
            totalInserted, tickers.Count);
    }
}
