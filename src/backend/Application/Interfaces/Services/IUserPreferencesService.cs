using StockPredictor.Application.DTOs.Users;

namespace StockPredictor.Application.Interfaces.Services;

public interface IUserPreferencesService
{
    Task<UserPreferencesDto> GetAsync(Guid userId, CancellationToken cancellationToken = default);
    Task UpdateAsync(Guid userId, UserPreferencesDto preferences, CancellationToken cancellationToken = default);
}
