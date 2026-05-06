using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPredictor.Application.DTOs.Predictions;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.Services;

namespace StockPredictor.API.Controllers;

[ApiController]
[Route("api/predictions")]
[Authorize]
public class PredictionsController : ControllerBase
{
    private readonly IPredictionService _predictions;

    public PredictionsController(IPredictionService predictions)
    {
        _predictions = predictions;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id)
            ? id
            : throw new UnauthorizedException("Missing or invalid user identifier.");
    }

    [HttpPost]
    [ProducesResponseType(typeof(PredictionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status501NotImplemented)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Predict([FromBody] PredictRequest request, CancellationToken cancellationToken)
    {
        var result = await _predictions.GetOrCreateAsync(GetUserId(), request.Ticker, request.Horizon, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{ticker}")]
    [ProducesResponseType(typeof(PredictionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLatest(string ticker, [FromQuery] string horizon = "3m", CancellationToken cancellationToken = default)
    {
        var result = await _predictions.GetLatestForUserAsync(GetUserId(), ticker.ToUpper(), horizon, cancellationToken);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpGet("user/count")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUserPredictionCount(CancellationToken cancellationToken)
    {
        var count = await _predictions.GetUserPredictionCountAsync(GetUserId(), cancellationToken);
        return Ok(new { count });
    }

    [HttpGet("user/predicted")]
    [ProducesResponseType(typeof(IEnumerable<UserPredictionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUserPredicted(CancellationToken cancellationToken)
    {
        var result = await _predictions.GetUserPredictedAsync(GetUserId(), cancellationToken);
        return Ok(result);
    }
}
