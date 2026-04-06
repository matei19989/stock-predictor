namespace StockPredictor.Domain.Enums;

public static class HorizonExtensions
{
    public static string ToWireString(this Horizon horizon) => horizon switch
    {
        Horizon.ThreeMonths => "3m",
        Horizon.SixMonths => "6m",
        Horizon.OneYear => "1y",
        _ => throw new ArgumentOutOfRangeException(nameof(horizon), horizon, null)
    };

    public static Horizon ParseHorizon(string value) => value switch
    {
        "3m" => Horizon.ThreeMonths,
        "6m" => Horizon.SixMonths,
        "1y" => Horizon.OneYear,
        _ => throw new ArgumentException($"Unknown horizon value: '{value}'", nameof(value))
    };
}
