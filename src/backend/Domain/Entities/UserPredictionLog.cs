using StockPredictor.Domain.Enums;

namespace StockPredictor.Domain.Entities;

public class UserPredictionLog
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid StockId { get; set; }
    public Horizon Horizon { get; set; }
    public DateTime RequestedAt { get; set; }

    public User User { get; set; } = null!;
    public Stock Stock { get; set; } = null!;
}
