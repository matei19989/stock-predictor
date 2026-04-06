namespace StockPredictor.Application.DTOs.Predictions;

public class PredictionDto
{
    public string Ticker { get; init; } = string.Empty;
    public string Horizon { get; init; } = string.Empty;
    public string Signal { get; init; } = string.Empty;
    public double Confidence { get; init; }
    public Dictionary<string, double> Probabilities { get; init; } = [];
    public int FeaturesUsed { get; init; }
    public bool LowConfidence { get; init; }
    public DateTime CachedAt { get; init; }
    public DateTime ExpiresAt { get; init; }
}
