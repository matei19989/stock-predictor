using Microsoft.Extensions.Logging;
using StockPredictor.Application.DTOs.Watchlist;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Application.Interfaces.Services;
using StockPredictor.Domain.Constants;
using StockPredictor.Domain.Entities;
using StockPredictor.Domain.Enums;

namespace StockPredictor.Infrastructure.Services;

public class WatchlistService : IWatchlistService
{
    private readonly IWatchlistRepository _watchlist;
    private readonly IStockRepository _stocks;
    private readonly IStockPriceRepository _prices;
    private readonly IPredictionRepository _predictions;
    private readonly IStockService _stockService;
    private readonly IUserPredictionLogRepository _userLogs;
    private readonly ILogger<WatchlistService> _logger;

    public WatchlistService(
        IWatchlistRepository watchlist,
        IStockRepository stocks,
        IStockPriceRepository prices,
        IPredictionRepository predictions,
        IStockService stockService,
        IUserPredictionLogRepository userLogs,
        ILogger<WatchlistService> logger)
    {
        _watchlist = watchlist;
        _stocks = stocks;
        _prices = prices;
        _predictions = predictions;
        _stockService = stockService;
        _userLogs = userLogs;
        _logger = logger;
    }

    public async Task<List<WatchlistItemDto>> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var items = await _watchlist.GetByUserIdAsync(userId, cancellationToken);
        if (items.Count == 0) return [];

        var stockIds = items.Select(i => i.StockId).ToList();
        var pricesByStock = await _prices.GetLastNForStocksAsync(stockIds, 2, cancellationToken);
        var predictionsByStock = await _predictions.GetValidForStocksAsync(stockIds, Horizon.ThreeMonths, cancellationToken);

        var userPredictedStockIds = new HashSet<Guid>();
        foreach (var stockId in stockIds)
        {
            if (await _userLogs.ExistsAsync(userId, stockId, Horizon.ThreeMonths, cancellationToken))
                userPredictedStockIds.Add(stockId);
        }

        return items.Select(item =>
        {
            var lastTwo = pricesByStock.GetValueOrDefault(item.StockId) ?? [];
            var latest = lastTwo.Count > 0 ? lastTwo[0] : null;
            var previous = lastTwo.Count > 1 ? lastTwo[1] : null;

            decimal? change1dPct = null;
            if (latest != null && previous != null && previous.Close != 0)
                change1dPct = (latest.Close - previous.Close) / previous.Close * 100;

            var prediction = userPredictedStockIds.Contains(item.StockId)
                ? predictionsByStock.GetValueOrDefault(item.StockId)
                : null;

            return new WatchlistItemDto
            {
                Ticker = item.Stock.Ticker,
                Name = item.Stock.Name,
                LatestClose = latest?.Close,
                PreviousClose = previous?.Close,
                Change1dPct = change1dPct,
                AddedAt = item.AddedAt,
                LatestSignal = prediction?.Signal.ToWireString(),
                SignalConfidence = prediction?.Confidence
            };
        }).ToList();
    }

    public async Task AddAsync(Guid userId, string ticker, CancellationToken cancellationToken = default)
    {
        var stockId = await _stockService.EnsureStockExistsAsync(ticker, cancellationToken);

        if (await _watchlist.ExistsAsync(userId, stockId, cancellationToken))
            throw new ConflictException($"{ticker.ToUpper()} is already in your watchlist.");

        await _watchlist.AddAsync(new WatchlistItem
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StockId = stockId,
            AddedAt = DateTime.UtcNow
        }, cancellationToken);
    }

    public async Task RemoveAsync(Guid userId, string ticker, CancellationToken cancellationToken = default)
    {
        var stock = await _stocks.GetByTickerAsync(ticker.ToUpper(), cancellationToken)
            ?? throw new NotFoundException($"{ticker.ToUpper()} is not in your watchlist.");

        var item = await _watchlist.GetItemAsync(userId, stock.Id, cancellationToken)
            ?? throw new NotFoundException($"{ticker.ToUpper()} is not in your watchlist.");

        await _watchlist.RemoveAsync(item, cancellationToken);
    }

    public async Task SeedDefaultsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        foreach (var seedTicker in DefaultWatchlist.Tickers)
        {
            try
            {
                await AddAsync(userId, seedTicker, cancellationToken);
            }
            catch (ConflictException)
            {
                // Already in watchlist — fine
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not seed {Ticker} for user {UserId}", seedTicker, userId);
            }
        }
    }
}
