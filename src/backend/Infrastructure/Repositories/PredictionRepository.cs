using Microsoft.EntityFrameworkCore;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Repositories;

public class PredictionRepository : IPredictionRepository
{
    private readonly AppDbContext _db;

    public PredictionRepository(AppDbContext db) => _db = db;

    public Task<Prediction?> GetValidAsync(Guid stockId, string horizon) =>
        _db.Predictions
           .Where(p => p.StockId == stockId && p.Horizon == horizon && p.ExpiresAt > DateTime.UtcNow)
           .OrderByDescending(p => p.CreatedAt)
           .FirstOrDefaultAsync();

    public Task<Prediction?> GetLatestAsync(Guid stockId, string horizon) =>
        _db.Predictions
           .Where(p => p.StockId == stockId && p.Horizon == horizon)
           .OrderByDescending(p => p.CreatedAt)
           .FirstOrDefaultAsync();

    public async Task AddAsync(Prediction prediction)
    {
        await _db.Predictions.AddAsync(prediction);
        await _db.SaveChangesAsync();
    }
}
