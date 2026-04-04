namespace StockPredictor.Domain.Entities;

public class Stock
{
    public Guid Id { get; set; }
    public string Ticker { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Sector { get; set; }
    public DateTime LastUpdatedAt { get; set; }

    public ICollection<StockPrice> Prices { get; set; } = [];
    public ICollection<WatchlistItem> WatchlistItems { get; set; } = [];
    public ICollection<Prediction> Predictions { get; set; } = [];
}
