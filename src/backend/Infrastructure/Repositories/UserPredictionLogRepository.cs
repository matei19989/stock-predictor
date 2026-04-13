using Microsoft.EntityFrameworkCore;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Repositories;

public class UserPredictionLogRepository : IUserPredictionLogRepository
{
    private readonly AppDbContext _db;

    public UserPredictionLogRepository(AppDbContext db) => _db = db;

    public Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _db.UserPredictionLogs
           .CountAsync(p => p.UserId == userId, cancellationToken);

    public async Task UpsertAsync(UserPredictionLog entry, CancellationToken cancellationToken = default)
    {
        var existing = await _db.UserPredictionLogs
            .FirstOrDefaultAsync(p => p.UserId == entry.UserId && p.StockId == entry.StockId && p.Horizon == entry.Horizon, cancellationToken);

        if (existing != null)
        {
            existing.RequestedAt = entry.RequestedAt;
        }
        else
        {
            await _db.UserPredictionLogs.AddAsync(entry, cancellationToken);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}
