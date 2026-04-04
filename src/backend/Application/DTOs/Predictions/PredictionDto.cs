namespace StockPredictor.Application.DTOs.Predictions;

public class PredictionDto
{
    public string Ticker { get; set; } = string.Empty;
    public string Horizon { get; set; } = string.Empty;
    public string Signal { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public Dictionary<string, double> Probabilities { get; set; } = [];
    public int FeaturesUsed { get; set; }
    public bool LowConfidence { get; set; }
    public DateTime CachedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}
