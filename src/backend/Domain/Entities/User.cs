namespace StockPredictor.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? PreferencesJson { get; set; }

    public bool IsEmailConfirmed { get; set; }
    public string? EmailConfirmationToken { get; set; }
    public DateTime? EmailConfirmationTokenExpiresAt { get; set; }

    public ICollection<WatchlistItem> WatchlistItems { get; set; } = [];
    public ICollection<StockVisit> StockVisits { get; set; } = [];
    public ICollection<UserPredictionLog> PredictionLogs { get; set; } = [];
}
