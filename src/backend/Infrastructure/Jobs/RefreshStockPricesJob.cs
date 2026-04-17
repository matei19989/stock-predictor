using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using StockPredictor.Application.Interfaces.External;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Infrastructure.Mapping;

namespace StockPredictor.Infrastructure.Jobs;

public class RefreshStockPricesJob
{
    private const int MaxDegreeOfParallelism = 5;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<RefreshStockPricesJob> _logger;

    public RefreshStockPricesJob(
        IServiceScopeFactory scopeFactory,
        ILogger<RefreshStockPricesJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task ExecuteAsync(CancellationToken cancellationToken = default)
    {
        // Health check and ticker list both need scoped services.
        List<string> tickers;
        await using (var scope = _scopeFactory.CreateAsyncScope())
        {
            var ml = scope.ServiceProvider.GetRequiredService<IMlServiceClient>();
            if (!await ml.IsHealthyAsync(cancellationToken))
            {
                _logger.LogWarning("ML service unhealthy — skipping stock price refresh");
                return;
            }

            var watchlist = scope.ServiceProvider.GetRequiredService<IWatchlistRepository>();
            tickers = await watchlist.GetAllWatchedTickersAsync(cancellationToken);
        }

        _logger.LogInformation("Refreshing prices for {Count} watched tickers (concurrency {Concurrency})",
            tickers.Count, MaxDegreeOfParallelism);

        var totalInserted = 0;

        await Parallel.ForEachAsync(
            tickers,
            new ParallelOptions
            {
                MaxDegreeOfParallelism = MaxDegreeOfParallelism,
                CancellationToken = cancellationToken
            },
            async (ticker, ct) =>
            {
                var inserted = await RefreshTickerAsync(ticker, ct);
                Interlocked.Add(ref totalInserted, inserted);
            });

        _logger.LogInformation("Price refresh complete: {Inserted} new rows across {Count} tickers",
            totalInserted, tickers.Count);
    }

    private async Task<int> RefreshTickerAsync(string ticker, CancellationToken cancellationToken)
    {
        // Each ticker runs in its own scope so every parallel branch gets its own DbContext.
        await using var scope = _scopeFactory.CreateAsyncScope();
        var ml = scope.ServiceProvider.GetRequiredService<IMlServiceClient>();
        var stocks = scope.ServiceProvider.GetRequiredService<IStockRepository>();
        var prices = scope.ServiceProvider.GetRequiredService<IStockPriceRepository>();

        try
        {
            var data = await ml.GetStockDataAsync(ticker, "1mo", cancellationToken);
            if (data == null)
            {
                _logger.LogWarning("No data returned for {Ticker}", ticker);
                return 0;
            }

            var stock = await stocks.GetByTickerAsync(ticker, cancellationToken);
            if (stock == null) return 0;

            var newPrices = StockPriceMapper.ToEntities(stock.Id, data.Data);
            var inserted = await prices.UpsertRangeAsync(stock.Id, newPrices, cancellationToken);

            stock.LastUpdatedAt = DateTime.UtcNow;
            if (string.IsNullOrEmpty(stock.Name) && !string.IsNullOrEmpty(data.Name))
            {
                stock.Name = data.Name;
                _logger.LogInformation("Backfilled name for {Ticker}: {Name}", ticker, data.Name);
            }
            if (string.IsNullOrEmpty(stock.Sector) && !string.IsNullOrEmpty(data.Sector))
            {
                stock.Sector = data.Sector;
            }
            await stocks.UpdateAsync(stock, cancellationToken);

            return inserted;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh prices for {Ticker}", ticker);
            return 0;
        }
    }
}
