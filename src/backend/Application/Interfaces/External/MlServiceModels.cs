using System.Text.Json.Serialization;

namespace StockPredictor.Application.Interfaces.External;

public record MlHealthResponse(
    string Status,
    [property: JsonPropertyName("model_loaded")] bool ModelLoaded
);

public record MlStockDataResponse(
    string Ticker,
    string Period,
    int Count,
    List<MlDataPoint> Data,
    string? Name = null,
    string? Sector = null
);

public record MlDataPoint(
    string Date,
    double Open,
    double High,
    double Low,
    double Close,
    long Volume
);

public record MlPredictResponse(
    string Ticker,
    string Horizon,
    string Signal,
    double Confidence,
    Dictionary<string, double> Probabilities,
    [property: JsonPropertyName("features_used")] int FeaturesUsed,
    string Timestamp,
    [property: JsonPropertyName("low_confidence")] bool LowConfidence
);

public record MlTickerInfo(
    string? Name,
    string? Sector
);
