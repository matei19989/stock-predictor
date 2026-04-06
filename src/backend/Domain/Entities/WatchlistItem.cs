namespace StockPredictor.Domain.Entities;

public class WatchlistItem
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid StockId { get; set; }
    public DateTime AddedAt { get; set; }

    public User User { get; set; } = null!;
    public Stock Stock { get; set; } = null!;
}
