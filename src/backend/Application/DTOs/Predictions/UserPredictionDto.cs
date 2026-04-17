namespace StockPredictor.Application.DTOs.Predictions;

public class UserPredictionDto
{
    public string Ticker { get; set; } = default!;
    public string? Name { get; set; }
    public string Horizon { get; set; } = default!;        // "3m" | "6m" | "1y"
    public string? Signal { get; set; }                    // null if shared cache expired
    public double? Confidence { get; set; }
    public DateTime PredictedAt { get; set; }              // UserPredictionLog.RequestedAt
    public DateTime? ExpiresAt { get; set; }               // null if no valid cache
    public bool IsExpired { get; set; }                    // true if log exists but cache gone
}
