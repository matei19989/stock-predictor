using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPredictor.Application.DTOs.Watchlist;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.Services;

namespace StockPredictor.API.Controllers;

[ApiController]
[Route("api/watchlist")]
[Authorize]
public class WatchlistController : ControllerBase
{
    private readonly IWatchlistService _watchlist;

    public WatchlistController(IWatchlistService watchlist) => _watchlist = watchlist;

    private Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id)
            ? id
            : throw new UnauthorizedException("Missing or invalid user identifier.");
    }

    [HttpGet]
    [ProducesResponseType(typeof(List<WatchlistItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWatchlist(CancellationToken cancellationToken) =>
        Ok(await _watchlist.GetAsync(GetUserId(), cancellationToken));

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> AddToWatchlist([FromBody] AddToWatchlistRequest request, CancellationToken cancellationToken)
    {
        await _watchlist.AddAsync(GetUserId(), request.Ticker, cancellationToken);
        return Created(string.Empty, null);
    }

    [HttpDelete("{ticker}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveFromWatchlist(string ticker, CancellationToken cancellationToken)
    {
        await _watchlist.RemoveAsync(GetUserId(), ticker.ToUpper(), cancellationToken);
        return NoContent();
    }
}
