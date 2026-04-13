# Cloudflare Turnstile Integration — Design Spec

**Date:** 2026-04-12
**Status:** Approved
**Scope:** Login + Register endpoints only
**Mode:** Managed, `appearance: 'interaction-only'`

---

## Overview

Add Cloudflare Turnstile bot protection to the login and register forms. The widget runs invisibly in the background and only presents a visible challenge when Cloudflare deems it necessary. The backend validates every Turnstile token before processing auth requests, returning 403 on failure.

No new npm dependencies. No third-party React wrappers. Direct integration with Turnstile's JS API via a custom hook, and a .NET action filter for server-side validation.

---

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Protected endpoints | Login + Register only | Only public-facing endpoints; change password and predictions already require JWT |
| Failure response | 403 with clear message | Better UX for thesis demo; frontend already has toast infrastructure |
| Widget appearance | `interaction-only` | Keeps forms clean; challenge only shows when needed |
| Integration approach | Direct (no npm package) | Full control, zero dependencies, every line explainable for thesis defense |
| Backend failure mode | Fail closed | If Cloudflare siteverify is unreachable, reject the request (no soft-fail) |

---

## Frontend

### Script Loading

Add the Turnstile script to `index.html`:
```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

Loads once globally. All widget management happens through `window.turnstile.*` methods.

### Custom Hook — `useTurnstile()`

**File:** `src/hooks/useTurnstile.ts`

```typescript
useTurnstile(containerRef: RefObject<HTMLDivElement>, action: string): {
  token: string | null;
  isReady: boolean;
  resetTurnstile: () => void;
}
```

**Behavior:**
- On mount: waits for `window.turnstile` to be available, then calls `turnstile.render()` on the container ref
- Render config: `{ sitekey, action, appearance: 'interaction-only', callback, 'error-callback', 'expired-callback' }`
- `callback`: sets the token in state
- `error-callback` / `expired-callback`: clears the token, triggering re-render
- `resetTurnstile()`: calls `turnstile.reset(widgetId)` — clears and regenerates token
- On unmount: calls `turnstile.remove(widgetId)` for cleanup
- Site key read from `import.meta.env.VITE_TURNSTILE_SITE_KEY`

### Form Changes

**Files:** `src/components/auth/LoginForm.tsx`, `src/components/auth/RegisterForm.tsx`

Both forms get:
1. A `useRef<HTMLDivElement>` for the Turnstile container
2. A `<div ref={turnstileRef} />` placed before the submit button
3. `useTurnstile(turnstileRef, "login")` / `useTurnstile(turnstileRef, "register")`
4. Submit button disabled when `!token` (shows "Verifying..." if `!isReady`)
5. On submit: pass `token` to the auth service call
6. On 403 response: toast "Verification failed, please try again" + `resetTurnstile()`
7. On any submit (success or failure): `resetTurnstile()` for fresh token

### Auth Service Changes

**File:** `src/services/authService.ts`

```typescript
login(email: string, password: string, turnstileToken: string): Promise<AuthResponse>
register(username: string, email: string, password: string, turnstileToken: string): Promise<AuthResponse>
```

`turnstileToken` sent as part of the JSON request body.

### AuthContext Changes

**File:** `src/contexts/AuthContext.tsx`

Update `login()` and `register()` to accept and pass through `turnstileToken`.

### Config

**Files:** `.env`, `.env.example`

```env
VITE_TURNSTILE_SITE_KEY=<your-site-key>
```

Also passed through in `docker-compose.yml` as a build arg or runtime env var for the frontend container.

### TypeScript Declarations

**File:** `src/types/turnstile.d.ts`

Declare the `window.turnstile` global with the methods used: `render()`, `reset()`, `remove()`. Keeps TypeScript happy without installing `@cloudflare/turnstile` types package.

---

## Backend

### Configuration

**File:** `appsettings.json`
```json
"Turnstile": {
    "SecretKey": "CHANGE_ME",
    "SiteVerifyUrl": "https://challenges.cloudflare.com/turnstile/v0/siteverify"
}
```

**File:** `appsettings.Development.json`
```json
"Turnstile": {
    "SecretKey": "<your-actual-test-secret-key>"
}
```

**Settings class:** `Application/Settings/TurnstileSettings.cs`
```csharp
public class TurnstileSettings
{
    public string SecretKey { get; set; }
    public string SiteVerifyUrl { get; set; }
}
```

Bound via `services.Configure<TurnstileSettings>(config.GetSection("Turnstile"))` in DI setup.

### Validation Filter

**File:** `API/Filters/ValidateTurnstileFilter.cs`

An `IAsyncActionFilter` registered as an attribute `[ValidateTurnstile]`:

1. Reads the request body and extracts the `turnstileToken` property
2. POSTs to Cloudflare siteverify: `{ secret: <SecretKey>, response: <turnstileToken> }`
3. If token is missing/empty → 403 ProblemDetails: `"Bot verification failed. Please try again."`
4. If Cloudflare returns `success: false` → same 403
5. If Cloudflare is unreachable (`HttpRequestException`) → 403 (fail closed)
6. If `success: true` → filter passes, controller action executes

Uses `IHttpClientFactory` with a named client `"Turnstile"` — consistent with the existing `MlServiceClient` pattern.

### DTO Changes

**Files:** `Application/DTOs/Auth/LoginRequest.cs`, `Application/DTOs/Auth/RegisterRequest.cs`

Add to both:
```csharp
public string TurnstileToken { get; set; }
```

**Validation:** Add `RuleFor(x => x.TurnstileToken).NotEmpty()` to both FluentValidation validators. This gives a clean 400 if the field is missing, before the filter even runs.

### AuthController Changes

**File:** `API/Controllers/AuthController.cs`

Add `[ValidateTurnstile]` attribute on `Login` and `Register` action methods. No other code changes — the filter handles everything.

### DI Registration

**File:** `API/Program.cs` — config binding:
```csharp
builder.Services.Configure<TurnstileSettings>(builder.Configuration.GetSection("Turnstile"));
```

**File:** `Infrastructure/DependencyInjection.cs` — HTTP client registration (alongside existing `MlServiceClient`):
```csharp
services.AddHttpClient("Turnstile");
```

---

## Data Flow

### Happy Path (Login)

```
User fills form
  → Turnstile runs in background, returns token to hook
  → User clicks "Sign In"
  → Frontend sends POST /api/auth/login { email, password, turnstileToken }
  → FluentValidation checks all fields present (400 if missing)
  → ValidateTurnstileFilter POSTs token to Cloudflare siteverify
  → Cloudflare returns { success: true }
  → Filter passes through
  → AuthController.Login runs → returns JWT
  → Frontend stores token, redirects to dashboard
  → resetTurnstile() called for next attempt
```

### Error Scenarios

| Scenario | Backend Response | Frontend Behavior |
|----------|-----------------|-------------------|
| `turnstileToken` missing from body | 400 Bad Request (FluentValidation) | Toast: validation error message |
| Token invalid or expired | 403 "Bot verification failed. Please try again." | Toast: error message + reset widget |
| Cloudflare siteverify unreachable | 403 (fail closed) | Same toast + reset widget |
| Turnstile JS script fails to load | N/A (request never sent) | Submit button disabled, "Verifying..." state |
| Successful submit | 200/201 (normal auth flow) | Normal redirect + reset widget |

**Key constraint:** Turnstile tokens are single-use. `resetTurnstile()` must be called after every submission attempt.

---

## Docker / Deployment

### docker-compose.yml Changes

Frontend service — add env var:
```yaml
environment:
  - VITE_TURNSTILE_SITE_KEY=${TURNSTILE_SITE_KEY}
```

Backend service — add env var:
```yaml
environment:
  - Turnstile__SecretKey=${TURNSTILE_SECRET_KEY}
```

### .env File (local Docker)

```env
TURNSTILE_SITE_KEY=<your-site-key>
TURNSTILE_SECRET_KEY=<your-secret-key>
```

### Deployment Checklist Addition

New section **8. Cloudflare Turnstile** in `docs/deployment-checklist.md`:

- **Local Dev:** Keys in `appsettings.Development.json` (backend) and `.env` (frontend)
- **Docker:** Keys via `.env` file, injected through `docker-compose.yml`
- **Azure:** `Turnstile__SecretKey` as App Setting (backend), `VITE_TURNSTILE_SITE_KEY` as build-time arg (frontend)

Plus new rows in Feature Status Matrix and Environment Variables Summary.

### Cloudflare Setup (Manual)

1. Cloudflare Dashboard → Turnstile → Add Site
2. Domain: `localhost` (for dev) + production domain
3. Widget type: **Managed**
4. Copy Site Key → frontend config
5. Copy Secret Key → backend config

---

## Files Changed Summary

### New Files
| File | Purpose |
|------|---------|
| `src/frontend/src/hooks/useTurnstile.ts` | Custom hook for Turnstile widget lifecycle |
| `src/frontend/src/types/turnstile.d.ts` | TypeScript declarations for `window.turnstile` |
| `src/backend/API/Filters/ValidateTurnstileFilter.cs` | Action filter for server-side token validation |
| `src/backend/Application/Settings/TurnstileSettings.cs` | Config POCO for Turnstile settings |

### Modified Files
| File | Change |
|------|--------|
| `src/frontend/index.html` | Add Turnstile script tag |
| `src/frontend/src/components/auth/LoginForm.tsx` | Add Turnstile hook, container div, token in submit |
| `src/frontend/src/components/auth/RegisterForm.tsx` | Same as LoginForm |
| `src/frontend/src/services/authService.ts` | Add `turnstileToken` param to login/register |
| `src/frontend/src/contexts/AuthContext.tsx` | Pass `turnstileToken` through login/register |
| `src/frontend/.env` | Add `VITE_TURNSTILE_SITE_KEY` |
| `src/frontend/.env.example` | Add `VITE_TURNSTILE_SITE_KEY` |
| `src/backend/Application/DTOs/Auth/LoginRequest.cs` | Add `TurnstileToken` property |
| `src/backend/Application/DTOs/Auth/RegisterRequest.cs` | Add `TurnstileToken` property |
| `src/backend/Application/Validators/LoginRequestValidator.cs` | Add `TurnstileToken` not-empty rule |
| `src/backend/Application/Validators/RegisterRequestValidator.cs` | Add `TurnstileToken` not-empty rule |
| `src/backend/API/Controllers/AuthController.cs` | Add `[ValidateTurnstile]` on Login + Register |
| `src/backend/API/Program.cs` | Register `TurnstileSettings` config binding |
| `src/backend/Infrastructure/DependencyInjection.cs` | Register named `"Turnstile"` HttpClient |
| `src/backend/API/appsettings.json` | Add `Turnstile` config section |
| `src/backend/API/appsettings.Development.json` | Add `Turnstile` config with dev key |
| `docker-compose.yml` | Add Turnstile env vars to frontend + backend services |
| `.env` | Add `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` |
| `docs/deployment-checklist.md` | Add Section 8: Cloudflare Turnstile |

---

## Out of Scope

- Turnstile on change-password endpoint (already behind JWT)
- Turnstile on prediction or other API endpoints (already behind JWT)
- Soft-fail mode (fail closed is simpler and more secure)
- React Turnstile npm packages (direct integration preferred)
- Cloudflare WAF / Bot Management rules
- Testing keys for CI/CD (can use Cloudflare's always-pass test keys if needed later)
