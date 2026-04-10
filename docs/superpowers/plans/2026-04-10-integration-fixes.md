# Integration Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 cross-layer integration issues: ML missing name/sector, JWT type mismatch, correlation ID propagation, Docker GCP credentials.

**Architecture:** Each fix is independent — touching ML service, frontend types, backend HTTP pipeline, and Docker config respectively. No fix depends on another.

**Tech Stack:** Python/FastAPI, TypeScript/React, C#/.NET 9, Docker Compose

**Spec:** `docs/superpowers/specs/2026-04-10-integration-fixes-design.md`

---

### Task 1: Add `fetch_stock_info()` to ML data fetcher

**Files:**
- Modify: `src/ml/app/services/data_fetcher.py`
- Test: `tests/ml/test_data_fetcher.py`

- [ ] **Step 1: Write tests for `fetch_stock_info()`**

Add to `tests/ml/test_data_fetcher.py`:

```python
from app.services.data_fetcher import fetch_stock_info


@pytest.fixture(autouse=True)
def clear_info_cache():
    from app.services.data_fetcher import _info_cache
    _info_cache.clear()
    yield
    _info_cache.clear()


class TestFetchStockInfo:
    @patch("app.services.data_fetcher.yf")
    def test_returns_name_and_sector(self, mock_yf):
        mock_yf.Ticker.return_value.info = {
            "shortName": "Apple Inc.",
            "sector": "Technology",
        }

        result = fetch_stock_info("AAPL")

        assert result["name"] == "Apple Inc."
        assert result["sector"] == "Technology"

    @patch("app.services.data_fetcher.yf")
    def test_missing_fields_return_none(self, mock_yf):
        mock_yf.Ticker.return_value.info = {}

        result = fetch_stock_info("AAPL")

        assert result["name"] is None
        assert result["sector"] is None

    @patch("app.services.data_fetcher.yf")
    def test_exception_returns_none_values(self, mock_yf):
        from unittest.mock import PropertyMock
        type(mock_yf.Ticker.return_value).info = PropertyMock(
            side_effect=Exception("yfinance error")
        )

        result = fetch_stock_info("AAPL")

        assert result["name"] is None
        assert result["sector"] is None

    @patch("app.services.data_fetcher.yf")
    def test_caches_result(self, mock_yf):
        mock_yf.Ticker.return_value.info = {
            "shortName": "Apple Inc.",
            "sector": "Technology",
        }

        result1 = fetch_stock_info("AAPL")
        result2 = fetch_stock_info("AAPL")

        # yfinance Ticker should only be constructed once
        assert mock_yf.Ticker.call_count == 1
        assert result1 == result2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd src/ml && python -m pytest ../../tests/ml/test_data_fetcher.py::TestFetchStockInfo -v`
Expected: FAIL with `ImportError: cannot import name 'fetch_stock_info'`

- [ ] **Step 3: Implement `fetch_stock_info()`**

Add to `src/ml/app/services/data_fetcher.py` after the existing `_OHLCV_TTL` constant block (after line 15):

```python
# Stock info cache: {ticker: (info_dict, timestamp)}
_info_cache: dict[str, tuple[dict[str, str | None], float]] = {}
_info_lock = threading.Lock()
_INFO_TTL = 900  # 15 minutes, same as OHLCV
```

Add the function after `fetch_ohlcv()` (after line 66):

```python
def fetch_stock_info(ticker: str) -> dict[str, str | None]:
    """Fetch company name and sector for a ticker via yfinance.

    Returns:
        Dict with keys 'name' and 'sector', values may be None.
        Never raises — returns None values on any failure.
    """
    with _info_lock:
        if ticker in _info_cache:
            info, ts = _info_cache[ticker]
            if time.time() - ts < _INFO_TTL:
                logger.info("Info cache hit for %s", ticker)
                return info

    try:
        stock = yf.Ticker(ticker)
        raw = stock.info
        result: dict[str, str | None] = {
            "name": raw.get("shortName"),
            "sector": raw.get("sector"),
        }
    except Exception as e:
        logger.warning("Failed to fetch info for %s: %s", ticker, e)
        result = {"name": None, "sector": None}

    with _info_lock:
        _info_cache[ticker] = (result, time.time())

    return result
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd src/ml && python -m pytest ../../tests/ml/test_data_fetcher.py -v`
Expected: All tests PASS (existing + new)

- [ ] **Step 5: Commit**

```bash
git add src/ml/app/services/data_fetcher.py tests/ml/test_data_fetcher.py
git commit -m "feat(ml): add fetch_stock_info() with cache for name and sector"
```

---

### Task 2: Add name/sector to ML DataResponse schema and route

**Files:**
- Modify: `src/ml/app/schemas/data.py`
- Modify: `src/ml/app/routes/data.py`
- Test: `tests/ml/test_routes.py`

- [ ] **Step 1: Write test for name/sector in data endpoint response**

Add to `tests/ml/test_routes.py` inside `class TestDataEndpoint`:

```python
    @patch("app.routes.data.fetch_stock_info")
    @patch("app.routes.data.fetch_ohlcv")
    def test_returns_name_and_sector(self, mock_fetch: MagicMock, mock_info: MagicMock, app_healthy: FastAPI):
        dates = pd.bdate_range(start="2024-01-02", periods=1)
        mock_fetch.return_value = pd.DataFrame(
            {"Open": [150.0], "High": [155.0], "Low": [148.0], "Close": [153.0], "Volume": [1000000]},
            index=dates,
        )
        mock_info.return_value = {"name": "Apple Inc.", "sector": "Technology"}

        client = TestClient(app_healthy)
        response = client.get("/data/AAPL")

        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "Apple Inc."
        assert body["sector"] == "Technology"

    @patch("app.routes.data.fetch_stock_info")
    @patch("app.routes.data.fetch_ohlcv")
    def test_null_name_sector_when_info_unavailable(self, mock_fetch: MagicMock, mock_info: MagicMock, app_healthy: FastAPI):
        dates = pd.bdate_range(start="2024-01-02", periods=1)
        mock_fetch.return_value = pd.DataFrame(
            {"Open": [150.0], "High": [155.0], "Low": [148.0], "Close": [153.0], "Volume": [1000000]},
            index=dates,
        )
        mock_info.return_value = {"name": None, "sector": None}

        client = TestClient(app_healthy)
        response = client.get("/data/AAPL")

        assert response.status_code == 200
        body = response.json()
        assert body["name"] is None
        assert body["sector"] is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd src/ml && python -m pytest ../../tests/ml/test_routes.py::TestDataEndpoint::test_returns_name_and_sector -v`
Expected: FAIL (response won't have `name` or `sector` fields yet)

- [ ] **Step 3: Update `DataResponse` schema**

In `src/ml/app/schemas/data.py`, add `name` and `sector` to `DataResponse`:

```python
class DataResponse(BaseModel):
    """Response body for GET /data/{ticker}."""

    ticker: str
    period: str
    count: int
    data: list[StockDataPoint]
    name: str | None = None
    sector: str | None = None
```

- [ ] **Step 4: Update data route to include name/sector**

In `src/ml/app/routes/data.py`, add the import and update the handler:

Add import at line 9 (after existing `data_fetcher` import):
```python
from app.services.data_fetcher import fetch_ohlcv, fetch_stock_info
```

Update the return statement (replace lines 50-55):
```python
    info = fetch_stock_info(ticker.upper())

    return DataResponse(
        ticker=ticker.upper(),
        period=period,
        count=len(data_points),
        data=data_points,
        name=info["name"],
        sector=info["sector"],
    )
```

- [ ] **Step 5: Fix existing data route tests**

The existing tests in `TestDataEndpoint` and `TestDataEndpointEdgeCases` that mock `fetch_ohlcv` also need to mock `fetch_stock_info` since the route now calls both. Add the mock to each existing test:

For every existing `@patch("app.routes.data.fetch_ohlcv")` test in `TestDataEndpoint` and `TestDataEndpointEdgeCases`, add `@patch("app.routes.data.fetch_stock_info")` as the decorator above it, and add `mock_info: MagicMock` as the next parameter after `self`. Set a default: `mock_info.return_value = {"name": None, "sector": None}` at the start of each test body.

Exception: the `test_ticker_not_found_returns_404` and `test_fetch_error_returns_502` tests don't need `fetch_stock_info` mocked because `fetch_ohlcv` raises before `fetch_stock_info` is called.

- [ ] **Step 6: Run all tests to verify they pass**

Run: `cd src/ml && python -m pytest ../../tests/ml/test_routes.py -v`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/ml/app/schemas/data.py src/ml/app/routes/data.py tests/ml/test_routes.py
git commit -m "feat(ml): include name and sector in /data/{ticker} response"
```

---

### Task 3: Fix frontend JwtPayload type

**Files:**
- Modify: `src/frontend/src/types/index.ts:103-109`

- [ ] **Step 1: Update JwtPayload interface**

In `src/frontend/src/types/index.ts`, change the `JwtPayload` interface:

```typescript
export interface JwtPayload {
  sub: string;
  email: string;
  unique_name: string;
  exp: number;
  iat: number;
}
```

- [ ] **Step 2: Verify no other file references `payload.name` from JwtPayload**

Run: `grep -r "payload\.name\|\.name" src/frontend/src/utils/jwtUtils.ts src/frontend/src/contexts/AuthContext.tsx`

Expected: No references to `payload.name` — the frontend only uses `payload.exp` (in `jwtUtils.ts:25`). AuthContext gets user info from `AuthResponse`, not from JWT claims.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/types/index.ts
git commit -m "fix(frontend): align JwtPayload type with actual JWT claim names"
```

---

### Task 4: Add CorrelationIdHandler for ML HttpClient

**Files:**
- Create: `src/backend/Infrastructure/Http/CorrelationIdHandler.cs`
- Modify: `src/backend/Infrastructure/DependencyInjection.cs:45-57`
- Test: `tests/backend/StockPredictor.Tests.Unit/Http/CorrelationIdHandlerTests.cs`

- [ ] **Step 1: Write tests for CorrelationIdHandler**

Create `tests/backend/StockPredictor.Tests.Unit/Http/CorrelationIdHandlerTests.cs`:

```csharp
using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Moq;
using StockPredictor.Infrastructure.Http;

namespace StockPredictor.Tests.Unit.Http;

public class CorrelationIdHandlerTests
{
    private static (CorrelationIdHandler handler, CapturingHandler inner) CreateHandler(string? correlationId)
    {
        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        if (correlationId != null)
        {
            var context = new DefaultHttpContext();
            context.Response.Headers["X-Correlation-Id"] = correlationId;
            httpContextAccessor.Setup(a => a.HttpContext).Returns(context);
        }

        var inner = new CapturingHandler();
        var handler = new CorrelationIdHandler(httpContextAccessor.Object) { InnerHandler = inner };
        return (handler, inner);
    }

    [Fact]
    public async Task Adds_CorrelationId_Header_When_Present()
    {
        var (handler, inner) = CreateHandler("test-corr-123");
        var invoker = new HttpMessageInvoker(handler);

        await invoker.SendAsync(new HttpRequestMessage(HttpMethod.Get, "http://ml:8000/health"), CancellationToken.None);

        inner.CapturedRequest.Should().NotBeNull();
        inner.CapturedRequest!.Headers.GetValues("X-Correlation-Id")
            .Should().ContainSingle().Which.Should().Be("test-corr-123");
    }

    [Fact]
    public async Task Skips_Header_When_No_HttpContext()
    {
        var (handler, inner) = CreateHandler(null);
        var invoker = new HttpMessageInvoker(handler);

        await invoker.SendAsync(new HttpRequestMessage(HttpMethod.Get, "http://ml:8000/health"), CancellationToken.None);

        inner.CapturedRequest.Should().NotBeNull();
        inner.CapturedRequest!.Headers.Contains("X-Correlation-Id").Should().BeFalse();
    }

    [Fact]
    public async Task Skips_Header_When_No_CorrelationId_In_Response()
    {
        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.Setup(a => a.HttpContext).Returns(new DefaultHttpContext());

        var inner = new CapturingHandler();
        var handler = new CorrelationIdHandler(httpContextAccessor.Object) { InnerHandler = inner };
        var invoker = new HttpMessageInvoker(handler);

        await invoker.SendAsync(new HttpRequestMessage(HttpMethod.Get, "http://ml:8000/health"), CancellationToken.None);

        inner.CapturedRequest!.Headers.Contains("X-Correlation-Id").Should().BeFalse();
    }

    /// <summary>Captures the outgoing request so tests can inspect headers.</summary>
    private class CapturingHandler : HttpMessageHandler
    {
        public HttpRequestMessage? CapturedRequest { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CapturedRequest = request;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        }
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tests/backend/StockPredictor.Tests.Unit && dotnet test --filter "FullyQualifiedName~CorrelationIdHandlerTests" --no-restore`
Expected: FAIL — `CorrelationIdHandler` doesn't exist yet

- [ ] **Step 3: Implement CorrelationIdHandler**

Create `src/backend/Infrastructure/Http/CorrelationIdHandler.cs`:

```csharp
using Microsoft.AspNetCore.Http;

namespace StockPredictor.Infrastructure.Http;

public class CorrelationIdHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CorrelationIdHandler(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var correlationId = _httpContextAccessor.HttpContext?
            .Response.Headers["X-Correlation-Id"].FirstOrDefault();

        if (!string.IsNullOrEmpty(correlationId))
            request.Headers.TryAddWithoutValidation("X-Correlation-Id", correlationId);

        return base.SendAsync(request, cancellationToken);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tests/backend/StockPredictor.Tests.Unit && dotnet test --filter "FullyQualifiedName~CorrelationIdHandlerTests" --no-restore`
Expected: All 3 tests PASS

- [ ] **Step 5: Register handler in DI**

In `src/backend/Infrastructure/DependencyInjection.cs`:

Add after line 7 (imports):
```csharp
using Microsoft.AspNetCore.Http;
```

Add after line 43 (after services block, before ML service client):
```csharp
        // HTTP context accessor (needed by CorrelationIdHandler)
        services.AddHttpContextAccessor();
        services.AddTransient<CorrelationIdHandler>();
```

Add `.AddHttpMessageHandler<CorrelationIdHandler>()` to the ML HttpClient chain (after `.AddStandardResilienceHandler(...)` on line 57):
```csharp
        .AddHttpMessageHandler<CorrelationIdHandler>();
```

- [ ] **Step 6: Run all backend tests to verify nothing broke**

Run: `cd tests/backend/StockPredictor.Tests.Unit && dotnet test --no-restore`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/backend/Infrastructure/Http/CorrelationIdHandler.cs src/backend/Infrastructure/DependencyInjection.cs tests/backend/StockPredictor.Tests.Unit/Http/CorrelationIdHandlerTests.cs
git commit -m "feat(backend): propagate correlation ID to ML service via DelegatingHandler"
```

---

### Task 5: Add GCP credentials to Docker Compose ML service

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Update docker-compose.yml**

Replace the `ml` service block (lines 31-33) with:

```yaml
  ml:
    build: ./src/ml
    ports:
      - "8000:8000"
    environment:
      # Optional: enables GDELT sentiment features. Without this,
      # predictions still work but sentiment features degrade to NaN.
      - GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/gcp-service-account.json
    volumes:
      - ./credentials:/app/credentials:ro
```

- [ ] **Step 2: Add credentials directory to .gitignore**

Verify `credentials/` is in `.gitignore` so service account keys are never committed. If not present, add it.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml .gitignore
git commit -m "chore(docker): add optional GCP credentials mount for ML sentiment"
```

---

### Task 6: Post-fix cross-reference verification

**Files:** All modified files from Tasks 1-5

- [ ] **Step 1: Verify ML DataResponse schema includes name/sector**

Read `src/ml/app/schemas/data.py` and confirm `DataResponse` has `name: str | None = None` and `sector: str | None = None`.

- [ ] **Step 2: Verify ML data route calls `fetch_stock_info()` and passes to response**

Read `src/ml/app/routes/data.py` and confirm the route calls `fetch_stock_info(ticker.upper())` and passes `name=info["name"], sector=info["sector"]` to `DataResponse`.

- [ ] **Step 3: Verify backend MlStockDataResponse matches ML response**

Read `src/backend/Application/Interfaces/External/MlServiceModels.cs`. Confirm `MlStockDataResponse` has `Name` and `Sector` fields. Verify JSON field names match: ML returns `name` (lowercase), C# record uses PascalCase `Name` — `System.Text.Json` default camelCase deserialization handles this (`name` → `Name`). No `[JsonPropertyName]` needed.

- [ ] **Step 4: Verify StockService reads name/sector from ML response**

Read `src/backend/Infrastructure/Services/StockService.cs:117-124`. Confirm `Name = data.Name` and `Sector = data.Sector` in `EnsureStockInternalAsync()`.

- [ ] **Step 5: Verify frontend JwtPayload type is corrected**

Read `src/frontend/src/types/index.ts:103-109`. Confirm `unique_name: string` instead of `name: string`.

- [ ] **Step 6: Verify CorrelationIdHandler is wired into ML HttpClient**

Read `src/backend/Infrastructure/DependencyInjection.cs`. Confirm `AddHttpContextAccessor()`, `AddTransient<CorrelationIdHandler>()`, and `.AddHttpMessageHandler<CorrelationIdHandler>()` are present.

- [ ] **Step 7: Verify docker-compose ML service has credentials config**

Read `docker-compose.yml`. Confirm `environment` and `volumes` for GCP credentials on the `ml` service.

- [ ] **Step 8: Run full test suites**

ML tests: `cd src/ml && python -m pytest ../../tests/ml/ -v`
Backend tests: `cd tests/backend/StockPredictor.Tests.Unit && dotnet test`

Expected: All tests pass across both suites.

- [ ] **Step 9: Final commit (if any fixups needed)**

If verification found and fixed any issues, commit the fixes.
