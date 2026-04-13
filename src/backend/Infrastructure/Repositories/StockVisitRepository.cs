using Microsoft.EntityFrameworkCore;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Repositories;

public class StockVisitRepository : IStockVisitRepository
{
    private readonly AppDbContext _db;

    public StockVisitRepository(AppDbContext db) => _db = db;

    public Task<List<StockVisit>> GetRecentAsync(Guid userId, int limit = 5, CancellationToken cancellationToken = default) =>
        _db.StockVisits
           .AsNoTracking()
           .Include(v => v.Stock)
           .Where(v => v.UserId == userId)
           .OrderByDescending(v => v.VisitedAt)
           .Take(limit)
           .ToListAsync(cancellationToken);

    public async Task UpsertAsync(StockVisit visit, CancellationToken cancellationToken = default)
    {
        var existing = await _db.StockVisits
            .FirstOrDefaultAsync(v => v.UserId == visit.UserId && v.StockId == visit.StockId, cancellationToken);

        if (existing != null)
        {
            existing.VisitedAt = visit.VisitedAt;
        }
        else
        {
            await _db.StockVisits.AddAsync(visit, cancellationToken);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}
