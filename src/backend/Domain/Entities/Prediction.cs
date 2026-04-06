using StockPredictor.Domain.Enums;

namespace StockPredictor.Domain.Entities;

public class Prediction
{
    public Guid Id { get; set; }
    public Guid StockId { get; set; }
    public Horizon Horizon { get; set; }
    public TradingSignal Signal { get; set; }
    public double Confidence { get; set; }
    public Dictionary<string, double> Probabilities { get; set; } = [];
    public int FeaturesUsed { get; set; }
    public bool LowConfidence { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }                   // CreatedAt + 24h

    public Stock Stock { get; set; } = null!;
}
