using System.Net;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using StockPredictor.Application.Exceptions;
using StockPredictor.Infrastructure.Http;

namespace StockPredictor.Tests.Unit.Http;

public class MlServiceClientTests
{
    private static MlServiceClient CreateClient(HttpResponseMessage response)
    {
        var handler = new MockHttpMessageHandler(response);
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://ml:8000") };
        var logger = Mock.Of<ILogger<MlServiceClient>>();
        return new MlServiceClient(httpClient, logger);
    }

    private static MlServiceClient CreateThrowingClient(Exception exception)
    {
        var handler = new ThrowingHttpMessageHandler(exception);
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://ml:8000") };
        var logger = Mock.Of<ILogger<MlServiceClient>>();
        return new MlServiceClient(httpClient, logger);
    }

    private static HttpResponseMessage JsonResponse(HttpStatusCode status, string json) =>
        new(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    // --- IsHealthyAsync ---

    [Fact]
    public async Task IsHealthyAsync_Healthy_ReturnsTrue()
    {
        var client = CreateClient(JsonResponse(HttpStatusCode.OK,
            """{"status":"healthy","model_loaded":true}"""));

        var result = await client.IsHealthyAsync();

        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsHealthyAsync_Degraded_ReturnsFalse()
    {
        var client = CreateClient(JsonResponse(HttpStatusCode.OK,
            """{"status":"degraded","model_loaded":false}"""));

        var result = await client.IsHealthyAsync();

        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsHealthyAsync_ServerError_ReturnsFalse()
    {
        var client = CreateClient(new HttpResponseMessage(HttpStatusCode.InternalServerError));

        var result = await client.IsHealthyAsync();

        result.Should().BeFalse();
    }

    [Fact]
    public async Task IsHealthyAsync_Timeout_ReturnsFalse()
    {
        var client = CreateThrowingClient(new HttpRequestException("Connection refused"));

        var result = await client.IsHealthyAsync();

        result.Should().BeFalse();
    }

    // --- GetStockDataAsync ---

    [Fact]
    public async Task GetStockDataAsync_Success_ReturnsData()
    {
        var json = """
        {
            "ticker": "AAPL",
            "period": "5y",
            "count": 1,
            "data": [{"date": "2024-01-02", "open": 150.0, "high": 155.0, "low": 148.0, "close": 153.0, "volume": 1000000}]
        }
        """;
        var client = CreateClient(JsonResponse(HttpStatusCode.OK, json));

        var result = await client.GetStockDataAsync("AAPL");

        result.Should().NotBeNull();
        result!.Ticker.Should().Be("AAPL");
        result.Count.Should().Be(1);
        result.Data.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetStockDataAsync_NotFound_ReturnsNull()
    {
        var client = CreateClient(new HttpResponseMessage(HttpStatusCode.NotFound));

        var result = await client.GetStockDataAsync("FAKEZ");

        result.Should().BeNull();
    }

    [Fact]
    public async Task GetStockDataAsync_ServerError_ThrowsMlServiceUnavailable()
    {
        var client = CreateClient(new HttpResponseMessage(HttpStatusCode.InternalServerError));

        await client.Invoking(c => c.GetStockDataAsync("AAPL"))
            .Should().ThrowAsync<MlServiceUnavailableException>();
    }

    // --- PredictAsync ---

    [Fact]
    public async Task PredictAsync_Success_ReturnsPrediction()
    {
        var json = """
        {
            "ticker": "AAPL",
            "horizon": "3m",
            "signal": "Buy",
            "confidence": 0.35,
            "probabilities": {"Strong Sell": 0.05, "Sell": 0.10, "Hold": 0.25, "Buy": 0.35, "Strong Buy": 0.25},
            "features_used": 22,
            "timestamp": "2024-01-01T00:00:00+00:00",
            "low_confidence": false
        }
        """;
        var client = CreateClient(JsonResponse(HttpStatusCode.OK, json));

        var result = await client.PredictAsync("AAPL", "3m");

        result.Signal.Should().Be("Buy");
        result.Confidence.Should().Be(0.35);
        result.FeaturesUsed.Should().Be(22);
        result.Probabilities.Should().HaveCount(5);
    }

    [Fact]
    public async Task PredictAsync_HorizonNotSupported_ThrowsHorizonException()
    {
        var client = CreateClient(new HttpResponseMessage(HttpStatusCode.NotImplemented));

        await client.Invoking(c => c.PredictAsync("AAPL", "6m"))
            .Should().ThrowAsync<HorizonNotSupportedException>();
    }

    [Fact]
    public async Task PredictAsync_ModelNotReady_ThrowsMlServiceUnavailable()
    {
        var client = CreateClient(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));

        await client.Invoking(c => c.PredictAsync("AAPL", "3m"))
            .Should().ThrowAsync<MlServiceUnavailableException>();
    }

    [Fact]
    public async Task PredictAsync_ServerError_ThrowsMlServiceUnavailable()
    {
        var client = CreateClient(new HttpResponseMessage(HttpStatusCode.InternalServerError));

        await client.Invoking(c => c.PredictAsync("AAPL", "3m"))
            .Should().ThrowAsync<MlServiceUnavailableException>();
    }

    // --- Helpers ---

    private class MockHttpMessageHandler(HttpResponseMessage response) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken) =>
            Task.FromResult(response);
    }

    private class ThrowingHttpMessageHandler(Exception exception) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken) =>
            throw exception;
    }
}
