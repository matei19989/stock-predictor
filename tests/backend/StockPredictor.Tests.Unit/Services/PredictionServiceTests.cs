using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.External;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Domain.Enums;
using StockPredictor.Infrastructure.Services;

namespace StockPredictor.Tests.Unit.Services;

public class PredictionServiceTests
{
    private readonly Mock<IPredictionRepository> _predictions = new();
    private readonly Mock<IStockRepository> _stocks = new();
    private readonly Mock<IMlServiceClient> _ml = new();
    private readonly Mock<IUserPredictionLogRepository> _userLogRepo = new();
    private readonly PredictionService _sut;

    public PredictionServiceTests()
    {
        _sut = new PredictionService(_predictions.Object, _stocks.Object, _ml.Object,
            _userLogRepo.Object, NullLogger<PredictionService>.Instance);
    }

    [Fact]
    public async Task GetOrCreateAsync_CacheHit_ReturnsCachedAndSkipsMl()
    {
        var stock = new Stock { Id = Guid.NewGuid(), Ticker = "AAPL" };
        var cached = new Prediction
        {
            Id = Guid.NewGuid(),
            StockId = stock.Id,
            Horizon = Horizon.ThreeMonths,
            Signal = TradingSignal.Buy,
            Confidence = 0.7,
            Probabilities = new Dictionary<string, double> { ["Buy"] = 0.7, ["Hold"] = 0.3 },
            FeaturesUsed = 22,
            LowConfidence = false,
            CreatedAt = DateTime.UtcNow.AddHours(-1),
            ExpiresAt = DateTime.UtcNow.AddHours(23)
        };

        _stocks.Setup(r => r.GetByTickerAsync("AAPL", It.IsAny<CancellationToken>())).ReturnsAsync(stock);
        _predictions.Setup(r => r.GetValidAsync(stock.Id, Horizon.ThreeMonths, It.IsAny<CancellationToken>())).ReturnsAsync(cached);

        var result = await _sut.GetOrCreateAsync("AAPL", "3m");

        result.Signal.Should().Be("Buy");
        result.Confidence.Should().BeApproximately(0.7, 0.001);
        _ml.Verify(m => m.PredictAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetOrCreateAsync_CacheMiss_CallsMlAndPersists()
    {
        var stock = new Stock { Id = Guid.NewGuid(), Ticker = "AAPL" };
        var mlResponse = new MlPredictResponse(
            "AAPL", "3m", "Buy", 0.65,
            new Dictionary<string, double> { ["Buy"] = 0.65, ["Hold"] = 0.35 },
            22, DateTime.UtcNow.ToString("o"), false);

        _stocks.Setup(r => r.GetByTickerAsync("AAPL", It.IsAny<CancellationToken>())).ReturnsAsync(stock);
        _predictions.Setup(r => r.GetValidAsync(stock.Id, Horizon.ThreeMonths, It.IsAny<CancellationToken>())).ReturnsAsync((Prediction?)null);
        _ml.Setup(m => m.PredictAsync("AAPL", "3m", It.IsAny<CancellationToken>())).ReturnsAsync(mlResponse);
        _predictions.Setup(r => r.AddAsync(It.IsAny<Prediction>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        var result = await _sut.GetOrCreateAsync("AAPL", "3m");

        result.Signal.Should().Be("Buy");
        result.Confidence.Should().BeApproximately(0.65, 0.001);
        result.ExpiresAt.Should().BeCloseTo(DateTime.UtcNow.AddHours(24), TimeSpan.FromMinutes(1));
        _predictions.Verify(r => r.AddAsync(It.IsAny<Prediction>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetOrCreateAsync_StockNotFound_ThrowsNotFoundException()
    {
        _stocks.Setup(r => r.GetByTickerAsync("UNKNOWN", It.IsAny<CancellationToken>())).ReturnsAsync((Stock?)null);

        await _sut.Invoking(s => s.GetOrCreateAsync("UNKNOWN", "3m"))
                  .Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task GetLatestForUserAsync_ReturnsNull_WhenUserHasNoLog()
    {
        var userId = Guid.NewGuid();
        var stock = new Stock { Id = Guid.NewGuid(), Ticker = "AAPL" };
        _stocks.Setup(r => r.GetByTickerAsync("AAPL", It.IsAny<CancellationToken>()))
                  .ReturnsAsync(stock);

        _userLogRepo.Setup(r => r.ExistsAsync(userId, stock.Id, Horizon.ThreeMonths, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(false);

        var result = await _sut.GetLatestForUserAsync(userId, "AAPL", "3m");

        result.Should().BeNull();
        _predictions.Verify(
            r => r.GetLatestAsync(It.IsAny<Guid>(), It.IsAny<Horizon>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GetLatestForUserAsync_ReturnsDto_WhenUserHasLogAndCacheIsValid()
    {
        var userId = Guid.NewGuid();
        var stock = new Stock { Id = Guid.NewGuid(), Ticker = "AAPL" };
        var prediction = new Prediction
        {
            Id = Guid.NewGuid(), StockId = stock.Id, Horizon = Horizon.ThreeMonths,
            Signal = TradingSignal.Buy, Confidence = 0.42,
            Probabilities = new Dictionary<string, double> { ["Buy"] = 0.42 },
            FeaturesUsed = 22, LowConfidence = false,
            CreatedAt = DateTime.UtcNow.AddMinutes(-5),
            ExpiresAt = DateTime.UtcNow.AddHours(23),
        };

        _stocks.Setup(r => r.GetByTickerAsync("AAPL", It.IsAny<CancellationToken>()))
                   .ReturnsAsync(stock);
        _userLogRepo.Setup(r => r.ExistsAsync(userId, stock.Id, Horizon.ThreeMonths, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(true);
        _predictions.Setup(r => r.GetLatestAsync(stock.Id, Horizon.ThreeMonths, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(prediction);

        var result = await _sut.GetLatestForUserAsync(userId, "AAPL", "3m");

        result.Should().NotBeNull();
        result!.Ticker.Should().Be("AAPL");
        result.Signal.Should().Be("Buy");
        result.Confidence.Should().Be(0.42);
    }

    [Fact]
    public async Task GetLatestForUserAsync_ReturnsNull_WhenUserLogExistsForDifferentHorizon()
    {
        // User predicted AAPL/3m. They request AAPL/6m — no log for that horizon,
        // so the response must be null even if a shared 6m Prediction exists.
        var userId = Guid.NewGuid();
        var stock = new Stock { Id = Guid.NewGuid(), Ticker = "AAPL" };
        _stocks.Setup(r => r.GetByTickerAsync("AAPL", It.IsAny<CancellationToken>()))
                  .ReturnsAsync(stock);

        // Log exists for 3m, not 6m.
        _userLogRepo.Setup(r => r.ExistsAsync(userId, stock.Id, Horizon.ThreeMonths, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(true);
        _userLogRepo.Setup(r => r.ExistsAsync(userId, stock.Id, Horizon.SixMonths, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(false);

        var result = await _sut.GetLatestForUserAsync(userId, "AAPL", "6m");

        result.Should().BeNull();
        // Must not touch the shared cache either.
        _predictions.Verify(
            r => r.GetLatestAsync(It.IsAny<Guid>(), Horizon.SixMonths, It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GetUserPredictedAsync_ReturnsRowPerLog_WithCacheWhenValid()
    {
        var userId = Guid.NewGuid();
        var aapl = new Stock { Id = Guid.NewGuid(), Ticker = "AAPL", Name = "Apple" };
        var msft = new Stock { Id = Guid.NewGuid(), Ticker = "MSFT", Name = "Microsoft" };

        var logs = new List<UserPredictionLog>
        {
            new() { UserId = userId, StockId = aapl.Id, Horizon = Horizon.ThreeMonths, RequestedAt = DateTime.UtcNow.AddMinutes(-10), Stock = aapl },
            new() { UserId = userId, StockId = msft.Id, Horizon = Horizon.SixMonths,   RequestedAt = DateTime.UtcNow.AddMinutes(-5),  Stock = msft },
        };
        _userLogRepo.Setup(r => r.GetAllForUserAsync(userId, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(logs);

        _predictions.Setup(r => r.GetLatestAsync(aapl.Id, Horizon.ThreeMonths, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new Prediction
                    {
                        StockId = aapl.Id, Horizon = Horizon.ThreeMonths,
                        Signal = TradingSignal.Buy, Confidence = 0.5,
                        ExpiresAt = DateTime.UtcNow.AddHours(20),
                    });
        _predictions.Setup(r => r.GetLatestAsync(msft.Id, Horizon.SixMonths, It.IsAny<CancellationToken>()))
                    .ReturnsAsync((Prediction?)null);

        var result = await _sut.GetUserPredictedAsync(userId);

        result.Should().HaveCount(2);
        result[0].Ticker.Should().Be("AAPL");
        result[0].Horizon.Should().Be("3m");
        result[0].Signal.Should().Be("Buy");
        result[0].IsExpired.Should().BeFalse();

        result[1].Ticker.Should().Be("MSFT");
        result[1].Horizon.Should().Be("6m");
        result[1].Signal.Should().BeNull();
        result[1].IsExpired.Should().BeTrue();
    }

    [Fact]
    public async Task GetUserPredictedAsync_ReturnsEmpty_WhenUserHasNoLogs()
    {
        var userId = Guid.NewGuid();
        _userLogRepo.Setup(r => r.GetAllForUserAsync(userId, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new List<UserPredictionLog>());

        var result = await _sut.GetUserPredictedAsync(userId);

        result.Should().BeEmpty();
        _predictions.Verify(
            r => r.GetLatestAsync(It.IsAny<Guid>(), It.IsAny<Horizon>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
