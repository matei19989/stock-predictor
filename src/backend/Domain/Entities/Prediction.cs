namespace StockPredictor.Domain.Entities;

public class Prediction
{
    public Guid Id { get; set; }
    public Guid StockId { get; set; }
    public string Horizon { get; set; } = string.Empty;       // "3m" | "6m" | "1y"
    public string Signal { get; set; } = string.Empty;        // "Buy" | "Strong Buy" | etc.
    public double Confidence { get; set; }
    public string ProbabilitiesJson { get; set; } = string.Empty;  // JSON: {"Buy":0.34,...}
    public int FeaturesUsed { get; set; }
    public bool LowConfidence { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }                   // CreatedAt + 24h

    public Stock Stock { get; set; } = null!;
}
