using Microsoft.Extensions.Logging;
using StockPredictor.Application.DTOs.Predictions;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.External;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Application.Interfaces.Services;
using StockPredictor.Domain.Entities;
using StockPredictor.Domain.Enums;

namespace StockPredictor.Infrastructure.Services;

public class PredictionService : IPredictionService
{
    private static readonly HashSet<Horizon> SupportedHorizons = [Horizon.ThreeMonths, Horizon.SixMonths, Horizon.OneYear];

    private readonly IPredictionRepository _predictions;
    private readonly IStockRepository _stocks;
    private readonly IMlServiceClient _ml;
    private readonly IUserPredictionLogRepository _userLogs;
    private readonly ILogger<PredictionService> _logger;

    public PredictionService(
        IPredictionRepository predictions,
        IStockRepository stocks,
        IMlServiceClient ml,
        IUserPredictionLogRepository userLogs,
        ILogger<PredictionService> logger)
    {
        _predictions = predictions;
        _stocks = stocks;
        _ml = ml;
        _userLogs = userLogs;
        _logger = logger;
    }

    public async Task<PredictionDto> GetOrCreateAsync(string ticker, string horizon, CancellationToken cancellationToken = default)
    {
        var horizonEnum = HorizonExtensions.ParseHorizon(horizon);

        if (!SupportedHorizons.Contains(horizonEnum))
            throw new HorizonNotSupportedException(horizon);

        ticker = ticker.ToUpper();

        var stock = await _stocks.GetByTickerAsync(ticker, cancellationToken)
            ?? throw new NotFoundException($"Stock '{ticker}' not found. Add it to your watchlist first.");

        var cached = await _predictions.GetValidAsync(stock.Id, horizonEnum, cancellationToken);
        if (cached != null)
        {
            _logger.LogInformation("Cache hit: returning stored prediction for {Ticker} {Horizon}", ticker, horizon);
            return MapToDto(cached, ticker);
        }

        _logger.LogInformation("Cache miss: calling ML service for {Ticker} {Horizon}", ticker, horizon);

        var result = await _ml.PredictAsync(ticker, horizon, cancellationToken);

        var prediction = new Prediction
        {
            Id = Guid.NewGuid(),
            StockId = stock.Id,
            Horizon = horizonEnum,
            Signal = TradingSignalExtensions.ParseTradingSignal(result.Signal),
            Confidence = result.Confidence,
            Probabilities = result.Probabilities,
            FeaturesUsed = result.FeaturesUsed,
            LowConfidence = result.LowConfidence,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        await _predictions.AddAsync(prediction, cancellationToken);
        return MapToDto(prediction, ticker);
    }

    public async Task<List<UserPredictionDto>> GetUserPredictedAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var logs = await _userLogs.GetAllForUserAsync(userId, cancellationToken);
        var result = new List<UserPredictionDto>(capacity: logs.Count);

        foreach (var log in logs)
        {
            var cache = await _predictions.GetLatestAsync(log.StockId, log.Horizon, cancellationToken);
            var isExpired = cache == null || cache.ExpiresAt < DateTime.UtcNow;

            result.Add(new UserPredictionDto
            {
                Ticker = log.Stock.Ticker,
                Name = log.Stock.Name,
                Horizon = log.Horizon.ToWireString(),
                Signal = isExpired ? null : cache!.Signal.ToWireString(),
                Confidence = isExpired ? null : cache!.Confidence,
                PredictedAt = log.RequestedAt,
                ExpiresAt = isExpired ? null : cache!.ExpiresAt,
                IsExpired = isExpired,
            });
        }

        return result;
    }

    public async Task<PredictionDto?> GetLatestForUserAsync(Guid userId, string ticker, string horizon, CancellationToken cancellationToken = default)
    {
        var horizonEnum = HorizonExtensions.ParseHorizon(horizon);
        var upperTicker = ticker.ToUpper();

        var stock = await _stocks.GetByTickerAsync(upperTicker, cancellationToken);
        if (stock == null) return null;

        var userHasLog = await _userLogs.ExistsAsync(userId, stock.Id, horizonEnum, cancellationToken);
        if (!userHasLog) return null;

        var prediction = await _predictions.GetLatestAsync(stock.Id, horizonEnum, cancellationToken);
        return prediction == null ? null : MapToDto(prediction, upperTicker);
    }

    private static PredictionDto MapToDto(Prediction p, string ticker) => new()
    {
        Ticker = ticker,
        Horizon = p.Horizon.ToWireString(),
        Signal = p.Signal.ToWireString(),
        Confidence = p.Confidence,
        Probabilities = p.Probabilities,
        FeaturesUsed = p.FeaturesUsed,
        LowConfidence = p.LowConfidence,
        CachedAt = p.CreatedAt,
        ExpiresAt = p.ExpiresAt
    };
}
