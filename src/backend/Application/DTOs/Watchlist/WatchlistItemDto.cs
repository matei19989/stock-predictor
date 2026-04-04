namespace StockPredictor.Application.DTOs.Watchlist;

public class WatchlistItemDto
{
    public string Ticker { get; set; } = string.Empty;
    public string? Name { get; set; }
    public decimal LatestClose { get; set; }
    public decimal? PreviousClose { get; set; }
    public decimal? Change1dPct { get; set; }        // (latest - prev) / prev * 100
    public DateTime AddedAt { get; set; }
    public string? LatestSignal { get; set; }        // from valid cached prediction, null if none
    public double? SignalConfidence { get; set; }
}
