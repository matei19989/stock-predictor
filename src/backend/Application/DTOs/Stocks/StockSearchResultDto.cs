namespace StockPredictor.Application.DTOs.Stocks;

public class StockSearchResultDto
{
    public string Ticker { get; init; } = string.Empty;
    public string? Name { get; init; }
    public string? Sector { get; init; }
    public decimal? LatestClose { get; init; }
    public bool IsInWatchlist { get; init; }
}
