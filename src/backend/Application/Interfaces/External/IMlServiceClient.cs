namespace StockPredictor.Application.Interfaces.External;

public interface IMlServiceClient
{
    Task<bool> IsHealthyAsync();
    Task<MlStockDataResponse?> GetStockDataAsync(string ticker, string period = "5y");
    Task<MlPredictResponse> PredictAsync(string ticker, string horizon);
}
