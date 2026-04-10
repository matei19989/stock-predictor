# StockPredictor — Test Suite Prompt (Backend + ML)

> **For agentic workers:** Implement tests phase by phase. Run the test suite after each phase to verify everything passes before proceeding. **DO NOT modify source code** — only create/modify test files.
>
> **Execution flow per phase:**
> 1. Implement all test files in the phase
> 2. Run tests (`dotnet test` or `pytest`)
> 3. Fix any test failures (test code only, not source)
> 4. Verify all tests pass before moving to next phase

**Goal:** Fill testing gaps in the backend (.NET) and ML (Python) layers. Tests focus on important untested logic — not 100% coverage, but meaningful coverage of business-critical paths.

**What's already tested (DO NOT duplicate):**
- Backend: AuthService register/login, PredictionService cache logic, StockService search/detail/ensure, WatchlistService add/remove/get+calculations, RegisterRequestValidator, PredictRequestValidator, all enum extensions
- ML: Feature engineering (19 indicators), prediction service orchestration, all HTTP routes (health/data/predict), sentiment clean_company_name, sentiment compute_features

---

## Conventions

### Backend (.NET)
- Framework: **xUnit** + **Moq** + **FluentAssertions**
- Project: `tests/backend/StockPredictor.Tests.Unit/`
- Namespace convention: `StockPredictor.Tests.Unit.{Folder}`
- One test class per system-under-test, named `{Class}Tests`
- Test method names: `MethodName_Scenario_ExpectedResult`
- Use `[Fact]` for single cases, `[Theory] + [InlineData]` for parameterized
- Mock all dependencies via Moq — no real DB, no real HTTP
- Existing test .csproj already has all needed packages (xUnit, Moq, FluentAssertions, BCrypt, EF InMemory)

### ML (Python)
- Framework: **pytest** + **unittest.mock**
- Directory: `tests/ml/`
- Config: `tests/ml/pytest.ini` (already exists, sets pythonpath to `../../src/ml`)
- Shared fixtures in `tests/ml/conftest.py` (already exists with ohlcv_df and sentiment_df)
- Test files named `test_{module}.py`
- Use `@pytest.fixture` for setup, `@patch` for mocking external calls
- Mock yfinance, BigQuery, Wikipedia — no real network calls

---

## Phase 1: Backend — Validators & Password Change (High Priority)

These are untested validators and the brand-new password-change feature.

### Task 1.1: Remaining Validator Tests

Add to the **existing** file `tests/backend/StockPredictor.Tests.Unit/Validators/ValidatorTests.cs`:

**ChangePasswordRequestValidator tests:**
- Empty CurrentPassword → fails with "Current password is required."
- NewPassword too short (7 chars) → fails with "at least 8 characters"
- NewPassword equals CurrentPassword → fails with "must be different"
- Valid request (different passwords, new ≥8 chars) → passes

**LoginRequestValidator tests:**
- Empty email → fails
- Invalid email format → fails
- Empty password → fails
- Valid email + password → passes

**AddToWatchlistRequestValidator tests:**
- Empty ticker → fails
- Lowercase ticker "aapl" → fails (regex requires uppercase)
- Ticker too long "ABCDEF" (6 chars) → fails
- Valid ticker "AAPL" → passes
- Dot ticker "BRK.B" → passes (allowed by ValidTicker regex)

### Task 1.2: ChangePasswordAsync Tests

Create `tests/backend/StockPredictor.Tests.Unit/Services/ChangePasswordTests.cs`:

Test `AuthService.ChangePasswordAsync(Guid, ChangePasswordRequest, CancellationToken)`:

**Setup:** Same mock pattern as existing AuthServiceTests — mock IUserRepository, IWatchlistService, IConfiguration (with JWT settings), ILogger. Create the AuthService with these mocks.

**Tests:**
- `UserNotFound_ThrowsNotFoundException` — GetByIdAsync returns null → NotFoundException
- `WrongCurrentPassword_ThrowsUnauthorizedException` — GetByIdAsync returns user with known hash, request.CurrentPassword doesn't match → UnauthorizedException "Current password is incorrect."
- `ValidRequest_UpdatesPasswordHash` — GetByIdAsync returns user, CurrentPassword matches, verify:
  - `UpdateAsync` was called once
  - The user's PasswordHash changed (not equal to old hash)
  - New hash verifies against request.NewPassword via `BCrypt.Net.BCrypt.Verify`

**Context — AuthService constructor:**
```csharp
public AuthService(
    IUserRepository users,
    IWatchlistService watchlist,
    IConfiguration config,
    ILogger<AuthService> logger)
```

**Context — User entity has:** `Id` (Guid), `Username`, `Email`, `PasswordHash`, `CreatedAt`

**Context — ChangePasswordRequest:** `CurrentPassword` (string), `NewPassword` (string)

### Task 1.3: Run Tests

```bash
cd tests/backend/StockPredictor.Tests.Unit
dotnet test --verbosity normal
```

All tests should pass, including existing ones.

---

## Phase 2: Backend — MlServiceClient (High Priority)

The ML client is the critical integration point. It's completely untested.

### Task 2.1: MlServiceClient Tests

Create `tests/backend/StockPredictor.Tests.Unit/Http/MlServiceClientTests.cs`:

Test `MlServiceClient` which uses a typed HttpClient. Use `MockHttpMessageHandler` pattern to mock HTTP responses.

**Setup helper:**
```csharp
// Helper to create MlServiceClient with mocked HTTP
private static MlServiceClient CreateClient(HttpResponseMessage response)
{
    var handler = new MockHttpMessageHandler(response);
    var httpClient = new HttpClient(handler) { BaseAddress = new Uri("http://ml:8000") };
    var logger = Mock.Of<ILogger<MlServiceClient>>();
    return new MlServiceClient(httpClient, logger);
}

// Simple mock handler
private class MockHttpMessageHandler : HttpMessageHandler
{
    private readonly HttpResponseMessage _response;
    public MockHttpMessageHandler(HttpResponseMessage response) => _response = response;
    protected override Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken) =>
        Task.FromResult(_response);
}
```

**IsHealthyAsync tests:**
- `Healthy_ReturnsTrue` — 200 with `{"status":"healthy","model_loaded":true}` → true
- `Degraded_ReturnsFalse` — 200 with `{"status":"degraded","model_loaded":false}` → false
- `ServerError_ReturnsFalse` — 500 → false (no exception thrown)
- `Timeout_ReturnsFalse` — handler throws HttpRequestException → false

**GetStockDataAsync tests:**
- `Success_ReturnsData` — 200 with valid JSON → parsed MlStockDataResponse
- `NotFound_ReturnsNull` — 404 → null
- `ServerError_ThrowsMlServiceUnavailable` — 500 → MlServiceUnavailableException

**PredictAsync tests:**
- `Success_ReturnsPrediction` — 200 with prediction JSON → parsed MlPredictionResponse
- `HorizonNotSupported_ThrowsHorizonException` — 501 → HorizonNotSupportedException
- `ModelNotReady_ThrowsMlServiceUnavailable` — 503 → MlServiceUnavailableException
- `ServerError_ThrowsMlServiceUnavailable` — 500 → MlServiceUnavailableException

**Context — MlServiceClient constructor:**
```csharp
public MlServiceClient(HttpClient http, ILogger<MlServiceClient> logger)
```

**Context — Response models used:**
```csharp
// MlStockDataResponse (from Application/Interfaces/External/MlServiceModels.cs)
public record MlStockDataResponse(string Ticker, string Period, int Count, List<MlPricePoint> Data);
public record MlPricePoint(string Date, decimal Open, decimal High, decimal Low, decimal Close, long Volume);

// MlPredictionResponse
public record MlPredictionResponse(
    string Ticker, string Horizon, string Signal, double Confidence,
    Dictionary<string, double> Probabilities, int FeaturesUsed,
    string Timestamp, bool LowConfidence);
```

**Context — Exceptions used:**
- `MlServiceUnavailableException` (in Application/Exceptions/)
- `HorizonNotSupportedException` (in Application/Exceptions/)

### Task 2.2: Run Tests

```bash
dotnet test --verbosity normal
```

---

## Phase 3: Backend — ExceptionHandlingMiddleware (Medium-High Priority)

This middleware is the single error gate for the entire API. Worth testing.

### Task 3.1: ExceptionHandlingMiddleware Tests

Create `tests/backend/StockPredictor.Tests.Unit/Middleware/ExceptionHandlingMiddlewareTests.cs`:

**Setup:** Create a middleware instance with a mock `RequestDelegate` and `ILogger<ExceptionHandlingMiddleware>`. Use `DefaultHttpContext` to simulate requests/responses.

```csharp
private static (ExceptionHandlingMiddleware middleware, DefaultHttpContext context) CreateSetup(
    Func<HttpContext, Task> next)
{
    var logger = Mock.Of<ILogger<ExceptionHandlingMiddleware>>();
    var middleware = new ExceptionHandlingMiddleware(
        new RequestDelegate(next), logger);
    var context = new DefaultHttpContext();
    context.Response.Body = new MemoryStream();
    return (middleware, context);
}
```

**Tests:**
- `NoException_PassesThrough` — next completes normally → response untouched
- `NotFoundException_Returns404` — next throws NotFoundException → status 404, ProblemDetails with title "NotFound"
- `ConflictException_Returns409` — next throws ConflictException → status 409
- `UnauthorizedException_Returns401` — next throws UnauthorizedException → status 401
- `UnhandledException_Returns500` — next throws generic Exception → status 500, detail is "An unexpected error occurred." (not the actual exception message)
- `CorrelationId_IncludedInResponse` — set `X-Correlation-Id` header on request → ProblemDetails includes correlationId field

**Context — Exception classes** (all inherit from base `AppException` which has `StatusCode` property):
- `NotFoundException(string message)` → StatusCode 404
- `ConflictException(string message)` → StatusCode 409
- `UnauthorizedException(string? message)` → StatusCode 401
- `MlServiceUnavailableException(string? message)` → StatusCode 503
- `HorizonNotSupportedException(string? message)` → StatusCode 501

To read the ProblemDetails from the response:
```csharp
context.Response.Body.Seek(0, SeekOrigin.Begin);
var body = await new StreamReader(context.Response.Body).ReadToEndAsync();
var problem = JsonSerializer.Deserialize<JsonElement>(body);
```

### Task 3.2: Run Tests

```bash
dotnet test --verbosity normal
```

---

## Phase 4: ML — Data Fetcher & Sentiment Integration (Medium-High Priority)

### Task 4.1: Data Fetcher Tests

Create `tests/ml/test_data_fetcher.py`:

Test `fetch_ohlcv(ticker, period)` from `app.services.data_fetcher`.

**Tests:**
- `test_returns_ohlcv_dataframe` — mock `yf.Ticker().history()` to return a valid DataFrame with OHLCV columns → returns DataFrame with correct columns [Open, High, Low, Close, Volume], DatetimeIndex
- `test_empty_data_raises_valueerror` — mock yfinance to return empty DataFrame → raises ValueError
- `test_ticker_uppercased` — pass "aapl", verify yf.Ticker called with "AAPL" (check the mock call)
- `test_timezone_stripped` — mock yfinance to return tz-aware DatetimeIndex → returned DataFrame has tz-naive index
- `test_cache_returns_copy` — call twice with same args within 15min → second call doesn't hit yfinance again (verify mock called once). Also verify returned DataFrames are independent copies (modifying one doesn't affect the other)

**Important:** The data_fetcher module has a module-level `_cache` dict and `_lock`. You'll need to clear the cache between tests:
```python
@pytest.fixture(autouse=True)
def clear_cache():
    from app.services.data_fetcher import _cache
    _cache.clear()
    yield
    _cache.clear()
```

**Mock pattern:**
```python
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np

@patch('app.services.data_fetcher.yf')
def test_returns_ohlcv(mock_yf):
    dates = pd.date_range('2024-01-01', periods=10, freq='B')
    df = pd.DataFrame({
        'Open': np.random.uniform(100, 200, 10),
        'High': np.random.uniform(100, 200, 10),
        'Low': np.random.uniform(100, 200, 10),
        'Close': np.random.uniform(100, 200, 10),
        'Volume': np.random.randint(1_000_000, 10_000_000, 10),
    }, index=dates)
    mock_yf.Ticker.return_value.history.return_value = df
    result = fetch_ohlcv('AAPL', '5y')
    assert list(result.columns) == ['Open', 'High', 'Low', 'Close', 'Volume']
```

### Task 4.2: Sentiment Fetch & Mapping Tests

Add to the **existing** file `tests/ml/test_sentiment.py`:

**_build_ticker_mapping tests:**
- `test_build_mapping_returns_dict` — mock requests.get to return HTML with a table containing known S&P 500 tickers → returns dict with cleaned company names
- `test_build_mapping_network_failure_returns_empty` — mock requests.get to raise Exception → returns empty dict (graceful degradation)

**fetch_sentiment tests:**
- `test_fetch_sentiment_returns_dataframe` — mock BigQuery client to return rows with article_date and tone → returns DataFrame with [date, sentiment] columns, sentiment clipped to [-1, 1]
- `test_fetch_sentiment_no_client_returns_none` — mock `_get_bq_client()` to return None → returns None
- `test_fetch_sentiment_empty_result_returns_none` — mock BigQuery to return empty result → returns None
- `test_fetch_sentiment_caches_result` — call twice for same ticker within 1 hour → BigQuery queried only once

**Mock pattern for BigQuery:**
```python
@patch('app.services.sentiment._get_bq_client')
def test_fetch_sentiment_returns_df(mock_get_client):
    mock_client = MagicMock()
    mock_get_client.return_value = mock_client
    
    # Simulate BigQuery result rows
    mock_rows = [
        MagicMock(article_date='20240101', tone=5.0),
        MagicMock(article_date='20240102', tone=-3.0),
    ]
    mock_client.query.return_value.result.return_value = mock_rows
    
    result = fetch_sentiment('AAPL', 'apple', days=90)
    assert result is not None
    assert 'sentiment' in result.columns
    assert result['sentiment'].between(-1, 1).all()
```

**Important:** Clear the sentiment cache between tests:
```python
@pytest.fixture(autouse=True)
def clear_sentiment_cache():
    from app.services.sentiment import _sentiment_cache
    _sentiment_cache.clear()
    yield
    _sentiment_cache.clear()
```

### Task 4.3: Run Tests

```bash
cd tests/ml
python -m pytest -v
```

---

## Phase 5: ML — Prediction Edge Cases (Medium Priority)

### Task 5.1: Additional Prediction Tests

Add to the **existing** file `tests/ml/test_prediction.py`:

**Tests to add:**
- `test_all_signals_represented_in_probabilities` — verify the probabilities dict contains all 5 signal keys: "Strong Sell", "Sell", "Hold", "Buy", "Strong Buy"
- `test_confidence_rounded_to_4_decimals` — mock model to return specific probabilities → confidence has at most 4 decimal places
- `test_features_used_matches_column_count` — verify `features_used` == len(feature_columns) (22)
- `test_timestamp_is_utc_iso_format` — verify timestamp string parses as valid ISO datetime

### Task 5.2: Additional Route Tests

Add to the **existing** file `tests/ml/test_routes.py`:

**Tests to add:**
- `test_predict_empty_ticker_returns_422` — POST with `{"ticker": "", "horizon": "3m"}` → 422
- `test_data_endpoint_uppercases_ticker` — GET `/data/aapl` → response ticker is "AAPL"
- `test_data_default_period_is_5y` — GET `/data/AAPL` (no period param) → response period is "5y"

### Task 5.3: Run Tests

```bash
python -m pytest -v
```

---

## Summary — What Gets Tested

| Area | Phase | Priority | Tests Added |
|------|-------|----------|-------------|
| ChangePasswordRequestValidator | 1 | High | 4 |
| LoginRequestValidator | 1 | High | 4 |
| AddToWatchlistRequestValidator | 1 | High | 5 |
| AuthService.ChangePasswordAsync | 1 | High | 3 |
| MlServiceClient (all 3 methods) | 2 | High | 11 |
| ExceptionHandlingMiddleware | 3 | Medium-High | 6 |
| Data fetcher (caching, tz, errors) | 4 | Medium-High | 5 |
| Sentiment fetch + mapping | 4 | Medium-High | 6 |
| Prediction edge cases | 5 | Medium | 4 |
| Route edge cases | 5 | Medium | 3 |
| **Total** | | | **~51 new tests** |

### What's NOT tested (intentionally skipped):

- **Repository implementations** — they're thin EF Core wrappers, testing them means testing EF Core itself
- **Controller routing/authorization** — requires integration test infrastructure (WebApplicationFactory), overkill for thesis
- **Hangfire job scheduling** — infrastructure concern, not business logic
- **JWT token validation** — .NET's built-in JWT middleware, already well-tested by Microsoft
- **DbContext configurations** — EF entity configs are declarative, tested implicitly by migrations
- **Frontend** — out of scope for this prompt
- **Docker/deployment** — infrastructure, not code
- **Concurrent access** — would need integration tests with real DB
- **Performance/load testing** — out of scope for thesis
