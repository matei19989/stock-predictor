using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPredictor.Application.DTOs.Predictions;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Application.Interfaces.Services;
using StockPredictor.Domain.Entities;
using StockPredictor.Domain.Enums;

namespace StockPredictor.API.Controllers;

[ApiController]
[Route("api/predictions")]
[Authorize]
public class PredictionsController : ControllerBase
{
    private readonly IPredictionService _predictions;
    private readonly IStockRepository _stockRepo;
    private readonly IUserPredictionLogRepository _predictionLog;

    public PredictionsController(
        IPredictionService predictions,
        IStockRepository stockRepo,
        IUserPredictionLogRepository predictionLog)
    {
        _predictions = predictions;
        _stockRepo = stockRepo;
        _predictionLog = predictionLog;
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
        var result = await _predictions.GetOrCreateAsync(request.Ticker.ToUpper(), request.Horizon, cancellationToken);

        var stock = await _stockRepo.GetByTickerAsync(request.Ticker.ToUpper(), cancellationToken);
        if (stock != null)
        {
            var horizon = request.Horizon switch
            {
                "3m" => Horizon.ThreeMonths,
                "6m" => Horizon.SixMonths,
                "1y" => Horizon.OneYear,
                _ => Horizon.ThreeMonths,
            };

            await _predictionLog.UpsertAsync(new UserPredictionLog
            {
                Id = Guid.NewGuid(),
                UserId = GetUserId(),
                StockId = stock.Id,
                Horizon = horizon,
                RequestedAt = DateTime.UtcNow,
            }, cancellationToken);
        }

        return Ok(result);
    }

    [HttpGet("{ticker}")]
    [ProducesResponseType(typeof(PredictionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLatest(string ticker, [FromQuery] string horizon = "3m", CancellationToken cancellationToken = default)
    {
        var result = await _predictions.GetLatestAsync(ticker.ToUpper(), horizon, cancellationToken);
        return result == null ? NotFound() : Ok(result);
    }

    [HttpGet("user/count")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUserPredictionCount(CancellationToken cancellationToken)
    {
        var count = await _predictionLog.CountByUserAsync(GetUserId(), cancellationToken);
        return Ok(new { count });
    }
}
