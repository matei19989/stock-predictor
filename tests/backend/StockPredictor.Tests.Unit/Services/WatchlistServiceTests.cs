using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Application.Interfaces.Services;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Services;

namespace StockPredictor.Tests.Unit.Services;

public class WatchlistServiceTests
{
    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<IStockRepository> _stocks = new();
    private readonly Mock<IStockPriceRepository> _prices = new();
    private readonly Mock<IPredictionRepository> _predictions = new();
    private readonly Mock<IStockService> _stockService = new();
    private readonly WatchlistService _sut;

    public WatchlistServiceTests()
    {
        _sut = new WatchlistService(
            _watchlist.Object, _stocks.Object, _prices.Object,
            _predictions.Object, _stockService.Object,
            NullLogger<WatchlistService>.Instance);
    }

    [Fact]
    public async Task AddAsync_WhenAlreadyInWatchlist_ThrowsConflictException()
    {
        var userId = Guid.NewGuid();
        var stockId = Guid.NewGuid();

        _stockService.Setup(s => s.EnsureStockExistsAsync("AAPL", It.IsAny<CancellationToken>())).ReturnsAsync(stockId);
        _watchlist.Setup(w => w.ExistsAsync(userId, stockId, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        await _sut.Invoking(s => s.AddAsync(userId, "AAPL"))
                  .Should().ThrowAsync<ConflictException>()
                  .WithMessage("*already in your watchlist*");
    }

    [Fact]
    public async Task AddAsync_NewStock_CallsRepositoryAdd()
    {
        var userId = Guid.NewGuid();
        var stockId = Guid.NewGuid();

        _stockService.Setup(s => s.EnsureStockExistsAsync("NVDA", It.IsAny<CancellationToken>())).ReturnsAsync(stockId);
        _watchlist.Setup(w => w.ExistsAsync(userId, stockId, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        _watchlist.Setup(w => w.AddAsync(It.IsAny<WatchlistItem>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        await _sut.AddAsync(userId, "NVDA");

        _watchlist.Verify(w => w.AddAsync(It.Is<WatchlistItem>(
            i => i.UserId == userId && i.StockId == stockId), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RemoveAsync_ItemNotInWatchlist_ThrowsNotFoundException()
    {
        var userId = Guid.NewGuid();
        var stock = new Stock { Id = Guid.NewGuid(), Ticker = "AAPL" };

        _stocks.Setup(s => s.GetByTickerAsync("AAPL", It.IsAny<CancellationToken>())).ReturnsAsync(stock);
        _watchlist.Setup(w => w.GetItemAsync(userId, stock.Id, It.IsAny<CancellationToken>())).ReturnsAsync((WatchlistItem?)null);

        await _sut.Invoking(s => s.RemoveAsync(userId, "AAPL"))
                  .Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task RemoveAsync_ItemExists_CallsRepositoryRemove()
    {
        var userId = Guid.NewGuid();
        var stock = new Stock { Id = Guid.NewGuid(), Ticker = "AAPL" };
        var item = new WatchlistItem { Id = Guid.NewGuid(), UserId = userId, StockId = stock.Id };

        _stocks.Setup(s => s.GetByTickerAsync("AAPL", It.IsAny<CancellationToken>())).ReturnsAsync(stock);
        _watchlist.Setup(w => w.GetItemAsync(userId, stock.Id, It.IsAny<CancellationToken>())).ReturnsAsync(item);
        _watchlist.Setup(w => w.RemoveAsync(item, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

        await _sut.RemoveAsync(userId, "AAPL");

        _watchlist.Verify(w => w.RemoveAsync(item, It.IsAny<CancellationToken>()), Times.Once);
    }
}
