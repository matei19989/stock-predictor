using FluentAssertions;
using StockPredictor.Domain.Enums;

namespace StockPredictor.Tests.Unit.Enums;

public class HorizonExtensionTests
{
    [Theory]
    [InlineData(Horizon.ThreeMonths, "3m")]
    [InlineData(Horizon.SixMonths, "6m")]
    [InlineData(Horizon.OneYear, "1y")]
    public void ToWireString_MapsCorrectly(Horizon horizon, string expected)
    {
        horizon.ToWireString().Should().Be(expected);
    }

    [Theory]
    [InlineData("3m", Horizon.ThreeMonths)]
    [InlineData("6m", Horizon.SixMonths)]
    [InlineData("1y", Horizon.OneYear)]
    public void ParseHorizon_MapsCorrectly(string wire, Horizon expected)
    {
        HorizonExtensions.ParseHorizon(wire).Should().Be(expected);
    }

    [Fact]
    public void ParseHorizon_InvalidValue_ThrowsArgumentException()
    {
        FluentActions.Invoking(() => HorizonExtensions.ParseHorizon("2y"))
            .Should().Throw<ArgumentException>();
    }
}

public class TradingSignalExtensionTests
{
    [Theory]
    [InlineData(TradingSignal.StrongSell, "Strong Sell")]
    [InlineData(TradingSignal.Sell, "Sell")]
    [InlineData(TradingSignal.Hold, "Hold")]
    [InlineData(TradingSignal.Buy, "Buy")]
    [InlineData(TradingSignal.StrongBuy, "Strong Buy")]
    public void ToWireString_MapsCorrectly(TradingSignal signal, string expected)
    {
        signal.ToWireString().Should().Be(expected);
    }

    [Theory]
    [InlineData("Strong Sell", TradingSignal.StrongSell)]
    [InlineData("Hold", TradingSignal.Hold)]
    [InlineData("Strong Buy", TradingSignal.StrongBuy)]
    public void ParseTradingSignal_MapsCorrectly(string wire, TradingSignal expected)
    {
        TradingSignalExtensions.ParseTradingSignal(wire).Should().Be(expected);
    }

    [Fact]
    public void ParseTradingSignal_InvalidValue_ThrowsArgumentException()
    {
        FluentActions.Invoking(() => TradingSignalExtensions.ParseTradingSignal("Very Strong Buy"))
            .Should().Throw<ArgumentException>();
    }

    [Fact]
    public void RoundTrip_AllSignals_Consistent()
    {
        foreach (var signal in Enum.GetValues<TradingSignal>())
        {
            var wire = signal.ToWireString();
            var parsed = TradingSignalExtensions.ParseTradingSignal(wire);
            parsed.Should().Be(signal);
        }
    }
}
