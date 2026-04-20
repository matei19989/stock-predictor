using Microsoft.EntityFrameworkCore;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Domain.Enums;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Repositories;

public class UserPredictionLogRepository : IUserPredictionLogRepository
{
    private readonly AppDbContext _db;

    public UserPredictionLogRepository(AppDbContext db) => _db = db;

    public Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _db.UserPredictionLogs
           .CountAsync(p => p.UserId == userId, cancellationToken);

    public Task<bool> ExistsAsync(Guid userId, Guid stockId, Horizon horizon, CancellationToken ct = default) =>
        _db.UserPredictionLogs
           .AnyAsync(p => p.UserId == userId && p.StockId == stockId && p.Horizon == horizon, ct);

    public async Task UpsertAsync(UserPredictionLog entry, CancellationToken cancellationToken = default)
    {
        // Atomic upsert via Postgres ON CONFLICT — prevents the find-then-insert
        // race where two concurrent requests for the same (UserId, StockId, Horizon)
        // would both see a null read and both try to insert, surfacing a
        // duplicate-key 500 from the unique index.
        await _db.Database.ExecuteSqlInterpolatedAsync(
            $"""
             INSERT INTO "UserPredictionLogs" ("Id", "UserId", "StockId", "Horizon", "RequestedAt")
             VALUES ({entry.Id}, {entry.UserId}, {entry.StockId}, {(int)entry.Horizon}, {entry.RequestedAt})
             ON CONFLICT ("UserId", "StockId", "Horizon")
             DO UPDATE SET "RequestedAt" = EXCLUDED."RequestedAt"
             """,
            cancellationToken);
    }

    public Task<List<UserPredictionLog>> GetAllForUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _db.UserPredictionLogs
           .AsNoTracking()
           .Include(p => p.Stock)
           .Where(p => p.UserId == userId)
           .OrderByDescending(p => p.RequestedAt)
           .ToListAsync(cancellationToken);
}
