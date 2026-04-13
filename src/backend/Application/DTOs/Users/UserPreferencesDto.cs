namespace StockPredictor.Application.DTOs.Users;

public record UserPreferencesDto
{
    public string DefaultChartRange { get; init; } = "1Y";
    public bool NotificationsEnabled { get; init; } = true;
}
