# Persistent Recently Viewed + Prediction Log — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage-backed "Recently Viewed" and "Prediction Log" with database-persisted data via two new tables and API endpoints, then swap the frontend hooks to use the API.

**Architecture:** Two new domain entities (`StockVisit`, `UserPredictionLog`) with EF Core configurations, repository interfaces + implementations, and controller endpoints. Frontend hooks swap from localStorage to API calls while keeping the same public interface so consuming components don't change.

**Tech Stack:** .NET 9, EF Core (PostgreSQL), ASP.NET Core Web API, React, TypeScript, Axios

**Spec:** `docs/superpowers/specs/2026-04-12-persistent-visits-predictions-design.md`

---

## File Map

### Backend — Create

| File | Responsibility |
|------|----------------|
| `src/backend/Domain/Entities/StockVisit.cs` | Entity: user visited a stock |
| `src/backend/Domain/Entities/UserPredictionLog.cs` | Entity: user requested a prediction |
| `src/backend/Application/Interfaces/Repositories/IStockVisitRepository.cs` | Repository interface |
| `src/backend/Application/Interfaces/Repositories/IUserPredictionLogRepository.cs` | Repository interface |
| `src/backend/Application/DTOs/Stocks/RecentlyViewedDto.cs` | DTO for recently viewed response |
| `src/backend/Infrastructure/Repositories/StockVisitRepository.cs` | Repository implementation |
| `src/backend/Infrastructure/Repositories/UserPredictionLogRepository.cs` | Repository implementation |
| `src/backend/Infrastructure/Persistence/Configurations/StockVisitConfiguration.cs` | EF fluent config |
| `src/backend/Infrastructure/Persistence/Configurations/UserPredictionLogConfiguration.cs` | EF fluent config |

### Backend — Modify

| File | Change |
|------|--------|
| `src/backend/Domain/Entities/User.cs` | Add navigation properties |
| `src/backend/Domain/Entities/Stock.cs` | Add navigation properties |
| `src/backend/Infrastructure/Persistence/AppDbContext.cs` | Add 2 DbSets |
| `src/backend/Infrastructure/DependencyInjection.cs` | Register 2 repos |
| `src/backend/API/Controllers/StocksController.cs` | Add visit + recently-viewed endpoints |
| `src/backend/API/Controllers/PredictionsController.cs` | Add user/count endpoint + log after predict |

### Frontend — Modify

| File | Change |
|------|--------|
| `src/frontend/src/services/stockService.ts` | Add `recordVisit()` + `getRecentlyViewed()` |
| `src/frontend/src/services/predictionService.ts` | Add `getUserPredictionCount()` |
| `src/frontend/src/hooks/useRecentlyViewed.ts` | Swap localStorage to API |
| `src/frontend/src/hooks/usePredictionLog.ts` | Swap localStorage to API, remove `log()` |
| `src/frontend/src/pages/StockDetailPage.tsx` | Remove `usePredictionLog` usage |

---

### Task 1: Domain Entities

**Files:**
- Create: `src/backend/Domain/Entities/StockVisit.cs`
- Create: `src/backend/Domain/Entities/UserPredictionLog.cs`
- Modify: `src/backend/Domain/Entities/User.cs`
- Modify: `src/backend/Domain/Entities/Stock.cs`

- [ ] **Step 1: Create StockVisit entity**

```csharp
namespace StockPredictor.Domain.Entities;

public class StockVisit
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid StockId { get; set; }
    public DateTime VisitedAt { get; set; }

    public User User { get; set; } = null!;
    public Stock Stock { get; set; } = null!;
}
```

- [ ] **Step 2: Create UserPredictionLog entity**

```csharp
using StockPredictor.Domain.Enums;

namespace StockPredictor.Domain.Entities;

public class UserPredictionLog
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid StockId { get; set; }
    public Horizon Horizon { get; set; }
    public DateTime RequestedAt { get; set; }

    public User User { get; set; } = null!;
    public Stock Stock { get; set; } = null!;
}
```

- [ ] **Step 3: Add navigation properties to User.cs**

Add after the existing `WatchlistItems` collection:

```csharp
    public ICollection<StockVisit> StockVisits { get; set; } = [];
    public ICollection<UserPredictionLog> PredictionLogs { get; set; } = [];
```

- [ ] **Step 4: Add navigation properties to Stock.cs**

Add after the existing `Predictions` collection:

```csharp
    public ICollection<StockVisit> StockVisits { get; set; } = [];
    public ICollection<UserPredictionLog> PredictionLogs { get; set; } = [];
```

- [ ] **Step 5: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/backend && dotnet build --no-restore 2>&1 | tail -5`
Expected: Build succeeded

- [ ] **Step 6: Commit**

```bash
git add src/backend/Domain/Entities/StockVisit.cs src/backend/Domain/Entities/UserPredictionLog.cs src/backend/Domain/Entities/User.cs src/backend/Domain/Entities/Stock.cs
git commit -m "feat: add StockVisit and UserPredictionLog domain entities"
```

---

### Task 2: EF Configurations + DbContext + Migration

**Files:**
- Create: `src/backend/Infrastructure/Persistence/Configurations/StockVisitConfiguration.cs`
- Create: `src/backend/Infrastructure/Persistence/Configurations/UserPredictionLogConfiguration.cs`
- Modify: `src/backend/Infrastructure/Persistence/AppDbContext.cs`

- [ ] **Step 1: Create StockVisitConfiguration**

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPredictor.Domain.Entities;

namespace StockPredictor.Infrastructure.Persistence.Configurations;

public class StockVisitConfiguration : IEntityTypeConfiguration<StockVisit>
{
    public void Configure(EntityTypeBuilder<StockVisit> builder)
    {
        builder.HasKey(v => v.Id);
        builder.HasIndex(v => new { v.UserId, v.StockId }).IsUnique();
        builder.HasOne(v => v.User)
               .WithMany(u => u.StockVisits)
               .HasForeignKey(v => v.UserId)
               .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(v => v.Stock)
               .WithMany(s => s.StockVisits)
               .HasForeignKey(v => v.StockId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
```

- [ ] **Step 2: Create UserPredictionLogConfiguration**

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using StockPredictor.Domain.Entities;

namespace StockPredictor.Infrastructure.Persistence.Configurations;

public class UserPredictionLogConfiguration : IEntityTypeConfiguration<UserPredictionLog>
{
    public void Configure(EntityTypeBuilder<UserPredictionLog> builder)
    {
        builder.HasKey(p => p.Id);
        builder.HasIndex(p => new { p.UserId, p.StockId, p.Horizon }).IsUnique();
        builder.HasOne(p => p.User)
               .WithMany(u => u.PredictionLogs)
               .HasForeignKey(p => p.UserId)
               .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(p => p.Stock)
               .WithMany(s => s.PredictionLogs)
               .HasForeignKey(p => p.StockId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
```

- [ ] **Step 3: Add DbSets to AppDbContext**

Add after the existing `Predictions` DbSet line:

```csharp
    public DbSet<StockVisit> StockVisits => Set<StockVisit>();
    public DbSet<UserPredictionLog> UserPredictionLogs => Set<UserPredictionLog>();
```

- [ ] **Step 4: Generate EF migration**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/backend && dotnet ef migrations add AddStockVisitsAndPredictionLogs --project Infrastructure --startup-project API 2>&1 | tail -5`
Expected: Migration file created successfully

- [ ] **Step 5: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/backend && dotnet build --no-restore 2>&1 | tail -5`
Expected: Build succeeded

- [ ] **Step 6: Commit**

```bash
git add src/backend/Infrastructure/Persistence/Configurations/StockVisitConfiguration.cs src/backend/Infrastructure/Persistence/Configurations/UserPredictionLogConfiguration.cs src/backend/Infrastructure/Persistence/AppDbContext.cs src/backend/Infrastructure/Persistence/Migrations/
git commit -m "feat: add EF configurations and migration for StockVisit and UserPredictionLog"
```

---

### Task 3: Repository Interfaces

**Files:**
- Create: `src/backend/Application/Interfaces/Repositories/IStockVisitRepository.cs`
- Create: `src/backend/Application/Interfaces/Repositories/IUserPredictionLogRepository.cs`

- [ ] **Step 1: Create IStockVisitRepository**

```csharp
using StockPredictor.Domain.Entities;

namespace StockPredictor.Application.Interfaces.Repositories;

public interface IStockVisitRepository
{
    Task<List<StockVisit>> GetRecentAsync(Guid userId, int limit = 5, CancellationToken cancellationToken = default);
    Task UpsertAsync(StockVisit visit, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 2: Create IUserPredictionLogRepository**

```csharp
using StockPredictor.Domain.Entities;

namespace StockPredictor.Application.Interfaces.Repositories;

public interface IUserPredictionLogRepository
{
    Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task UpsertAsync(UserPredictionLog entry, CancellationToken cancellationToken = default);
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/backend && dotnet build --no-restore 2>&1 | tail -5`
Expected: Build succeeded

- [ ] **Step 4: Commit**

```bash
git add src/backend/Application/Interfaces/Repositories/IStockVisitRepository.cs src/backend/Application/Interfaces/Repositories/IUserPredictionLogRepository.cs
git commit -m "feat: add repository interfaces for StockVisit and UserPredictionLog"
```

---

### Task 4: Repository Implementations

**Files:**
- Create: `src/backend/Infrastructure/Repositories/StockVisitRepository.cs`
- Create: `src/backend/Infrastructure/Repositories/UserPredictionLogRepository.cs`
- Modify: `src/backend/Infrastructure/DependencyInjection.cs`

- [ ] **Step 1: Create StockVisitRepository**

```csharp
using Microsoft.EntityFrameworkCore;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Repositories;

public class StockVisitRepository : IStockVisitRepository
{
    private readonly AppDbContext _db;

    public StockVisitRepository(AppDbContext db) => _db = db;

    public Task<List<StockVisit>> GetRecentAsync(Guid userId, int limit = 5, CancellationToken cancellationToken = default) =>
        _db.StockVisits
           .AsNoTracking()
           .Include(v => v.Stock)
           .Where(v => v.UserId == userId)
           .OrderByDescending(v => v.VisitedAt)
           .Take(limit)
           .ToListAsync(cancellationToken);

    public async Task UpsertAsync(StockVisit visit, CancellationToken cancellationToken = default)
    {
        var existing = await _db.StockVisits
            .FirstOrDefaultAsync(v => v.UserId == visit.UserId && v.StockId == visit.StockId, cancellationToken);

        if (existing != null)
        {
            existing.VisitedAt = visit.VisitedAt;
        }
        else
        {
            await _db.StockVisits.AddAsync(visit, cancellationToken);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}
```

- [ ] **Step 2: Create UserPredictionLogRepository**

```csharp
using Microsoft.EntityFrameworkCore;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Infrastructure.Persistence;

namespace StockPredictor.Infrastructure.Repositories;

public class UserPredictionLogRepository : IUserPredictionLogRepository
{
    private readonly AppDbContext _db;

    public UserPredictionLogRepository(AppDbContext db) => _db = db;

    public Task<int> CountByUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _db.UserPredictionLogs
           .CountAsync(p => p.UserId == userId, cancellationToken);

    public async Task UpsertAsync(UserPredictionLog entry, CancellationToken cancellationToken = default)
    {
        var existing = await _db.UserPredictionLogs
            .FirstOrDefaultAsync(p => p.UserId == entry.UserId && p.StockId == entry.StockId && p.Horizon == entry.Horizon, cancellationToken);

        if (existing != null)
        {
            existing.RequestedAt = entry.RequestedAt;
        }
        else
        {
            await _db.UserPredictionLogs.AddAsync(entry, cancellationToken);
        }

        await _db.SaveChangesAsync(cancellationToken);
    }
}
```

- [ ] **Step 3: Register repositories in DependencyInjection.cs**

Add after the existing `IPredictionRepository` registration line:

```csharp
        services.AddScoped<IStockVisitRepository, StockVisitRepository>();
        services.AddScoped<IUserPredictionLogRepository, UserPredictionLogRepository>();
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/backend && dotnet build --no-restore 2>&1 | tail -5`
Expected: Build succeeded

- [ ] **Step 5: Commit**

```bash
git add src/backend/Infrastructure/Repositories/StockVisitRepository.cs src/backend/Infrastructure/Repositories/UserPredictionLogRepository.cs src/backend/Infrastructure/DependencyInjection.cs
git commit -m "feat: add repository implementations and DI registration for StockVisit and UserPredictionLog"
```

---

### Task 5: DTO + StocksController Endpoints

**Files:**
- Create: `src/backend/Application/DTOs/Stocks/RecentlyViewedDto.cs`
- Modify: `src/backend/API/Controllers/StocksController.cs`

- [ ] **Step 1: Create RecentlyViewedDto**

```csharp
namespace StockPredictor.Application.DTOs.Stocks;

public record RecentlyViewedDto(string Ticker, string? Name);
```

- [ ] **Step 2: Add visit + recently-viewed endpoints to StocksController**

Add the two new repo dependencies to the controller. Change the constructor and field:

Replace the existing constructor area:

```csharp
public class StocksController : ControllerBase
{
    private readonly IStockService _stocks;

    public StocksController(IStockService stocks) => _stocks = stocks;
```

With:

```csharp
public class StocksController : ControllerBase
{
    private readonly IStockService _stocks;
    private readonly IStockRepository _stockRepo;
    private readonly IStockVisitRepository _visits;

    public StocksController(IStockService stocks, IStockRepository stockRepo, IStockVisitRepository visits)
    {
        _stocks = stocks;
        _stockRepo = stockRepo;
        _visits = visits;
    }
```

Add the required using statements at the top of the file:

```csharp
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
```

Add the two new endpoints after the existing `GetDetail` method:

```csharp
    [HttpPost("{ticker}/visit")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RecordVisit(string ticker, CancellationToken cancellationToken)
    {
        var stock = await _stockRepo.GetByTickerAsync(ticker.ToUpper(), cancellationToken);
        if (stock == null) return NotFound();

        await _visits.UpsertAsync(new StockVisit
        {
            Id = Guid.NewGuid(),
            UserId = GetUserId(),
            StockId = stock.Id,
            VisitedAt = DateTime.UtcNow,
        }, cancellationToken);

        return NoContent();
    }

    [HttpGet("recently-viewed")]
    [ProducesResponseType(typeof(List<RecentlyViewedDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecentlyViewed(CancellationToken cancellationToken)
    {
        var visits = await _visits.GetRecentAsync(GetUserId(), 5, cancellationToken);
        var dtos = visits.Select(v => new RecentlyViewedDto(v.Stock.Ticker, v.Stock.Name)).ToList();
        return Ok(dtos);
    }
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/backend && dotnet build --no-restore 2>&1 | tail -5`
Expected: Build succeeded

- [ ] **Step 4: Commit**

```bash
git add src/backend/Application/DTOs/Stocks/RecentlyViewedDto.cs src/backend/API/Controllers/StocksController.cs
git commit -m "feat: add stock visit recording and recently-viewed endpoints"
```

---

### Task 6: PredictionsController — Count Endpoint + Log After Predict

**Files:**
- Modify: `src/backend/API/Controllers/PredictionsController.cs`

- [ ] **Step 1: Add dependencies and helper to PredictionsController**

Replace the existing constructor area:

```csharp
public class PredictionsController : ControllerBase
{
    private readonly IPredictionService _predictions;

    public PredictionsController(IPredictionService predictions) => _predictions = predictions;
```

With:

```csharp
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
```

Add the required using statements at the top:

```csharp
using System.Security.Claims;
using StockPredictor.Application.Exceptions;
using StockPredictor.Application.Interfaces.Repositories;
using StockPredictor.Domain.Entities;
using StockPredictor.Domain.Enums;
```

- [ ] **Step 2: Update Predict method to log after success**

Replace the existing `Predict` method:

```csharp
    [HttpPost]
    [ProducesResponseType(typeof(PredictionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status501NotImplemented)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Predict([FromBody] PredictRequest request, CancellationToken cancellationToken)
    {
        var result = await _predictions.GetOrCreateAsync(request.Ticker.ToUpper(), request.Horizon, cancellationToken);

        // Log prediction for the user (fire-and-forget style — don't fail the request if logging fails)
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
```

- [ ] **Step 3: Add count endpoint**

Add after the existing `GetLatest` method:

```csharp
    [HttpGet("user/count")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUserPredictionCount(CancellationToken cancellationToken)
    {
        var count = await _predictionLog.CountByUserAsync(GetUserId(), cancellationToken);
        return Ok(new { count });
    }
```

- [ ] **Step 4: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/backend && dotnet build --no-restore 2>&1 | tail -5`
Expected: Build succeeded

- [ ] **Step 5: Commit**

```bash
git add src/backend/API/Controllers/PredictionsController.cs
git commit -m "feat: add prediction logging and user prediction count endpoint"
```

---

### Task 7: Frontend — API Functions

**Files:**
- Modify: `src/frontend/src/services/stockService.ts`
- Modify: `src/frontend/src/services/predictionService.ts`

- [ ] **Step 1: Add API functions to stockService.ts**

Add at the end of the file:

```ts
export async function recordVisit(ticker: string): Promise<void> {
  await api.post(`/api/stocks/${ticker}/visit`);
}

export async function getRecentlyViewed(): Promise<{ ticker: string; name: string | null }[]> {
  const { data } = await api.get<{ ticker: string; name: string | null }[]>('/api/stocks/recently-viewed');
  return data;
}
```

- [ ] **Step 2: Add API function to predictionService.ts**

Add at the end of the file:

```ts
export async function getUserPredictionCount(): Promise<number> {
  const { data } = await api.get<{ count: number }>('/api/predictions/user/count');
  return data.count;
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/services/stockService.ts src/frontend/src/services/predictionService.ts
git commit -m "feat: add API functions for stock visits and prediction count"
```

---

### Task 8: Frontend — Swap useRecentlyViewed Hook

**Files:**
- Modify: `src/frontend/src/hooks/useRecentlyViewed.ts`

- [ ] **Step 1: Rewrite the hook to use API**

Replace the entire file contents:

```ts
import { useState, useEffect, useCallback } from 'react';
import * as stockService from '@/services/stockService';

const MAX_ITEMS = 5;

interface RecentlyViewedItem {
  ticker: string;
  name: string | null;
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);

  useEffect(() => {
    stockService.getRecentlyViewed()
      .then(setItems)
      .catch(() => {});
  }, []);

  const add = useCallback((ticker: string) => {
    // Optimistically update local state
    setItems((prev) => {
      const filtered = prev.filter((i) => i.ticker !== ticker);
      return [{ ticker, name: null }, ...filtered].slice(0, MAX_ITEMS);
    });

    // Fire-and-forget API call
    stockService.recordVisit(ticker).catch(() => {});
  }, []);

  return { items, add };
}
```

- [ ] **Step 2: Update RecentlyViewed.tsx to use name from hook if available**

The `RecentlyViewed.tsx` component destructures `{ ticker }` from items. The `name` field is now available but the component doesn't use it (it only shows the ticker). No change needed — the interface is compatible.

- [ ] **Step 3: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/hooks/useRecentlyViewed.ts
git commit -m "feat: swap useRecentlyViewed from localStorage to API"
```

---

### Task 9: Frontend — Swap usePredictionLog Hook + Clean Up StockDetailPage

**Files:**
- Modify: `src/frontend/src/hooks/usePredictionLog.ts`
- Modify: `src/frontend/src/pages/StockDetailPage.tsx`

- [ ] **Step 1: Rewrite usePredictionLog to use API**

Replace the entire file contents:

```ts
import { useState, useEffect } from 'react';
import * as predictionService from '@/services/predictionService';

export function usePredictionLog() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    predictionService.getUserPredictionCount()
      .then(setCount)
      .catch(() => {});
  }, []);

  return { count };
}
```

- [ ] **Step 2: Remove usePredictionLog from StockDetailPage**

In `src/frontend/src/pages/StockDetailPage.tsx`:

Remove the import line:
```ts
import { usePredictionLog } from '@/hooks/usePredictionLog';
```

Remove the hook call line:
```ts
  const { log: logPrediction } = usePredictionLog();
```

Replace the `onPredict` handler:

From:
```tsx
          onPredict={async (h) => {
            await predict(ticker!, h);
            logPrediction(ticker!, h);
          }}
```

To:
```tsx
          onPredict={(h) => predict(ticker!, h)}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /c/Users/Matei/Desktop/StonksForecast/src/frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/hooks/usePredictionLog.ts src/frontend/src/pages/StockDetailPage.tsx
git commit -m "feat: swap usePredictionLog to API, remove client-side logging from StockDetailPage"
```

---

### Task 10: Apply Migration to Docker Database

**Files:** None (runtime operation)

- [ ] **Step 1: Rebuild and restart Docker containers**

Run:
```bash
cd /c/Users/Matei/Desktop/StonksForecast && docker compose build --no-cache backend frontend 2>&1 | tail -10
```

Then:
```bash
cd /c/Users/Matei/Desktop/StonksForecast && docker compose up -d 2>&1
```

The backend applies migrations on startup via EF Core's `Database.Migrate()` (or the migration runs on first request). Verify by checking the backend logs:

```bash
docker compose logs backend 2>&1 | tail -20
```

- [ ] **Step 2: Verify endpoints work**

Test the visit endpoint:
```bash
# First get a JWT token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"mateiserband@gmail.com","password":"lego2003"}' | jq -r '.token')

# Record a visit
curl -s -X POST http://localhost:3000/api/stocks/AAPL/visit -H "Authorization: Bearer $TOKEN" -w "\n%{http_code}"

# Get recently viewed
curl -s http://localhost:3000/api/stocks/recently-viewed -H "Authorization: Bearer $TOKEN" | jq .

# Get prediction count
curl -s http://localhost:3000/api/predictions/user/count -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: 204 for visit, list of tickers for recently-viewed, `{ "count": 0 }` for prediction count.

- [ ] **Step 3: Visual check in browser**

Navigate to `http://localhost:3000`, log in, visit several stocks, open sidebar — verify "Recently Viewed" populates. Go to Settings — verify "Predictions" count is 0. Run a prediction on any stock, go back to Settings — verify count is now 1.
