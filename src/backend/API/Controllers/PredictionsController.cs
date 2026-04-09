using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPredictor.Application.DTOs.Predictions;
using StockPredictor.Application.Interfaces.Services;

namespace StockPredictor.API.Controllers;

[ApiController]
[Route("api/predictions")]
[Authorize]
public class PredictionsController : ControllerBase
{
    private readonly IPredictionService _predictions;

    public PredictionsController(IPredictionService predictions) => _predictions = predictions;

    [HttpPost]
    [ProducesResponseType(typeof(PredictionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status501NotImplemented)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Predict([FromBody] PredictRequest request, CancellationToken cancellationToken) =>
        Ok(await _predictions.GetOrCreateAsync(request.Ticker.ToUpper(), request.Horizon, cancellationToken));

    [HttpGet("{ticker}")]
    [ProducesResponseType(typeof(PredictionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLatest(string ticker, [FromQuery] string horizon = "3m", CancellationToken cancellationToken = default)
    {
        var result = await _predictions.GetLatestAsync(ticker.ToUpper(), horizon, cancellationToken);
        return result == null ? NotFound() : Ok(result);
    }
}
