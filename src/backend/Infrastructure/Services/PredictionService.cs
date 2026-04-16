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
    private readonly ILogger<PredictionService> _logger;

    public PredictionService(
        IPredictionRepository predictions,
        IStockRepository stocks,
        IMlServiceClient ml,
        ILogger<PredictionService> logger)
    {
        _predictions = predictions;
        _stocks = stocks;
        _ml = ml;
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

    public async Task<PredictionDto?> GetLatestAsync(string ticker, string horizon, CancellationToken cancellationToken = default)
    {
        var horizonEnum = HorizonExtensions.ParseHorizon(horizon);
        var stock = await _stocks.GetByTickerAsync(ticker.ToUpper(), cancellationToken);
        if (stock == null) return null;

        var prediction = await _predictions.GetLatestAsync(stock.Id, horizonEnum, cancellationToken);
        return prediction == null ? null : MapToDto(prediction, ticker.ToUpper());
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
