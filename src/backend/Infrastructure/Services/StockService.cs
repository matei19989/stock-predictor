using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StockPredictor.Application.DTOs.Stocks;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.External;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Application.Interfaces.Services;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Mapping;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Services;

public class StockService : IStockService
{
    private readonly IStockRepository _stocks;
    private readonly IStockPriceRepository _prices;
    private readonly IWatchlistRepository _watchlist;
    private readonly IPredictionRepository _predictions;
    private readonly IMlServiceClient _ml;
    private readonly AppDbContext _db;
    private readonly ILogger<StockService> _logger;

    public StockService(
        IStockRepository stocks,
        IStockPriceRepository prices,
        IWatchlistRepository watchlist,
        IPredictionRepository predictions,
        IMlServiceClient ml,
        AppDbContext db,
        ILogger<StockService> logger)
    {
        _stocks = stocks;
        _prices = prices;
        _watchlist = watchlist;
        _predictions = predictions;
        _ml = ml;
        _db = db;
        _logger = logger;
    }

    public async Task<List<StockSearchResultDto>> SearchAsync(string query, Guid userId, CancellationToken cancellationToken = default)
    {
        var trimmed = query.Trim();
        var results = await _stocks.SearchAsync(trimmed, cancellationToken: cancellationToken);

        if (results.Count == 0 && IsTickerFormat(trimmed))
        {
            try
            {
                var fetched = await EnsureStockInternalAsync(trimmed.ToUpper(), cancellationToken);
                results = [fetched];
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch unknown ticker {Ticker} from ML", trimmed);
                return [];
            }
        }

        var stockIds = results.Select(s => s.Id).ToList();
        var latestPrices = await _prices.GetLatestForStocksAsync(stockIds, cancellationToken);

        var watchlistItems = await _watchlist.GetByUserIdAsync(userId, cancellationToken);
        var watchedIds = watchlistItems.Select(w => w.StockId).ToHashSet();

        return results.Select(stock => new StockSearchResultDto
        {
            Ticker = stock.Ticker,
            Name = stock.Name,
            Sector = stock.Sector,
            LatestClose = latestPrices.GetValueOrDefault(stock.Id)?.Close,
            IsInWatchlist = watchedIds.Contains(stock.Id)
        }).ToList();
    }

    public async Task<StockDetailDto> GetDetailAsync(string ticker, CancellationToken cancellationToken = default)
    {
        var stock = await _stocks.GetByTickerAsync(ticker.ToUpper(), cancellationToken)
            ?? throw new NotFoundException($"Stock '{ticker.ToUpper()}' not found.");

        var prices = await _prices.GetAllAsync(stock.Id, cancellationToken);

        // Seeded stocks have no prices — fetch from ML on first access
        if (prices.Count == 0)
        {
            _logger.LogInformation("Stock {Ticker} has no prices — fetching from ML service", ticker);
            try
            {
                var data = await _ml.GetStockDataAsync(ticker.ToUpper(), "5y", cancellationToken);
                if (data != null && data.Data.Count > 0)
                {
                    var newPrices = StockPriceMapper.ToEntities(stock.Id, data.Data);
                    await _prices.UpsertRangeAsync(stock.Id, newPrices, cancellationToken);

                    if (string.IsNullOrEmpty(stock.Name) && !string.IsNullOrEmpty(data.Name))
                        stock.Name = data.Name;
                    if (string.IsNullOrEmpty(stock.Sector) && !string.IsNullOrEmpty(data.Sector))
                        stock.Sector = data.Sector;
                    stock.LastUpdatedAt = DateTime.UtcNow;
                    await _stocks.UpdateAsync(stock, cancellationToken);

                    prices = await _prices.GetAllAsync(stock.Id, cancellationToken);
                    _logger.LogInformation("Fetched {Count} prices for {Ticker}", prices.Count, ticker);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch prices for seeded stock {Ticker}", ticker);
            }
        }

        return new StockDetailDto
        {
            Ticker = stock.Ticker,
            Name = stock.Name,
            Sector = stock.Sector,
            LastUpdatedAt = stock.LastUpdatedAt,
            Prices = prices.Select(p => new PricePointDto
            {
                Date = p.Date.ToString("yyyy-MM-dd"),
                Open = p.Open,
                High = p.High,
                Low = p.Low,
                Close = p.Close,
                Volume = p.Volume
            }).ToList()
        };
    }

    public async Task<List<StockOverviewDto>> GetAllOverviewAsync(
        CancellationToken cancellationToken = default)
    {
        var allStocks = await _stocks.GetAllAsync(cancellationToken);
        if (allStocks.Count < 499)
        {
            await SeedMissingStocksAsync(allStocks, cancellationToken);
            allStocks = await _stocks.GetAllAsync(cancellationToken);
        }

        var stockIds = allStocks.Select(s => s.Id).ToList();

        var latestPricesMap = await _prices.GetLastNForStocksAsync(stockIds, 2, cancellationToken);

        var predictionsMap = await _predictions.GetValidForStocksAsync(
            stockIds, Domain.Enums.Horizon.ThreeMonths, cancellationToken);

        return allStocks.Select(stock =>
        {
            decimal? latestClose = null;
            double? change1dPct = null;

            if (latestPricesMap.TryGetValue(stock.Id, out var pxList) && pxList.Count > 0)
            {
                var sorted = pxList.OrderByDescending(p => p.Date).ToList();
                latestClose = sorted[0].Close;
                if (sorted.Count > 1 && sorted[1].Close != 0)
                    change1dPct = (double)((sorted[0].Close - sorted[1].Close) / sorted[1].Close * 100);
            }

            string? signal = null;
            double? confidence = null;
            if (predictionsMap.TryGetValue(stock.Id, out var pred))
            {
                signal = pred.Signal switch
                {
                    Domain.Enums.TradingSignal.StrongBuy => "Strong Buy",
                    Domain.Enums.TradingSignal.StrongSell => "Strong Sell",
                    _ => pred.Signal.ToString()
                };
                confidence = pred.Confidence;
            }

            return new StockOverviewDto
            {
                Ticker = stock.Ticker,
                Name = stock.Name,
                Sector = stock.Sector,
                LatestClose = latestClose,
                Change1dPct = change1dPct,
                LatestSignal = signal,
                SignalConfidence = confidence,
            };
        }).ToList();
    }

    private async Task SeedMissingStocksAsync(
        List<Domain.Entities.Stock> existing,
        CancellationToken cancellationToken)
    {
        var names = await _ml.GetTickerNamesAsync(cancellationToken);
        if (names == null || names.Count == 0)
        {
            _logger.LogWarning("Could not seed stocks — ML /names unavailable");
            return;
        }

        var existingTickers = existing.Select(s => s.Ticker).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var toAdd = names
            .Where(kv => !existingTickers.Contains(kv.Key))
            .Select(kv => new Domain.Entities.Stock
            {
                Id = Guid.NewGuid(),
                Ticker = kv.Key,
                Name = kv.Value.Name,
                Sector = kv.Value.Sector,
                LastUpdatedAt = DateTime.UtcNow,
            })
            .ToList();

        if (toAdd.Count > 0)
        {
            await _stocks.AddRangeAsync(toAdd, cancellationToken);
            _logger.LogInformation("Seeded {Count} stocks from ML /names endpoint", toAdd.Count);
        }
    }

    public async Task<Guid> EnsureStockExistsAsync(string ticker, CancellationToken cancellationToken = default)
    {
        var stock = await EnsureStockInternalAsync(ticker, cancellationToken);
        return stock.Id;
    }

    private async Task<Stock> EnsureStockInternalAsync(string ticker, CancellationToken cancellationToken)
    {
        ticker = ticker.ToUpper();

        var existing = await _stocks.GetByTickerAsync(ticker, cancellationToken);
        if (existing != null)
        {
            // Seeded stocks may have no prices — fetch them on first access
            var latestPrice = await _prices.GetLatestAsync(existing.Id, cancellationToken);
            if (latestPrice != null) return existing;

            _logger.LogInformation("Stock {Ticker} exists but has no prices — fetching from ML", ticker);
            try
            {
                var freshData = await _ml.GetStockDataAsync(ticker, "5y", cancellationToken);
                if (freshData != null && freshData.Data.Count > 0)
                {
                    var newPrices = StockPriceMapper.ToEntities(existing.Id, freshData.Data);
                    await _prices.UpsertRangeAsync(existing.Id, newPrices, cancellationToken);

                    if (string.IsNullOrEmpty(existing.Name) && !string.IsNullOrEmpty(freshData.Name))
                        existing.Name = freshData.Name;
                    if (string.IsNullOrEmpty(existing.Sector) && !string.IsNullOrEmpty(freshData.Sector))
                        existing.Sector = freshData.Sector;
                    existing.LastUpdatedAt = DateTime.UtcNow;
                    await _stocks.UpdateAsync(existing, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch prices for seeded stock {Ticker}", ticker);
            }
            return existing;
        }

        _logger.LogInformation("Fetching new stock {Ticker} from ML service", ticker);

        var data = await _ml.GetStockDataAsync(ticker, "5y", cancellationToken)
            ?? throw new NotFoundException($"Ticker '{ticker}' was not found in market data.");

        var stock = new Stock
        {
            Id = Guid.NewGuid(),
            Ticker = ticker,
            Name = data.Name,
            Sector = data.Sector,
            LastUpdatedAt = DateTime.UtcNow
        };

        var priceEntities = StockPriceMapper.ToEntities(stock.Id, data.Data);

        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
            await _stocks.AddAsync(stock, cancellationToken);
            await _prices.UpsertRangeAsync(stock.Id, priceEntities, cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        });

        _logger.LogInformation("Stored {Count} price rows for {Ticker}", priceEntities.Count, ticker);

        return stock;
    }

    private static bool IsTickerFormat(string query) =>
        query.Length is >= 1 and <= 10 && query.All(char.IsLetter);
}
