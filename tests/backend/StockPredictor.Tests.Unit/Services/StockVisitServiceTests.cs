using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Services;

namespace StockPredictor.Tests.Unit.Services;

public class StockVisitServiceTests
{
    private readonly Mock<IStockRepository> _stocks = new();
    private readonly Mock<IStockVisitRepository> _visits = new();
    private readonly StockVisitService _sut;

    public StockVisitServiceTests()
    {
        _sut = new StockVisitService(_stocks.Object, _visits.Object, NullLogger<StockVisitService>.Instance);
    }

    [Fact]
    public async Task RecordAsync_UpsertsVisit_WhenStockExists()
    {
        var userId = Guid.NewGuid();
        var stock = new Stock { Id = Guid.NewGuid(), Ticker = "AAPL" };
        _stocks.Setup(r => r.GetByTickerAsync("AAPL", It.IsAny<CancellationToken>())).ReturnsAsync(stock);

        await _sut.RecordAsync(userId, "aapl");

        _visits.Verify(r => r.UpsertAsync(
            It.Is<StockVisit>(v => v.UserId == userId && v.StockId == stock.Id),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RecordAsync_ThrowsNotFound_WhenStockDoesNotExist()
    {
        _stocks.Setup(r => r.GetByTickerAsync("UNKNOWN", It.IsAny<CancellationToken>())).ReturnsAsync((Stock?)null);

        await _sut.Invoking(s => s.RecordAsync(Guid.NewGuid(), "UNKNOWN"))
                  .Should().ThrowAsync<NotFoundException>();
        _visits.Verify(r => r.UpsertAsync(It.IsAny<StockVisit>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RecordAsync_SwallowsUpsertFailure()
    {
        var stock = new Stock { Id = Guid.NewGuid(), Ticker = "AAPL" };
        _stocks.Setup(r => r.GetByTickerAsync("AAPL", It.IsAny<CancellationToken>())).ReturnsAsync(stock);
        _visits.Setup(r => r.UpsertAsync(It.IsAny<StockVisit>(), It.IsAny<CancellationToken>()))
               .ThrowsAsync(new InvalidOperationException("transient"));

        await _sut.Invoking(s => s.RecordAsync(Guid.NewGuid(), "AAPL"))
                  .Should().NotThrowAsync();
    }

    [Fact]
    public async Task GetRecentlyViewedAsync_MapsVisitsToDtos()
    {
        var userId = Guid.NewGuid();
        var visits = new List<StockVisit>
        {
            new() { Stock = new Stock { Ticker = "AAPL", Name = "Apple" } },
            new() { Stock = new Stock { Ticker = "MSFT", Name = "Microsoft" } },
        };
        _visits.Setup(r => r.GetRecentAsync(userId, 5, It.IsAny<CancellationToken>())).ReturnsAsync(visits);

        var result = await _sut.GetRecentlyViewedAsync(userId);

        result.Should().HaveCount(2);
        result[0].Ticker.Should().Be("AAPL");
        result[0].Name.Should().Be("Apple");
        result[1].Ticker.Should().Be("MSFT");
    }

    [Fact]
    public async Task GetRecentlyViewedAsync_ReturnsEmpty_WhenNoVisits()
    {
        var userId = Guid.NewGuid();
        _visits.Setup(r => r.GetRecentAsync(userId, 5, It.IsAny<CancellationToken>()))
               .ReturnsAsync(new List<StockVisit>());

        var result = await _sut.GetRecentlyViewedAsync(userId);

        result.Should().BeEmpty();
    }
}
