namespace StockPredictor.Application.DTOs.Stocks;

public class StockDetailDto
{
    public string Ticker { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Sector { get; set; }
    public DateTime LastUpdatedAt { get; set; }
    public List<PricePointDto> Prices { get; set; } = [];
}
