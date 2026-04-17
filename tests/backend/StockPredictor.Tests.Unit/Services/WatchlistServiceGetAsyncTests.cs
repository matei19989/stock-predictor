using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Application.Interfaces.Services;
using StockPredictor.Domain.Entities;
using StockPredictor.Domain.Enums;
using StockPredictor.Infrastructure.Services;

namespace StockPredictor.Tests.Unit.Services;

public class WatchlistServiceGetAsyncTests
{
    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<IStockRepository> _stocks = new();
    private readonly Mock<IStockPriceRepository> _prices = new();
    private readonly Mock<IPredictionRepository> _predictions = new();
    private readonly Mock<IStockService> _stockService = new();
    private readonly Mock<IUserPredictionLogRepository> _userLogRepo = new();
    private readonly WatchlistService _sut;

    public WatchlistServiceGetAsyncTests()
    {
        _sut = new WatchlistService(
            _watchlist.Object, _stocks.Object, _prices.Object,
            _predictions.Object, _stockService.Object,
            _userLogRepo.Object, NullLogger<WatchlistService>.Instance);
    }

    [Fact]
    public async Task GetAsync_EmptyWatchlist_ReturnsEmpty()
    {
        var userId = Guid.NewGuid();
        _watchlist.Setup(w => w.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var result = await _sut.GetAsync(userId);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAsync_WithPrices_CalculatesChange1dPct()
    {
        var userId = Guid.NewGuid();
        var stockId = Guid.NewGuid();
        var stock = new Stock { Id = stockId, Ticker = "AAPL", Name = "Apple Inc." };
        var item = new WatchlistItem { StockId = stockId, Stock = stock, AddedAt = DateTime.UtcNow };

        _watchlist.Setup(w => w.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([item]);

        // Latest = 110, Previous = 100 → change = +10%
        _prices.Setup(p => p.GetLastNForStocksAsync(It.IsAny<List<Guid>>(), 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, List<StockPrice>>
            {
                [stockId] =
                [
                    new StockPrice { Close = 110m },  // latest (index 0)
                    new StockPrice { Close = 100m }   // previous (index 1)
                ]
            });

        _predictions.Setup(p => p.GetValidForStocksAsync(It.IsAny<List<Guid>>(), Horizon.ThreeMonths, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, Prediction>());

        var result = await _sut.GetAsync(userId);

        result.Should().ContainSingle();
        result[0].Ticker.Should().Be("AAPL");
        result[0].LatestClose.Should().Be(110m);
        result[0].PreviousClose.Should().Be(100m);
        result[0].Change1dPct.Should().Be(10m);
    }

    [Fact]
    public async Task GetAsync_NegativePriceChange_ReturnsNegativePercent()
    {
        var userId = Guid.NewGuid();
        var stockId = Guid.NewGuid();
        var stock = new Stock { Id = stockId, Ticker = "TSLA" };
        var item = new WatchlistItem { StockId = stockId, Stock = stock, AddedAt = DateTime.UtcNow };

        _watchlist.Setup(w => w.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([item]);

        // Latest = 90, Previous = 100 → change = -10%
        _prices.Setup(p => p.GetLastNForStocksAsync(It.IsAny<List<Guid>>(), 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, List<StockPrice>>
            {
                [stockId] =
                [
                    new StockPrice { Close = 90m },
                    new StockPrice { Close = 100m }
                ]
            });

        _predictions.Setup(p => p.GetValidForStocksAsync(It.IsAny<List<Guid>>(), Horizon.ThreeMonths, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, Prediction>());

        var result = await _sut.GetAsync(userId);

        result[0].Change1dPct.Should().Be(-10m);
    }

    [Fact]
    public async Task GetAsync_OnlyOnePrice_Change1dPctIsNull()
    {
        var userId = Guid.NewGuid();
        var stockId = Guid.NewGuid();
        var stock = new Stock { Id = stockId, Ticker = "MSFT" };
        var item = new WatchlistItem { StockId = stockId, Stock = stock, AddedAt = DateTime.UtcNow };

        _watchlist.Setup(w => w.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([item]);

        _prices.Setup(p => p.GetLastNForStocksAsync(It.IsAny<List<Guid>>(), 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, List<StockPrice>>
            {
                [stockId] = [new StockPrice { Close = 400m }]
            });

        _predictions.Setup(p => p.GetValidForStocksAsync(It.IsAny<List<Guid>>(), Horizon.ThreeMonths, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, Prediction>());

        var result = await _sut.GetAsync(userId);

        result[0].LatestClose.Should().Be(400m);
        result[0].Change1dPct.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_WithValidPrediction_IncludesSignal()
    {
        var userId = Guid.NewGuid();
        var stockId = Guid.NewGuid();
        var stock = new Stock { Id = stockId, Ticker = "GOOGL" };
        var item = new WatchlistItem { StockId = stockId, Stock = stock, AddedAt = DateTime.UtcNow };

        _watchlist.Setup(w => w.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([item]);

        _prices.Setup(p => p.GetLastNForStocksAsync(It.IsAny<List<Guid>>(), 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, List<StockPrice>>());

        _predictions.Setup(p => p.GetValidForStocksAsync(It.IsAny<List<Guid>>(), Horizon.ThreeMonths, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, Prediction>
            {
                [stockId] = new Prediction
                {
                    Signal = TradingSignal.Buy,
                    Confidence = 0.42,
                    ExpiresAt = DateTime.UtcNow.AddHours(12)
                }
            });

        _userLogRepo.Setup(r => r.ExistsAsync(userId, stockId, Horizon.ThreeMonths, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.GetAsync(userId);

        result[0].LatestSignal.Should().Be("Buy");
        result[0].SignalConfidence.Should().Be(0.42);
    }

    [Fact]
    public async Task GetAsync_PreviousCloseZero_Change1dPctIsNull()
    {
        var userId = Guid.NewGuid();
        var stockId = Guid.NewGuid();
        var stock = new Stock { Id = stockId, Ticker = "TEST" };
        var item = new WatchlistItem { StockId = stockId, Stock = stock, AddedAt = DateTime.UtcNow };

        _watchlist.Setup(w => w.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([item]);

        _prices.Setup(p => p.GetLastNForStocksAsync(It.IsAny<List<Guid>>(), 2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, List<StockPrice>>
            {
                [stockId] =
                [
                    new StockPrice { Close = 10m },
                    new StockPrice { Close = 0m }  // division by zero guard
                ]
            });

        _predictions.Setup(p => p.GetValidForStocksAsync(It.IsAny<List<Guid>>(), Horizon.ThreeMonths, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, Prediction>());

        var result = await _sut.GetAsync(userId);

        result[0].Change1dPct.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_DoesNotExposeAnotherUsersPrediction()
    {
        var userB = Guid.NewGuid();
        var aaplId = Guid.NewGuid();
        var aapl = new Stock { Id = aaplId, Ticker = "AAPL", Name = "Apple" };
        var watchlistItemB = new WatchlistItem
        {
            Id = Guid.NewGuid(), UserId = userB, StockId = aaplId, AddedAt = DateTime.UtcNow, Stock = aapl,
        };

        _watchlist.Setup(r => r.GetByUserIdAsync(userB, It.IsAny<CancellationToken>()))
                  .ReturnsAsync(new List<WatchlistItem> { watchlistItemB });
        _prices.Setup(r => r.GetLastNForStocksAsync(It.IsAny<List<Guid>>(), 2, It.IsAny<CancellationToken>()))
              .ReturnsAsync(new Dictionary<Guid, List<StockPrice>>());
        _predictions.Setup(r => r.GetValidForStocksAsync(It.IsAny<List<Guid>>(), Horizon.ThreeMonths, It.IsAny<CancellationToken>()))
                   .ReturnsAsync(new Dictionary<Guid, Prediction>
                   {
                       [aaplId] = new Prediction { StockId = aaplId, Horizon = Horizon.ThreeMonths, Signal = TradingSignal.Buy, Confidence = 0.7 }
                   });
        _userLogRepo.Setup(r => r.ExistsAsync(userB, aaplId, Horizon.ThreeMonths, It.IsAny<CancellationToken>()))
                    .ReturnsAsync(false);

        var result = await _sut.GetAsync(userB);

        result.Should().HaveCount(1);
        result[0].Ticker.Should().Be("AAPL");
        result[0].LatestSignal.Should().BeNull();
        result[0].SignalConfidence.Should().BeNull();
    }
}
