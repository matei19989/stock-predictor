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
    private readonly IMlServiceClient _ml;
    private readonly AppDbContext _db;
    private readonly ILogger<StockService> _logger;

    public StockService(
        IStockRepository stocks,
        IStockPriceRepository prices,
        IWatchlistRepository watchlist,
        IMlServiceClient ml,
        AppDbContext db,
        ILogger<StockService> logger)
    {
        _stocks = stocks;
        _prices = prices;
        _watchlist = watchlist;
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

    public async Task<Guid> EnsureStockExistsAsync(string ticker, CancellationToken cancellationToken = default)
    {
        var stock = await EnsureStockInternalAsync(ticker, cancellationToken);
        return stock.Id;
    }

    private async Task<Stock> EnsureStockInternalAsync(string ticker, CancellationToken cancellationToken)
    {
        ticker = ticker.ToUpper();

        var existing = await _stocks.GetByTickerAsync(ticker, cancellationToken);
        if (existing != null) return existing;

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
