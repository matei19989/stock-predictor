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

    public StocksController(IStockService stocks) => _stocks = stocks;

    private Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id)
            ? id
            : throw new UnauthorizedException("Missing or invalid user identifier.");
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
}
