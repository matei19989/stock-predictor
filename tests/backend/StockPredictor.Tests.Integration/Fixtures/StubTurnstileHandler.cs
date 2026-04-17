using System.Net;

namespace StockPredictor.Tests.Integration.Fixtures;

/// <summary>
/// HttpMessageHandler that short-circuits the Turnstile siteverify HTTP call
/// so tests don't need a real Cloudflare round-trip. Returns success unless
/// the submitted token equals <see cref="InvalidToken"/>.
/// </summary>
public class StubTurnstileHandler : HttpMessageHandler
{
    public const string InvalidToken = "invalid-turnstile-token";

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var body = request.Content is null
            ? string.Empty
            : await request.Content.ReadAsStringAsync(cancellationToken);

        var isInvalid = body.Contains($"response={InvalidToken}", StringComparison.Ordinal);

        var payload = isInvalid
            ? "{\"success\":false,\"error-codes\":[\"invalid-input-response\"]}"
            : "{\"success\":true}";

        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(payload, System.Text.Encoding.UTF8, "application/json")
        };
    }
}
