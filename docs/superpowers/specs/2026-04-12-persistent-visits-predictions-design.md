# Persistent Recently Viewed + Prediction Log

**Date:** 2026-04-12
**Scope:** Backend (new tables, endpoints) + Frontend (swap localStorage hooks to API)

---

## Problem

The sidebar's "Recently Viewed" and Settings page "Predictions" count are stored in `localStorage`. This data is lost when switching browsers, clearing cache, or using incognito mode. Users expect this data to persist with their account.

---

## Solution

### Part A: Backend — New Entities

#### A1. StockVisit Entity

**File:** `src/backend/Domain/Entities/StockVisit.cs`

```csharp
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

**Constraints:**
- Unique index on `(UserId, StockId)` — one row per user-stock pair, upserted on revisit
- Cascade delete from User and Stock

#### A2. UserPredictionLog Entity

**File:** `src/backend/Domain/Entities/UserPredictionLog.cs`

```csharp
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

**Constraints:**
- Unique index on `(UserId, StockId, Horizon)` — one row per user-stock-horizon, upserted on re-predict
- Cascade delete from User and Stock

---

### Part B: Backend — Repository Layer

#### B1. IStockVisitRepository

**File:** `src/backend/Application/Interfaces/Repositories/IStockVisitRepository.cs`

```csharp
public interface IStockVisitRepository
{
    Task<List<StockVisit>> GetRecentAsync(Guid userId, int limit = 5, CancellationToken ct = default);
    Task UpsertAsync(StockVisit visit, CancellationToken ct = default);
}
```

- `GetRecentAsync` — returns visits ordered by `VisitedAt DESC`, limited to `limit`, with `Stock` included
- `UpsertAsync` — if row exists for (userId, stockId), update `VisitedAt`; otherwise insert

#### B2. IUserPredictionLogRepository

**File:** `src/backend/Application/Interfaces/Repositories/IUserPredictionLogRepository.cs`

```csharp
public interface IUserPredictionLogRepository
{
    Task<int> CountByUserAsync(Guid userId, CancellationToken ct = default);
    Task UpsertAsync(UserPredictionLog entry, CancellationToken ct = default);
}
```

- `CountByUserAsync` — returns total distinct predictions for user
- `UpsertAsync` — if row exists for (userId, stockId, horizon), update `RequestedAt`; otherwise insert

---

### Part C: Backend — API Endpoints

#### C1. Stock Visit Endpoints (on StocksController)

`StocksController` already has `GetUserId()`.

**`POST /api/stocks/{ticker}/visit`**
- Looks up stock by ticker via `IStockRepository.GetByTickerAsync()`
- Returns 404 if stock not found
- Calls `IStockVisitRepository.UpsertAsync()`
- Returns `204 No Content`

**`GET /api/stocks/recently-viewed`**
- Calls `IStockVisitRepository.GetRecentAsync(userId, 5)`
- Returns `200` with `List<RecentlyViewedDto>`

**RecentlyViewedDto:**
```csharp
public record RecentlyViewedDto(string Ticker, string? Name, string? LatestSignal, double? SignalConfidence);
```

To populate `LatestSignal` and `SignalConfidence`, the repository query joins through `Stock` → `Prediction` (latest valid prediction for the stock). Alternatively, the controller/service can enrich after fetching visits. The simpler approach: return just `Ticker` and `Name` from the backend, and let the frontend cross-reference signals from `WatchlistContext` (which it already does in the current `RecentlyViewed.tsx` component). This avoids a complex join and keeps the endpoint simple.

**Decision:** Return only `Ticker` and `Name`. Frontend handles signal display.

**Simplified RecentlyViewedDto:**
```csharp
public record RecentlyViewedDto(string Ticker, string? Name);
```

#### C2. Prediction Log Endpoint (on PredictionsController)

**`GET /api/predictions/user/count`**
- `PredictionsController` needs `GetUserId()` — add the same helper pattern from `WatchlistController`/`StocksController`
- Calls `IUserPredictionLogRepository.CountByUserAsync(userId)`
- Returns `200` with `{ count: int }`

**Prediction log write point:**
- In `PredictionsController.Predict()`, after the successful `GetOrCreateAsync()` call, resolve `StockId` and call `IUserPredictionLogRepository.UpsertAsync()`
- This keeps `PredictionService` unchanged (no userId param needed)
- The controller already has the ticker; it needs the stockId — look it up via `IStockRepository.GetByTickerAsync()`

---

### Part D: Backend — EF Configuration + Migration

**New DbSets in `AppDbContext`:**
```csharp
public DbSet<StockVisit> StockVisits => Set<StockVisit>();
public DbSet<UserPredictionLog> UserPredictionLogs => Set<UserPredictionLog>();
```

**Fluent API configs** (new files in `Persistence/Configurations/`):
- `StockVisitConfiguration.cs` — unique index on `(UserId, StockId)`, cascade deletes
- `UserPredictionLogConfiguration.cs` — unique index on `(UserId, StockId, Horizon)`, cascade deletes

**Migration:** `dotnet ef migrations add AddStockVisitsAndPredictionLogs`

---

### Part E: Backend — Dependency Injection

In `DependencyInjection.cs`, register:
```csharp
services.AddScoped<IStockVisitRepository, StockVisitRepository>();
services.AddScoped<IUserPredictionLogRepository, UserPredictionLogRepository>();
```

No new service layer needed — the controllers call repositories directly. The logic is simple enough (upsert, count, list) that a service would just be a pass-through.

---

### Part F: Frontend — Swap Hooks to API

#### F1. New API functions

**`src/frontend/src/services/stockService.ts`** — add:
```ts
export async function recordVisit(ticker: string): Promise<void> { ... }
export async function getRecentlyViewed(): Promise<{ ticker: string; name: string | null }[]> { ... }
```

**`src/frontend/src/services/predictionService.ts`** — add:
```ts
export async function getUserPredictionCount(): Promise<number> { ... }
```

#### F2. Update useRecentlyViewed hook

**`src/frontend/src/hooks/useRecentlyViewed.ts`**

- Remove all localStorage logic
- On mount: call `getRecentlyViewed()` → set items
- `add(ticker)`: call `recordVisit(ticker)` (fire-and-forget), then optimistically prepend to local state (dedup, cap at 5)
- Export same interface `{ items, add }` so consumers don't change

#### F3. Update usePredictionLog hook

**`src/frontend/src/hooks/usePredictionLog.ts`**

- Remove all localStorage logic
- On mount: call `getUserPredictionCount()` → set count
- Remove `log()` function — backend logs automatically from PredictionsController
- Export `{ count }` (no more `log`)

#### F4. Update StockDetailPage

- Remove `usePredictionLog` import and `logPrediction` call (no longer needed — backend handles it)
- `useRecentlyViewed().add(ticker)` still called on mount (now hits API)

#### F5. Update SettingsPage

- No changes needed — already reads `usePredictionLog().count`

---

## Files to Create (Backend)

| File | Purpose |
|------|---------|
| `Domain/Entities/StockVisit.cs` | Entity |
| `Domain/Entities/UserPredictionLog.cs` | Entity |
| `Application/Interfaces/Repositories/IStockVisitRepository.cs` | Repository interface |
| `Application/Interfaces/Repositories/IUserPredictionLogRepository.cs` | Repository interface |
| `Application/DTOs/Stocks/RecentlyViewedDto.cs` | DTO |
| `Infrastructure/Repositories/StockVisitRepository.cs` | Repository implementation |
| `Infrastructure/Repositories/UserPredictionLogRepository.cs` | Repository implementation |
| `Infrastructure/Persistence/Configurations/StockVisitConfiguration.cs` | EF fluent config |
| `Infrastructure/Persistence/Configurations/UserPredictionLogConfiguration.cs` | EF fluent config |

## Files to Modify (Backend)

| File | Change |
|------|--------|
| `Infrastructure/Persistence/AppDbContext.cs` | Add 2 DbSets |
| `API/Controllers/StocksController.cs` | Add `POST visit` + `GET recently-viewed` |
| `API/Controllers/PredictionsController.cs` | Add `GET user/count` + log after predict |
| `Infrastructure/DependencyInjection.cs` | Register 2 repos |

## Files to Modify (Frontend)

| File | Change |
|------|--------|
| `src/services/stockService.ts` | Add `recordVisit()` + `getRecentlyViewed()` |
| `src/services/predictionService.ts` | Add `getUserPredictionCount()` |
| `src/hooks/useRecentlyViewed.ts` | Swap localStorage → API |
| `src/hooks/usePredictionLog.ts` | Swap localStorage → API, remove `log()` |
| `src/pages/StockDetailPage.tsx` | Remove `usePredictionLog` usage |

## Out of Scope

- No changes to Prediction entity or PredictionService signature
- No new service layer (controllers call repos directly)
- No changes to sidebar components (RecentlyViewed.tsx, PortfolioPulse.tsx)
- No changes to SettingsPage.tsx
