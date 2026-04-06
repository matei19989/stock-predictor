namespace StockPredictor.Domain.Enums;

public static class TradingSignalExtensions
{
    public static string ToWireString(this TradingSignal signal) => signal switch
    {
        TradingSignal.StrongSell => "Strong Sell",
        TradingSignal.Sell => "Sell",
        TradingSignal.Hold => "Hold",
        TradingSignal.Buy => "Buy",
        TradingSignal.StrongBuy => "Strong Buy",
        _ => throw new ArgumentOutOfRangeException(nameof(signal), signal, null)
    };

    public static TradingSignal ParseTradingSignal(string value) => value switch
    {
        "Strong Sell" => TradingSignal.StrongSell,
        "Sell" => TradingSignal.Sell,
        "Hold" => TradingSignal.Hold,
        "Buy" => TradingSignal.Buy,
        "Strong Buy" => TradingSignal.StrongBuy,
        _ => throw new ArgumentException($"Unknown signal value: '{value}'", nameof(value))
    };
}
