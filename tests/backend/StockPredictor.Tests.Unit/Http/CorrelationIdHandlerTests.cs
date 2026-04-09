using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using StockPredictor.Infrastructure.Http;

namespace StockPredictor.Tests.Unit.Http;

public class CorrelationIdHandlerTests
{
    private static (CorrelationIdHandler handler, CapturingHandler inner) CreateHandler(string? correlationId)
    {
        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        if (correlationId != null)
        {
            var context = new DefaultHttpContext();
            context.Response.Headers["X-Correlation-Id"] = correlationId;
            httpContextAccessor.Setup(a => a.HttpContext).Returns(context);
        }

        var inner = new CapturingHandler();
        var handler = new CorrelationIdHandler(httpContextAccessor.Object) { InnerHandler = inner };
        return (handler, inner);
    }

    [Fact]
    public async Task Adds_CorrelationId_Header_When_Present()
    {
        var (handler, inner) = CreateHandler("test-corr-123");
        var invoker = new HttpMessageInvoker(handler);

        await invoker.SendAsync(new HttpRequestMessage(HttpMethod.Get, "http://ml:8000/health"), CancellationToken.None);

        inner.CapturedRequest.Should().NotBeNull();
        inner.CapturedRequest!.Headers.GetValues("X-Correlation-Id")
            .Should().ContainSingle().Which.Should().Be("test-corr-123");
    }

    [Fact]
    public async Task Skips_Header_When_No_HttpContext()
    {
        var (handler, inner) = CreateHandler(null);
        var invoker = new HttpMessageInvoker(handler);

        await invoker.SendAsync(new HttpRequestMessage(HttpMethod.Get, "http://ml:8000/health"), CancellationToken.None);

        inner.CapturedRequest.Should().NotBeNull();
        inner.CapturedRequest!.Headers.Contains("X-Correlation-Id").Should().BeFalse();
    }

    [Fact]
    public async Task Skips_Header_When_No_CorrelationId_In_Response()
    {
        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(a => a.HttpContext).Returns(new DefaultHttpContext());

        var inner = new CapturingHandler();
        var handler = new CorrelationIdHandler(httpContextAccessor.Object) { InnerHandler = inner };
        var invoker = new HttpMessageInvoker(handler);

        await invoker.SendAsync(new HttpRequestMessage(HttpMethod.Get, "http://ml:8000/health"), CancellationToken.None);

        inner.CapturedRequest!.Headers.Contains("X-Correlation-Id").Should().BeFalse();
    }

    private class CapturingHandler : HttpMessageHandler
    {
        public HttpRequestMessage? CapturedRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CapturedRequest = request;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        }
    }
}
