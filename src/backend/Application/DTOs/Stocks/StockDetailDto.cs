namespace StockPredictor.Application.DTOs.Stocks;

public class StockDetailDto
{
    public string Ticker { get; init; } = string.Empty;
    public string? Name { get; init; }
    public string? Sector { get; init; }
    public DateTime LastUpdatedAt { get; init; }
    public List<PricePointDto> Prices { get; init; } = [];
}
