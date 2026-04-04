using StockPredictor.Application.DTOs.Predictions;

namespace StockPredictor.Application.Interfaces.Services;

public interface IPredictionService
{
    Task<PredictionDto> GetOrCreateAsync(string ticker, string horizon);
    Task<PredictionDto?> GetLatestAsync(string ticker, string horizon);
}
