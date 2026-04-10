# Integration Fixes Design Spec

**Date:** 2026-04-10
**Scope:** Fix 4 cross-layer integration issues found during audit

## Context

A full integration audit mapped all endpoints, DTOs, and HTTP calls across all three layers (React frontend, .NET backend, Python ML service). The audit confirmed that all 10 frontend endpoints and all 3 backend-to-ML calls match correctly in URLs, HTTP methods, request/response shapes, enums, and error handling.

Four issues were found:

1. ML `/data/{ticker}` doesn't return `name` or `sector` — stocks get null metadata
2. Frontend `JwtPayload` TypeScript type doesn't match actual JWT claim names
3. Correlation ID not propagated from backend to ML service
4. Docker Compose missing GCP credentials for ML sentiment queries

## Issue 1: ML Data Endpoint Missing Name and Sector

### Problem

The ML `GET /data/{ticker}` returns `{ ticker, period, count, data }` but no `name` or `sector`. The backend's `MlStockDataResponse` has optional `Name` and `Sector` fields that always deserialize as null. Every stock created via `StockService.EnsureStockInternalAsync()` — including the 5 pre-seeded defaults — gets null name and sector.

### Solution

Add `name` and `sector` to the ML data endpoint response by reading `yfinance.Ticker(ticker).info`.

### Changes

**ML service:**

- `app/services/data_fetcher.py` — Add `fetch_stock_info(ticker: str) -> dict` that returns `{ "name": str | None, "sector": str | None }` from `yfinance.Ticker(ticker).info["shortName"]` and `yfinance.Ticker(ticker).info["sector"]`. Cache with same 15-min TTL pattern as OHLCV.
- `app/schemas/data.py` — Add `name: str | None = None` and `sector: str | None = None` to `DataResponse`.
- `app/routes/data.py` — After fetching OHLCV, call `fetch_stock_info(ticker)` and include results in response.

**Backend:** No changes. `MlStockDataResponse` already has optional `Name` and `Sector` fields (`MlServiceModels.cs:15-16`). `StockService.EnsureStockInternalAsync()` already reads `data.Name` and `data.Sector` (`StockService.cs:121-122`).

### Error Handling

- If `yfinance.info` fails or returns no name/sector: fields stay `None`. Backend handles null gracefully (Stock.Name and Stock.Sector are nullable).
- OHLCV fetch failure still returns 404/502 as before. Info failure does not block the data response.
- No new failure modes introduced.

## Issue 2: Frontend JwtPayload Type Mismatch

### Problem

Backend uses `ClaimTypes.Name` which .NET's `JwtSecurityTokenHandler` outbound map serializes as `unique_name` in the JWT payload. Frontend's `JwtPayload` type defines `name: string`, which would be `undefined` when decoded.

### Solution

Update the frontend TypeScript type to match reality.

### Changes

- `src/frontend/src/types/index.ts` — Change `name: string` to `unique_name: string` in `JwtPayload` interface.

No other file reads this field. The frontend only uses `exp` from the decoded JWT (for expiry checking in `AuthContext.tsx:38`). User info comes from `AuthResponse` stored in localStorage.

## Issue 3: Correlation ID Not Propagated to ML Service

### Problem

`CorrelationIdMiddleware` generates `X-Correlation-Id` on incoming requests, but `MlServiceClient` doesn't forward this header to outgoing ML service calls. Request traces don't flow end-to-end.

### Solution

Add a `DelegatingHandler` to the ML HttpClient pipeline that reads the current correlation ID from `HttpContext` and attaches it to outbound requests.

### Changes

- `src/backend/Infrastructure/Http/CorrelationIdHandler.cs` (new file) — `DelegatingHandler` that reads `X-Correlation-Id` from `IHttpContextAccessor.HttpContext.Response.Headers` and sets it on the outgoing request.
- `src/backend/Infrastructure/DependencyInjection.cs` — Register `IHttpContextAccessor` (if not already), register `CorrelationIdHandler` as transient, chain `.AddHttpMessageHandler<CorrelationIdHandler>()` onto the ML HttpClient pipeline.

No ML service changes required. The header is simply available in ML request logs if/when request logging is added.

## Issue 4: Docker Compose Missing GCP Credentials for ML

### Problem

`docker-compose.yml` ML service has no `environment` or `volumes` for `GOOGLE_APPLICATION_CREDENTIALS`. GDELT BigQuery sentiment queries silently fail; sentiment features degrade to NaN.

### Solution

Add optional GCP credentials configuration to docker-compose.

### Changes

- `docker-compose.yml` — Add `environment` entry for `GOOGLE_APPLICATION_CREDENTIALS` and a `volumes` mount for the service account JSON file to the `ml` service. Include a comment noting this is optional (sentiment degrades gracefully without it).

## Post-Fix Verification

After all changes, cross-reference every integration point:

1. Verify ML `/data/{ticker}` response now includes `name` and `sector` fields in schema
2. Verify backend `MlStockDataResponse` deserializes the new fields correctly (field names match)
3. Verify `StockService.EnsureStockInternalAsync()` passes name/sector to the Stock entity
4. Verify frontend `JwtPayload` type matches actual JWT claim names
5. Verify `CorrelationIdHandler` is registered in the HttpClient pipeline
6. Verify docker-compose ML service has credentials config
7. Re-check all 10 frontend-to-backend and 3 backend-to-ML contracts still match

## Files Modified

| File | Change |
|------|--------|
| `src/ml/app/services/data_fetcher.py` | Add `fetch_stock_info()` with cache |
| `src/ml/app/schemas/data.py` | Add `name` and `sector` to `DataResponse` |
| `src/ml/app/routes/data.py` | Include name/sector in response |
| `src/frontend/src/types/index.ts` | Fix `JwtPayload.name` to `unique_name` |
| `src/backend/Infrastructure/Http/CorrelationIdHandler.cs` | New: DelegatingHandler for correlation ID |
| `src/backend/Infrastructure/DependencyInjection.cs` | Register handler in HttpClient pipeline |
| `docker-compose.yml` | Add GCP credentials to ML service |
