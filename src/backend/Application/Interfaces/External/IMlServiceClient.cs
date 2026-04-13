namespace StockPredictor.Application.Interfaces.External;

public interface IMlServiceClient
{
    Task<bool> IsHealthyAsync(CancellationToken cancellationToken = default);
    Task<MlStockDataResponse?> GetStockDataAsync(string ticker, string period = "5y", CancellationToken cancellationToken = default);
    Task<MlPredictResponse> PredictAsync(string ticker, string horizon, CancellationToken cancellationToken = default);
    Task<Dictionary<string, MlTickerInfo>?> GetTickerNamesAsync(CancellationToken cancellationToken = default);
}
