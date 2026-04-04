using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.External;

namespace StockPredictor.Infrastructure.Http;

public class MlServiceClient : IMlServiceClient
{
    private readonly HttpClient _http;
    private readonly ILogger<MlServiceClient> _logger;

    public MlServiceClient(HttpClient http, ILogger<MlServiceClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<bool> IsHealthyAsync()
    {
        try
        {
            var response = await _http.GetFromJsonAsync<MlHealthResponse>("/health");
            return response?.Status == "healthy";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ML health check failed");
            return false;
        }
    }

    public async Task<MlStockDataResponse?> GetStockDataAsync(string ticker, string period = "5y")
    {
        var response = await _http.GetAsync($"/data/{ticker}?period={period}");

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            _logger.LogWarning("ML service returned 404 for ticker {Ticker}", ticker);
            return null;
        }

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<MlStockDataResponse>();
    }

    public async Task<MlPredictResponse> PredictAsync(string ticker, string horizon)
    {
        var body = new { ticker = ticker.ToUpper(), horizon };
        var response = await _http.PostAsJsonAsync("/predict", body);

        if (response.StatusCode == HttpStatusCode.NotImplemented)
            throw new HorizonNotSupportedException(horizon);

        if (response.StatusCode == HttpStatusCode.ServiceUnavailable)
            throw new MlServiceUnavailableException("ML model is not ready. Try again shortly.");

        response.EnsureSuccessStatusCode();

        return (await response.Content.ReadFromJsonAsync<MlPredictResponse>())!;
    }
}
