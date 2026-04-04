namespace StockPredictor.Domain.Entities;

public class StockPrice
{
    public Guid Id { get; set; }
    public Guid StockId { get; set; }
    public DateOnly Date { get; set; }
    public decimal Open { get; set; }
    public decimal High { get; set; }
    public decimal Low { get; set; }
    public decimal Close { get; set; }
    public long Volume { get; set; }

    public Stock Stock { get; set; } = null!;
}
