using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Domain.Enums;
using StockPredictor.Infrastructure.Persistence;
using StockPredictor.Tests.Integration.Fixtures;

namespace StockPredictor.Tests.Integration.Repositories;

/// <summary>
/// Repository-layer tests for UserPredictionLogRepository. Runs against the real
/// Postgres container so the unique-constraint behaviour is exercised, not mocked.
/// </summary>
[Collection(nameof(IntegrationCollection))]
public class UserPredictionLogRepositoryTests : IAsyncLifetime
{
    private readonly IntegrationWebAppFactory _factory;

    public UserPredictionLogRepositoryTests(IntegrationWebAppFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync() => _factory.ResetDatabaseAsync();
    public Task DisposeAsync() => Task.CompletedTask;

    /// <summary>
    /// Two concurrent UpsertAsync calls on the same (userId, stockId, horizon)
    /// — e.g. a user impatiently double-clicking "Predict" — must both succeed
    /// without surfacing a unique-constraint violation as an unhandled exception.
    /// This is the regression test for the find-then-insert race in the original
    /// implementation.
    /// </summary>
    [Fact]
    public async Task UpsertAsync_ConcurrentCallsForSameKey_DoNotThrow()
    {
        var (userId, stockId) = await SeedUserAndStockAsync();

        async Task UpsertOnce()
        {
            using var scope = _factory.Services.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IUserPredictionLogRepository>();
            await repo.UpsertAsync(new UserPredictionLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                StockId = stockId,
                Horizon = Horizon.ThreeMonths,
                RequestedAt = DateTime.UtcNow,
            });
        }

        // Fire concurrently across two independent DI scopes. With the original
        // find-then-insert code, one of these routinely surfaces a
        // DbUpdateException from the (UserId, StockId, Horizon) unique index.
        var race = async () => await Task.WhenAll(UpsertOnce(), UpsertOnce());

        await race.Should().NotThrowAsync();

        using var verifyScope = _factory.Services.CreateScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var count = await db.UserPredictionLogs
            .Where(p => p.UserId == userId && p.StockId == stockId && p.Horizon == Horizon.ThreeMonths)
            .CountAsync();

        count.Should().Be(1, "upsert must never create a duplicate row for the same (user, stock, horizon)");
    }

    [Fact]
    public async Task UpsertAsync_SecondCallForSameKey_UpdatesRequestedAtRatherThanInserting()
    {
        var (userId, stockId) = await SeedUserAndStockAsync();

        var earlier = DateTime.UtcNow.AddMinutes(-5);
        var later = DateTime.UtcNow;

        using (var scope = _factory.Services.CreateScope())
        {
            var repo = scope.ServiceProvider.GetRequiredService<IUserPredictionLogRepository>();
            await repo.UpsertAsync(new UserPredictionLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                StockId = stockId,
                Horizon = Horizon.ThreeMonths,
                RequestedAt = earlier,
            });
        }

        using (var scope = _factory.Services.CreateScope())
        {
            var repo = scope.ServiceProvider.GetRequiredService<IUserPredictionLogRepository>();
            await repo.UpsertAsync(new UserPredictionLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                StockId = stockId,
                Horizon = Horizon.ThreeMonths,
                RequestedAt = later,
            });
        }

        using var verifyScope = _factory.Services.CreateScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var rows = await db.UserPredictionLogs
            .Where(p => p.UserId == userId && p.StockId == stockId && p.Horizon == Horizon.ThreeMonths)
            .ToListAsync();

        rows.Should().HaveCount(1);
        rows[0].RequestedAt.Should().BeCloseTo(later, TimeSpan.FromSeconds(1));
    }

    private async Task<(Guid UserId, Guid StockId)> SeedUserAndStockAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "race-test-user",
            Email = "race@example.com",
            PasswordHash = "hash",
            CreatedAt = DateTime.UtcNow,
            IsEmailConfirmed = true,
        };
        var stock = new Stock
        {
            Id = Guid.NewGuid(),
            Ticker = "AAPL",
            Name = "Apple",
            LastUpdatedAt = DateTime.UtcNow,
        };
        db.Users.Add(user);
        db.Stocks.Add(stock);
        await db.SaveChangesAsync();

        return (user.Id, stock.Id);
    }
}
