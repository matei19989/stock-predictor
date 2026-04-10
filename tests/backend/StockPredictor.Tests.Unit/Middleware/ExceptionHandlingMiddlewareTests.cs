using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using StockPredictor.API.Middleware;
using StockPredictor.Application.Exceptions;

namespace StockPredictor.Tests.Unit.Middleware;

public class ExceptionHandlingMiddlewareTests
{
    private static (ExceptionHandlingMiddleware middleware, DefaultHttpContext context) CreateSetup(
        Func<HttpContext, Task> next)
    {
        var logger = Mock.Of<ILogger<ExceptionHandlingMiddleware>>();
        var middleware = new ExceptionHandlingMiddleware(
            new RequestDelegate(next), logger);
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        return (middleware, context);
    }

    private static async Task<JsonElement> ReadProblemDetails(DefaultHttpContext context)
    {
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync();
        return JsonSerializer.Deserialize<JsonElement>(body);
    }

    [Fact]
    public async Task NoException_PassesThrough()
    {
        var (middleware, context) = CreateSetup(_ => Task.CompletedTask);

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task NotFoundException_Returns404()
    {
        var (middleware, context) = CreateSetup(_ => throw new NotFoundException("Item not found"));

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(404);
        var problem = await ReadProblemDetails(context);
        problem.GetProperty("title").GetString().Should().Be("NotFound");
        problem.GetProperty("detail").GetString().Should().Be("Item not found");
    }

    [Fact]
    public async Task ConflictException_Returns409()
    {
        var (middleware, context) = CreateSetup(_ => throw new ConflictException("Already exists"));

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(409);
        var problem = await ReadProblemDetails(context);
        problem.GetProperty("title").GetString().Should().Be("Conflict");
    }

    [Fact]
    public async Task UnauthorizedException_Returns401()
    {
        var (middleware, context) = CreateSetup(_ => throw new UnauthorizedException("Bad creds"));

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(401);
        var problem = await ReadProblemDetails(context);
        problem.GetProperty("title").GetString().Should().Be("Unauthorized");
    }

    [Fact]
    public async Task UnhandledException_Returns500()
    {
        var (middleware, context) = CreateSetup(_ => throw new InvalidOperationException("secret internal detail"));

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.Should().Be(500);
        var problem = await ReadProblemDetails(context);
        problem.GetProperty("detail").GetString().Should().Be("An unexpected error occurred.");
    }

    [Fact]
    public async Task CorrelationId_IncludedInResponse()
    {
        var (middleware, context) = CreateSetup(_ => throw new NotFoundException("test"));
        context.Response.Headers["X-Correlation-Id"] = "abc-123";

        await middleware.InvokeAsync(context);

        var problem = await ReadProblemDetails(context);
        problem.GetProperty("correlationId").GetString().Should().Be("abc-123");
    }
}
