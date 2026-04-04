namespace StockPredictor.Application.DTOs.Stocks;

public class StockSearchResultDto
{
    public string Ticker { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Sector { get; set; }
    public decimal? LatestClose { get; set; }
    public bool IsInWatchlist { get; set; }
}
