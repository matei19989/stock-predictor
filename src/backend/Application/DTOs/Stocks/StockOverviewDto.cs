namespace StockPredictor.Application.DTOs.Stocks;

public record StockOverviewDto
{
    public required string Ticker { get; init; }
    public string? Name { get; init; }
    public string? Sector { get; init; }
    public decimal? LatestClose { get; init; }
    public double? Change1dPct { get; init; }
    public string? LatestSignal { get; init; }
    public double? SignalConfidence { get; init; }
}
