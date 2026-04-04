namespace StockPredictor.Application.DTOs.Predictions;

public class PredictRequest
{
    public string Ticker { get; set; } = string.Empty;
    public string Horizon { get; set; } = string.Empty;
}
