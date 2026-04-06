namespace StockPredictor.Application.DTOs.Watchlist;

public class WatchlistItemDto
{
    public string Ticker { get; init; } = string.Empty;
    public string? Name { get; init; }
    public decimal? LatestClose { get; init; }
    public decimal? PreviousClose { get; init; }
    public decimal? Change1dPct { get; init; }        // (latest - prev) / prev * 100
    public DateTime AddedAt { get; init; }
    public string? LatestSignal { get; init; }        // from valid cached prediction, null if none
    public double? SignalConfidence { get; init; }
}
