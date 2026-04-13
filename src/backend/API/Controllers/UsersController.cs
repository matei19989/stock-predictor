using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using StockPredictor.Application.DTOs.Users;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.Services;

namespace StockPredictor.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserPreferencesService _preferences;

    public UsersController(IUserPreferencesService preferences) => _preferences = preferences;

    private Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id)
            ? id
            : throw new UnauthorizedException("Missing or invalid user identifier.");
    }

    [HttpGet("preferences")]
    [ProducesResponseType(typeof(UserPreferencesDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetPreferences(CancellationToken cancellationToken)
    {
        var preferences = await _preferences.GetAsync(GetUserId(), cancellationToken);
        return Ok(preferences);
    }

    [HttpPut("preferences")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdatePreferences(
        [FromBody] UserPreferencesDto preferences,
        CancellationToken cancellationToken)
    {
        await _preferences.UpdateAsync(GetUserId(), preferences, cancellationToken);
        return NoContent();
    }
}
