using Microsoft.EntityFrameworkCore;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Domain.Enums;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Repositories;

public class PredictionRepository : IPredictionRepository
{
    private readonly AppDbContext _db;

    public PredictionRepository(AppDbContext db) => _db = db;

    public Task<Prediction?> GetValidAsync(Guid stockId, Horizon horizon, CancellationToken cancellationToken = default) =>
        _db.Predictions
           .AsNoTracking()
           .Where(p => p.StockId == stockId && p.Horizon == horizon && p.ExpiresAt > DateTime.UtcNow)
           .OrderByDescending(p => p.CreatedAt)
           .FirstOrDefaultAsync(cancellationToken);

    public Task<Prediction?> GetLatestAsync(Guid stockId, Horizon horizon, CancellationToken cancellationToken = default) =>
        _db.Predictions
           .AsNoTracking()
           .Where(p => p.StockId == stockId && p.Horizon == horizon)
           .OrderByDescending(p => p.CreatedAt)
           .FirstOrDefaultAsync(cancellationToken);

    public async Task AddAsync(Prediction prediction, CancellationToken cancellationToken = default)
    {
        await _db.Predictions.AddAsync(prediction, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<Dictionary<Guid, Prediction>> GetValidForStocksAsync(
        List<Guid> stockIds, Horizon horizon, CancellationToken cancellationToken = default)
    {
        if (stockIds.Count == 0) return new();

        var predictions = await _db.Predictions
            .AsNoTracking()
            .Where(p => stockIds.Contains(p.StockId)
                     && p.Horizon == horizon
                     && p.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        return predictions
            .GroupBy(p => p.StockId)
            .ToDictionary(g => g.Key, g => g.First());
    }
}
