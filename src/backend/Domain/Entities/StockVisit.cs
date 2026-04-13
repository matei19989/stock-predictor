namespace StockPredictor.Domain.Entities;

public class StockVisit
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid StockId { get; set; }
    public DateTime VisitedAt { get; set; }

    public User User { get; set; } = null!;
    public Stock Stock { get; set; } = null!;
}
