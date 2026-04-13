using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StockPredictor.Application.DTOs.Stocks;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.External;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Persistence;
using StockPredictor.Infrastructure.Services;

namespace StockPredictor.Tests.Unit.Services;

public class StockServiceTests
{
    private readonly Mock<IStockRepository> _stocks = new();
    private readonly Mock<IStockPriceRepository> _prices = new();
    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<IPredictionRepository> _predictions = new();
    private readonly Mock<IMlServiceClient> _ml = new();
    private readonly Mock<AppDbContext> _db;
    private readonly StockService _sut;

    public StockServiceTests()
    {
        // Mock the AppDbContext and its Database property for transaction support
        var dbOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        _db = new Mock<AppDbContext>(dbOptions);

        var mockFacade = new Mock<DatabaseFacade>(_db.Object);
        var mockStrategy = new Mock<IExecutionStrategy>();
        mockStrategy
            .Setup(s => s.ExecuteAsync(
                It.IsAny<object?>(),
                It.IsAny<Func<DbContext, object?, CancellationToken, Task<object?>>>(),
                It.IsAny<Func<DbContext, object?, CancellationToken, Task<ExecutionResult<object?>>>>(),
                It.IsAny<CancellationToken>()))
            .Returns<object?, Func<DbContext, object?, CancellationToken, Task<object?>>, Func<DbContext, object?, CancellationToken, Task<ExecutionResult<object?>>>, CancellationToken>(
                (state, operation, verifySucceeded, ct) => operation(_db.Object, state, ct));

        mockFacade.Setup(f => f.CreateExecutionStrategy()).Returns(mockStrategy.Object);

        var mockTransaction = new Mock<IDbContextTransaction>();
        mockFacade
            .Setup(f => f.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockTransaction.Object);

        _db.Setup(d => d.Database).Returns(mockFacade.Object);

        _sut = new StockService(
            _stocks.Object, _prices.Object, _watchlist.Object,
            _predictions.Object, _ml.Object, _db.Object,
            NullLogger<StockService>.Instance);
    }

    // --- SearchAsync ---

    [Fact]
    public async Task SearchAsync_DbHasResults_ReturnsWithWatchlistFlag()
    {
        var userId = Guid.NewGuid();
        var stockId = Guid.NewGuid();
        var stock = new Stock { Id = stockId, Ticker = "AAPL", Name = "Apple Inc." };

        _stocks.Setup(s => s.SearchAsync("AAPL", 20, It.IsAny<CancellationToken>()))
            .ReturnsAsync([stock]);
        _prices.Setup(p => p.GetLatestForStocksAsync(It.IsAny<List<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, StockPrice>
            {
                [stockId] = new() { Close = 175.50m }
            });
        _watchlist.Setup(w => w.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([new WatchlistItem { StockId = stockId }]);

        var results = await _sut.SearchAsync("AAPL", userId);

        results.Should().ContainSingle();
        results[0].Ticker.Should().Be("AAPL");
        results[0].LatestClose.Should().Be(175.50m);
        results[0].IsInWatchlist.Should().BeTrue();
    }

    [Fact]
    public async Task SearchAsync_NoDbResults_TickerFormat_FetchesFromMl()
    {
        var userId = Guid.NewGuid();

        // First call returns empty (not in DB)
        _stocks.Setup(s => s.SearchAsync("NVDA", 20, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        // EnsureStockInternal: GetByTickerAsync returns null, then ML fetches
        _stocks.Setup(s => s.GetByTickerAsync("NVDA", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Stock?)null);
        _ml.Setup(m => m.GetStockDataAsync("NVDA", "5y", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MlStockDataResponse("NVDA", "5y", 1, [
                new MlDataPoint("2024-01-01", 500, 510, 490, 505, 1000000)
            ], "NVIDIA Corp", "Technology"));
        _stocks.Setup(s => s.AddAsync(It.IsAny<Stock>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _prices.Setup(p => p.UpsertRangeAsync(It.IsAny<Guid>(), It.IsAny<List<StockPrice>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        _prices.Setup(p => p.GetLatestForStocksAsync(It.IsAny<List<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, StockPrice>());
        _watchlist.Setup(w => w.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var results = await _sut.SearchAsync("NVDA", userId);

        results.Should().ContainSingle();
        results[0].Ticker.Should().Be("NVDA");
        results[0].Name.Should().Be("NVIDIA Corp");
        _ml.Verify(m => m.GetStockDataAsync("NVDA", "5y", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SearchAsync_NoDbResults_NotTickerFormat_ReturnsEmpty()
    {
        var userId = Guid.NewGuid();

        // "apple inc" has spaces → not ticker format, should NOT call ML
        _stocks.Setup(s => s.SearchAsync("apple inc", 20, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _prices.Setup(p => p.GetLatestForStocksAsync(It.IsAny<List<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<Guid, StockPrice>());
        _watchlist.Setup(w => w.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var results = await _sut.SearchAsync("apple inc", userId);

        results.Should().BeEmpty();
        _ml.Verify(m => m.GetStockDataAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SearchAsync_MlFetchFails_ReturnsEmpty()
    {
        var userId = Guid.NewGuid();

        _stocks.Setup(s => s.SearchAsync("XYZ", 20, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _stocks.Setup(s => s.GetByTickerAsync("XYZ", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Stock?)null);
        _ml.Setup(m => m.GetStockDataAsync("XYZ", "5y", It.IsAny<CancellationToken>()))
            .ReturnsAsync((MlStockDataResponse?)null);

        var results = await _sut.SearchAsync("XYZ", userId);

        results.Should().BeEmpty();
    }

    // --- GetDetailAsync ---

    [Fact]
    public async Task GetDetailAsync_StockExists_ReturnsPrices()
    {
        var stockId = Guid.NewGuid();
        var stock = new Stock { Id = stockId, Ticker = "AAPL", Name = "Apple Inc.", LastUpdatedAt = DateTime.UtcNow };

        _stocks.Setup(s => s.GetByTickerAsync("AAPL", It.IsAny<CancellationToken>()))
            .ReturnsAsync(stock);
        _prices.Setup(p => p.GetAllAsync(stockId, It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                new StockPrice { Date = new DateOnly(2024, 1, 1), Open = 100m, High = 110m, Low = 95m, Close = 105m, Volume = 5000 }
            ]);

        var result = await _sut.GetDetailAsync("aapl");

        result.Ticker.Should().Be("AAPL");
        result.Prices.Should().ContainSingle();
        result.Prices[0].Date.Should().Be("2024-01-01");
    }

    [Fact]
    public async Task GetDetailAsync_StockNotFound_ThrowsNotFoundException()
    {
        _stocks.Setup(s => s.GetByTickerAsync("FAKE", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Stock?)null);

        await _sut.Invoking(s => s.GetDetailAsync("fake"))
            .Should().ThrowAsync<NotFoundException>();
    }

    // --- EnsureStockExistsAsync ---

    [Fact]
    public async Task EnsureStockExistsAsync_AlreadyExists_ReturnsId()
    {
        var stockId = Guid.NewGuid();
        _stocks.Setup(s => s.GetByTickerAsync("AAPL", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Stock { Id = stockId, Ticker = "AAPL" });

        var result = await _sut.EnsureStockExistsAsync("AAPL");

        result.Should().Be(stockId);
        _ml.Verify(m => m.GetStockDataAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task EnsureStockExistsAsync_MlReturnsNull_ThrowsNotFoundException()
    {
        _stocks.Setup(s => s.GetByTickerAsync("FAKE", It.IsAny<CancellationToken>()))
            .ReturnsAsync((Stock?)null);
        _ml.Setup(m => m.GetStockDataAsync("FAKE", "5y", It.IsAny<CancellationToken>()))
            .ReturnsAsync((MlStockDataResponse?)null);

        await _sut.Invoking(s => s.EnsureStockExistsAsync("FAKE"))
            .Should().ThrowAsync<NotFoundException>()
            .WithMessage("*not found*");
    }
}
