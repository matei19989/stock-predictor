using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPredictor.Application.DTOs.Stocks;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.Services;

namespace StockPredictor.API.Controllers;

[ApiController]
[Route("api/stocks")]
[Authorize]
public class StocksController : ControllerBase
{
    private readonly IStockService _stocks;
    private readonly IStockVisitService _visits;

    public StocksController(IStockService stocks, IStockVisitService visits)
    {
        _stocks = stocks;
        _visits = visits;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id)
            ? id
            : throw new UnauthorizedException("Missing or invalid user identifier.");
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<StockOverviewDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<StockOverviewDto>>> GetAll(CancellationToken cancellationToken)
    {
        var result = await _stocks.GetAllOverviewAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("search")]
    [ProducesResponseType(typeof(List<StockSearchResultDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search([FromQuery] string q, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length > 50)
            return Ok(new List<StockSearchResultDto>());

        return Ok(await _stocks.SearchAsync(q.Trim(), GetUserId(), cancellationToken));
    }

    [HttpGet("{ticker}")]
    [ProducesResponseType(typeof(StockDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDetail(string ticker, CancellationToken cancellationToken) =>
        Ok(await _stocks.GetDetailAsync(ticker.ToUpper(), cancellationToken));

    [HttpPost("{ticker}/visit")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RecordVisit(string ticker, CancellationToken cancellationToken)
    {
        await _visits.RecordAsync(GetUserId(), ticker, cancellationToken);
        return NoContent();
    }

    [HttpGet("recently-viewed")]
    [ProducesResponseType(typeof(List<RecentlyViewedDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecentlyViewed(CancellationToken cancellationToken) =>
        Ok(await _visits.GetRecentlyViewedAsync(GetUserId(), cancellationToken));
}
