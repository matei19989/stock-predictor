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

    public async Task<bool> IsHealthyAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _http.GetFromJsonAsync<MlHealthResponse>("/health", cancellationToken);
            return response?.Status == "healthy";
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "ML health check failed");
            return false;
        }
    }

    public async Task<MlStockDataResponse?> GetStockDataAsync(string ticker, string period = "5y", CancellationToken cancellationToken = default)
    {
        HttpResponseMessage response;
        try
        {
            response = await _http.GetAsync($"/data/{ticker}?period={period}", cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "ML service unreachable when fetching data for {Ticker}", ticker);
            throw new MlServiceUnavailableException();
        }

        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            _logger.LogWarning("ML service returned 404 for ticker {Ticker}", ticker);
            return null;
        }

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("ML service returned {StatusCode} for {Ticker}",
                (int)response.StatusCode, ticker);
            throw new MlServiceUnavailableException();
        }

        return await response.Content.ReadFromJsonAsync<MlStockDataResponse>(cancellationToken: cancellationToken);
    }

    public async Task<MlPredictResponse> PredictAsync(string ticker, string horizon, CancellationToken cancellationToken = default)
    {
        var body = new { ticker = ticker.ToUpper(), horizon };

        HttpResponseMessage response;
        try
        {
            response = await _http.PostAsJsonAsync("/predict", body, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "ML service unreachable for prediction {Ticker}/{Horizon}", ticker, horizon);
            throw new MlServiceUnavailableException();
        }

        if (response.StatusCode == HttpStatusCode.NotImplemented)
            throw new HorizonNotSupportedException(horizon);

        if (response.StatusCode == HttpStatusCode.ServiceUnavailable)
            throw new MlServiceUnavailableException("ML model is not ready. Try again shortly.");

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("ML service returned {StatusCode} for prediction {Ticker}/{Horizon}",
                (int)response.StatusCode, ticker, horizon);
            throw new MlServiceUnavailableException();
        }

        return await response.Content.ReadFromJsonAsync<MlPredictResponse>(cancellationToken: cancellationToken)
            ?? throw new MlServiceUnavailableException("ML service returned an unexpected response.");
    }
}
