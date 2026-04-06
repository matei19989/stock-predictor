using System.Globalization;
using StockPredictor.Application.Interfaces.External;
using StockPredictor.Domain.Entities;

namespace StockPredictor.Infrastructure.Mapping;

public static class StockPriceMapper
{
    public static List<StockPrice> ToEntities(Guid stockId, List<MlDataPoint> dataPoints) =>
        dataPoints.Select(p => new StockPrice
        {
            Id = Guid.NewGuid(),
            StockId = stockId,
            Date = DateOnly.Parse(p.Date, CultureInfo.InvariantCulture),
            Open = (decimal)p.Open,
            High = (decimal)p.High,
            Low = (decimal)p.Low,
            Close = (decimal)p.Close,
            Volume = p.Volume
        }).ToList();
}
