using System.Text.Json;
using StockPredictor.Application.DTOs.Users;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Application.Interfaces.Services;

namespace StockPredictor.Infrastructure.Services;

public class UserPreferencesService : IUserPreferencesService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly IUserRepository _userRepository;

    public UserPreferencesService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<UserPreferencesDto> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException($"User '{userId}' not found.");

        if (string.IsNullOrEmpty(user.PreferencesJson))
            return new UserPreferencesDto();

        return JsonSerializer.Deserialize<UserPreferencesDto>(user.PreferencesJson, JsonOptions)
            ?? new UserPreferencesDto();
    }

    public async Task UpdateAsync(Guid userId, UserPreferencesDto preferences, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken)
            ?? throw new NotFoundException($"User '{userId}' not found.");

        user.PreferencesJson = JsonSerializer.Serialize(preferences, JsonOptions);
        await _userRepository.UpdateAsync(user, cancellationToken);
    }
}
