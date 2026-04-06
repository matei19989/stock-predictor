using Microsoft.Extensions.Logging;
using StockPredictor.Application.Interfaces.Services;
using StockPredictor.Domain.Constants;

namespace StockPredictor.Infrastructure.Seeding;

public class DataSeeder
{
    private readonly IStockService _stocks;
    private readonly ILogger<DataSeeder> _logger;

    public DataSeeder(IStockService stocks, ILogger<DataSeeder> logger)
    {
        _stocks = stocks;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Seeding default stocks: {Tickers}", string.Join(", ", DefaultWatchlist.Tickers));

        foreach (var ticker in DefaultWatchlist.Tickers)
        {
            try
            {
                await _stocks.EnsureStockExistsAsync(ticker, cancellationToken);
                _logger.LogInformation("Seeded: {Ticker}", ticker);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not seed {Ticker} — skipping", ticker);
            }
        }
    }
}
