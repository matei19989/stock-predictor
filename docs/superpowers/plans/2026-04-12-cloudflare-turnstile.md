# Cloudflare Turnstile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Cloudflare Turnstile bot protection to login and register endpoints, with invisible managed widget on frontend and server-side token validation on backend.

**Architecture:** Frontend custom React hook manages the Turnstile widget lifecycle (render/reset/cleanup). Both auth forms pass the token in the request body. A .NET action filter on the backend intercepts login/register requests, validates the token against Cloudflare's siteverify API, and returns 403 on failure.

**Tech Stack:** Cloudflare Turnstile JS API (no npm package), React custom hook, .NET `IAsyncActionFilter`, `IHttpClientFactory`, FluentValidation

**Spec:** `docs/superpowers/specs/2026-04-12-cloudflare-turnstile-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/frontend/src/types/turnstile.d.ts` | TypeScript declarations for `window.turnstile` global |
| `src/frontend/src/hooks/useTurnstile.ts` | Custom hook: render widget, expose token, reset, cleanup |
| `src/backend/Application/Settings/TurnstileSettings.cs` | Config POCO for secret key + siteverify URL |
| `src/backend/API/Filters/ValidateTurnstileFilter.cs` | Action filter: validate token via Cloudflare siteverify |

### Modified Files

| File | What Changes |
|------|-------------|
| `src/frontend/index.html` | Add Turnstile `<script>` tag |
| `src/frontend/src/services/authService.ts` | Add `turnstileToken` param to `login()` and `register()` |
| `src/frontend/src/contexts/AuthContext.tsx` | Pass `turnstileToken` through `login()` and `register()` |
| `src/frontend/src/components/auth/LoginForm.tsx` | Wire up `useTurnstile` hook, pass token on submit, handle 403 |
| `src/frontend/src/components/auth/RegisterForm.tsx` | Same as LoginForm |
| `src/backend/Application/DTOs/Auth/LoginRequest.cs` | Add `TurnstileToken` property |
| `src/backend/Application/DTOs/Auth/RegisterRequest.cs` | Add `TurnstileToken` property |
| `src/backend/Application/Validators/LoginRequestValidator.cs` | Add `TurnstileToken` not-empty rule |
| `src/backend/Application/Validators/RegisterRequestValidator.cs` | Add `TurnstileToken` not-empty rule |
| `src/backend/Infrastructure/DependencyInjection.cs` | Register named `"Turnstile"` HttpClient |
| `src/backend/API/Program.cs` | Bind `TurnstileSettings` from config |
| `src/backend/API/appsettings.json` | Add `Turnstile` section |
| `src/backend/API/appsettings.Development.json` | Add `Turnstile` section with dev key |
| `src/backend/API/Controllers/AuthController.cs` | Add `[ValidateTurnstile]` attribute on Login + Register |
| `docker-compose.yml` | Add Turnstile env vars (frontend build arg + backend env) |
| `.env` | Add `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` |
| `docs/deployment-checklist.md` | Add Section 8: Cloudflare Turnstile |

---

## Task 1: Backend — Config & Settings POCO

**Files:**
- Create: `src/backend/Application/Settings/TurnstileSettings.cs`
- Modify: `src/backend/API/appsettings.json:38` (before closing `}`)
- Modify: `src/backend/API/appsettings.Development.json:27` (before closing `}`)
- Modify: `src/backend/API/Program.cs:35` (after `AddInfrastructure`)

- [ ] **Step 1: Create `TurnstileSettings.cs`**

Create the file `src/backend/Application/Settings/TurnstileSettings.cs`:

```csharp
namespace StockPredictor.Application.Settings;

public class TurnstileSettings
{
    public string SecretKey { get; set; } = string.Empty;
    public string SiteVerifyUrl { get; set; } = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
}
```

- [ ] **Step 2: Add Turnstile config to `appsettings.json`**

In `src/backend/API/appsettings.json`, add the `Turnstile` section after the `Cors` section (before the final closing `}`), at line 38:

```json
  "Turnstile": {
    "SecretKey": "CHANGE_ME",
    "SiteVerifyUrl": "https://challenges.cloudflare.com/turnstile/v0/siteverify"
  }
```

The file should end:
```json
  },
  "Turnstile": {
    "SecretKey": "CHANGE_ME",
    "SiteVerifyUrl": "https://challenges.cloudflare.com/turnstile/v0/siteverify"
  }
}
```

- [ ] **Step 3: Add Turnstile dev key to `appsettings.Development.json`**

In `src/backend/API/appsettings.Development.json`, add before the final closing `}`, after the `Cors` section at line 26:

```json
  "Turnstile": {
    "SecretKey": "1x0000000000000000000000000000000AA"
  }
```

Note: `1x0000000000000000000000000000000AA` is Cloudflare's official **always-passes** test secret key. It accepts any token and returns `success: true`. This means local dev works without a real Cloudflare account setup.

- [ ] **Step 4: Bind settings in `Program.cs`**

In `src/backend/API/Program.cs`, add this line after line 35 (`builder.Services.AddInfrastructure(builder.Configuration);`):

```csharp
builder.Services.Configure<TurnstileSettings>(builder.Configuration.GetSection("Turnstile"));
```

Add the using at the top of the file (after line 14, the last existing using):

```csharp
using StockPredictor.Application.Settings;
```

- [ ] **Step 5: Verify it compiles**

Run from `src/backend`:
```bash
dotnet build
```
Expected: Build succeeded. 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/backend/Application/Settings/TurnstileSettings.cs src/backend/API/appsettings.json src/backend/API/appsettings.Development.json src/backend/API/Program.cs
git commit -m "feat: add Turnstile config settings POCO and appsettings sections"
```

---

## Task 2: Backend — DTOs & Validators

**Files:**
- Modify: `src/backend/Application/DTOs/Auth/LoginRequest.cs:6` (add property)
- Modify: `src/backend/Application/DTOs/Auth/RegisterRequest.cs:7` (add property)
- Modify: `src/backend/Application/Validators/LoginRequestValidator.cs:11` (add rule)
- Modify: `src/backend/Application/Validators/RegisterRequestValidator.cs:24` (add rule)

- [ ] **Step 1: Add `TurnstileToken` to `LoginRequest`**

In `src/backend/Application/DTOs/Auth/LoginRequest.cs`, add the property after `Password` (line 6):

The full file becomes:
```csharp
namespace StockPredictor.Application.DTOs.Auth;

public class LoginRequest
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string TurnstileToken { get; set; } = string.Empty;
}
```

- [ ] **Step 2: Add `TurnstileToken` to `RegisterRequest`**

In `src/backend/Application/DTOs/Auth/RegisterRequest.cs`, add the property after `Password` (line 7):

The full file becomes:
```csharp
namespace StockPredictor.Application.DTOs.Auth;

public class RegisterRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string TurnstileToken { get; set; } = string.Empty;
}
```

- [ ] **Step 3: Add validation rule to `LoginRequestValidator`**

In `src/backend/Application/Validators/LoginRequestValidator.cs`, add after line 11 (`RuleFor(x => x.Password).NotEmpty();`):

```csharp
        RuleFor(x => x.TurnstileToken).NotEmpty().WithMessage("Bot verification is required.");
```

- [ ] **Step 4: Add validation rule to `RegisterRequestValidator`**

In `src/backend/Application/Validators/RegisterRequestValidator.cs`, add after line 23 (the closing of the Password rule):

```csharp
        RuleFor(x => x.TurnstileToken).NotEmpty().WithMessage("Bot verification is required.");
```

- [ ] **Step 5: Verify it compiles**

Run from `src/backend`:
```bash
dotnet build
```
Expected: Build succeeded. 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/backend/Application/DTOs/Auth/LoginRequest.cs src/backend/Application/DTOs/Auth/RegisterRequest.cs src/backend/Application/Validators/LoginRequestValidator.cs src/backend/Application/Validators/RegisterRequestValidator.cs
git commit -m "feat: add TurnstileToken to auth DTOs and validators"
```

---

## Task 3: Backend — Turnstile Validation Filter

**Files:**
- Create: `src/backend/API/Filters/ValidateTurnstileFilter.cs`
- Modify: `src/backend/Infrastructure/DependencyInjection.cs:66` (add HttpClient)

- [ ] **Step 1: Register named HttpClient in `DependencyInjection.cs`**

In `src/backend/Infrastructure/DependencyInjection.cs`, add after line 65 (the closing of the ML service client `.AddStandardResilienceHandler()` chain, the `});` line):

```csharp
        // Turnstile verification client
        services.AddHttpClient("Turnstile");
```

- [ ] **Step 2: Create `ValidateTurnstileFilter.cs`**

Create the file `src/backend/API/Filters/ValidateTurnstileFilter.cs`:

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;
using StockPredictor.Application.Settings;

namespace StockPredictor.API.Filters;

/// <summary>
/// Action filter that validates a Cloudflare Turnstile token from the request body
/// by calling Cloudflare's siteverify endpoint. Returns 403 on failure.
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
public class ValidateTurnstileAttribute : Attribute, IFilterFactory
{
    public bool IsReusable => false;

    public IFilterMetadata CreateInstance(IServiceProvider serviceProvider)
    {
        return new ValidateTurnstileFilter(
            serviceProvider.GetRequiredService<IHttpClientFactory>(),
            serviceProvider.GetRequiredService<IOptions<TurnstileSettings>>(),
            serviceProvider.GetRequiredService<ILogger<ValidateTurnstileFilter>>());
    }
}

internal class ValidateTurnstileFilter : IAsyncActionFilter
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly TurnstileSettings _settings;
    private readonly ILogger<ValidateTurnstileFilter> _logger;

    public ValidateTurnstileFilter(
        IHttpClientFactory httpClientFactory,
        IOptions<TurnstileSettings> settings,
        ILogger<ValidateTurnstileFilter> logger)
    {
        _httpClientFactory = httpClientFactory;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        // Extract turnstileToken from the action argument (the DTO)
        var turnstileToken = ExtractToken(context);

        if (string.IsNullOrWhiteSpace(turnstileToken))
        {
            _logger.LogWarning("Turnstile token missing from request");
            context.Result = CreateForbiddenResult();
            return;
        }

        var isValid = await VerifyTokenAsync(turnstileToken, context.HttpContext.RequestAborted);

        if (!isValid)
        {
            context.Result = CreateForbiddenResult();
            return;
        }

        await next();
    }

    private static string? ExtractToken(ActionExecutingContext context)
    {
        // Look through action arguments for any object with a TurnstileToken property
        foreach (var arg in context.ActionArguments.Values)
        {
            if (arg is null) continue;
            var prop = arg.GetType().GetProperty("TurnstileToken");
            if (prop?.GetValue(arg) is string token)
                return token;
        }
        return null;
    }

    private async Task<bool> VerifyTokenAsync(string token, CancellationToken cancellationToken)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Turnstile");
            var payload = new Dictionary<string, string>
            {
                ["secret"] = _settings.SecretKey,
                ["response"] = token
            };

            var response = await client.PostAsync(
                _settings.SiteVerifyUrl,
                new FormUrlEncodedContent(payload),
                cancellationToken);

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<TurnstileVerifyResponse>(json);

            if (result?.Success != true)
            {
                _logger.LogWarning("Turnstile verification failed. Errors: {Errors}",
                    result?.ErrorCodes != null ? string.Join(", ", result.ErrorCodes) : "unknown");
                return false;
            }

            return true;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to reach Cloudflare Turnstile siteverify endpoint");
            return false; // Fail closed
        }
    }

    private static ObjectResult CreateForbiddenResult()
    {
        return new ObjectResult(new ProblemDetails
        {
            Status = StatusCodes.Status403Forbidden,
            Title = "Forbidden",
            Detail = "Bot verification failed. Please try again."
        })
        {
            StatusCode = StatusCodes.Status403Forbidden
        };
    }

    private class TurnstileVerifyResponse
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("error-codes")]
        public string[]? ErrorCodes { get; set; }
    }
}
```

- [ ] **Step 3: Verify it compiles**

Run from `src/backend`:
```bash
dotnet build
```
Expected: Build succeeded. 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/backend/API/Filters/ValidateTurnstileFilter.cs src/backend/Infrastructure/DependencyInjection.cs
git commit -m "feat: add Turnstile validation filter with Cloudflare siteverify"
```

---

## Task 4: Backend — Wire Filter to AuthController

**Files:**
- Modify: `src/backend/API/Controllers/AuthController.cs:19,30` (add attribute)

- [ ] **Step 1: Add `[ValidateTurnstile]` to Register and Login**

In `src/backend/API/Controllers/AuthController.cs`, add the using at the top (after line 5):

```csharp
using StockPredictor.API.Filters;
```

Add `[ValidateTurnstile]` above the `Register` method (before line 19, `[HttpPost("register")]`):

```csharp
    [ValidateTurnstile]
    [HttpPost("register")]
```

Add `[ValidateTurnstile]` above the `Login` method (before the `[HttpPost("login")]` line):

```csharp
    [ValidateTurnstile]
    [HttpPost("login")]
```

Also add `ProducesResponseType` for 403 on both methods. The full file becomes:

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using StockPredictor.API.Filters;
using StockPredictor.Application.DTOs.Auth;
using StockPredictor.Application.Interfaces.Services;

namespace StockPredictor.API.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    [ValidateTurnstile]
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var response = await _auth.RegisterAsync(request, cancellationToken);
        return Created(string.Empty, response);
    }

    [ValidateTurnstile]
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var response = await _auth.LoginAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpPut("password")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ChangePassword(
        [FromBody] ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        await _auth.ChangePasswordAsync(userId, request, cancellationToken);
        return NoContent();
    }
}
```

- [ ] **Step 2: Verify it compiles**

Run from `src/backend`:
```bash
dotnet build
```
Expected: Build succeeded. 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/backend/API/Controllers/AuthController.cs
git commit -m "feat: apply ValidateTurnstile filter to login and register endpoints"
```

---

## Task 5: Frontend — TypeScript Declarations & Turnstile Script

**Files:**
- Create: `src/frontend/src/types/turnstile.d.ts`
- Modify: `src/frontend/index.html:14` (add script before closing `</body>`)

- [ ] **Step 1: Create `turnstile.d.ts`**

Create the file `src/frontend/src/types/turnstile.d.ts`:

```typescript
interface TurnstileRenderOptions {
  sitekey: string;
  action?: string;
  appearance?: 'always' | 'execute' | 'interaction-only';
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
}

interface TurnstileInstance {
  render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
}

interface Window {
  turnstile?: TurnstileInstance;
}
```

- [ ] **Step 2: Add Turnstile script to `index.html`**

In `src/frontend/index.html`, add the Turnstile script tag before `</body>` (after line 14, the `<script type="module" src="/src/main.tsx"></script>` line):

```html
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

The `<body>` section becomes:
```html
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  </body>
```

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/types/turnstile.d.ts src/frontend/index.html
git commit -m "feat: add Turnstile type declarations and load script in index.html"
```

---

## Task 6: Frontend — `useTurnstile` Hook

**Files:**
- Create: `src/frontend/src/hooks/useTurnstile.ts`

- [ ] **Step 1: Create the hook**

Create the file `src/frontend/src/hooks/useTurnstile.ts`:

```typescript
import { useEffect, useRef, useState, useCallback, type RefObject } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

interface UseTurnstileReturn {
  token: string | null;
  isReady: boolean;
  resetTurnstile: () => void;
}

export function useTurnstile(
  containerRef: RefObject<HTMLDivElement | null>,
  action: string
): UseTurnstileReturn {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const widgetIdRef = useRef<string | null>(null);

  const resetTurnstile = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Poll for the Turnstile script to be loaded (async defer)
    const interval = setInterval(() => {
      if (!window.turnstile) return;
      clearInterval(interval);

      const widgetId = window.turnstile.render(container, {
        sitekey: SITE_KEY,
        action,
        appearance: 'interaction-only',
        callback: (t: string) => {
          setToken(t);
          setIsReady(true);
        },
        'error-callback': () => {
          setToken(null);
        },
        'expired-callback': () => {
          setToken(null);
        },
      });

      widgetIdRef.current = widgetId;
      setIsReady(true);
    }, 100);

    return () => {
      clearInterval(interval);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      setIsReady(false);
      setToken(null);
    };
  }, [containerRef, action]);

  return { token, isReady, resetTurnstile };
}
```

- [ ] **Step 2: Verify TypeScript is happy**

Run from `src/frontend`:
```bash
npx tsc --noEmit
```
Expected: No errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/hooks/useTurnstile.ts
git commit -m "feat: add useTurnstile hook for widget lifecycle management"
```

---

## Task 7: Frontend — Auth Service & Context

**Files:**
- Modify: `src/frontend/src/services/authService.ts:4,9` (add param)
- Modify: `src/frontend/src/contexts/AuthContext.tsx:18-19,63-64,71-73` (pass param through)

- [ ] **Step 1: Update `authService.ts`**

Replace the full contents of `src/frontend/src/services/authService.ts`:

```typescript
import api from './api';
import type { AuthResponse } from '@/types';

export async function login(email: string, password: string, turnstileToken: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/login', { email, password, turnstileToken });
  return data;
}

export async function register(
  username: string,
  email: string,
  password: string,
  turnstileToken: string
): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/api/auth/register', {
    username,
    email,
    password,
    turnstileToken,
  });
  return data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await api.put('/api/auth/password', { currentPassword, newPassword });
}
```

- [ ] **Step 2: Update `AuthContext.tsx`**

In `src/frontend/src/contexts/AuthContext.tsx`, update the interface and implementations.

Change the `AuthContextValue` interface (lines 18-19):

```typescript
  login: (email: string, password: string, turnstileToken: string) => Promise<void>;
  register: (username: string, email: string, password: string, turnstileToken: string) => Promise<void>;
```

Change the `login` callback (lines 63-69):

```typescript
  const login = useCallback(async (email: string, password: string, turnstileToken: string): Promise<void> => {
    const response = await authService.login(email, password, turnstileToken);
    setAuthFromResponse(response);
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo') ?? '/dashboard';
    navigate(returnTo, { replace: true });
  }, [navigate, setAuthFromResponse]);
```

Change the `register` callback (lines 71-78):

```typescript
  const register = useCallback(
    async (username: string, email: string, password: string, turnstileToken: string): Promise<void> => {
      const response = await authService.register(username, email, password, turnstileToken);
      setAuthFromResponse(response);
      navigate('/dashboard', { replace: true });
    },
    [navigate, setAuthFromResponse]
  );
```

- [ ] **Step 3: Verify TypeScript is happy**

Run from `src/frontend`:
```bash
npx tsc --noEmit
```
Expected: Errors in `LoginForm.tsx` and `RegisterForm.tsx` because they don't pass `turnstileToken` yet. This is expected — we fix them in the next task.

- [ ] **Step 4: Commit**

```bash
git add src/frontend/src/services/authService.ts src/frontend/src/contexts/AuthContext.tsx
git commit -m "feat: add turnstileToken param to auth service and context"
```

---

## Task 8: Frontend — Wire Turnstile into LoginForm

**Files:**
- Modify: `src/frontend/src/components/auth/LoginForm.tsx`

- [ ] **Step 1: Update LoginForm**

Replace the full contents of `src/frontend/src/components/auth/LoginForm.tsx`:

```tsx
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { ApiException } from '@/services/api';
import { useTurnstile } from '@/hooks/useTurnstile';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const { login } = useAuth();
  const turnstileRef = useRef<HTMLDivElement>(null);
  const { token: turnstileToken, isReady, resetTurnstile } = useTurnstile(turnstileRef, 'login');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginFormData) {
    if (!turnstileToken) return;
    try {
      await login(data.email, data.password, turnstileToken);
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 401) toast.error('Invalid email or password');
        else if (err.status === 403) toast.error('Verification failed. Please try again.');
        else if (err.status === 429) toast.error('Too many attempts. Please try again later.');
        else toast.error(err.detail);
      }
    } finally {
      resetTurnstile();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-gray-300">
          Email
        </Label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
          placeholder="Enter your email"
        />
        {errors.email && (
          <p className="text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-medium text-gray-300">
          Password
        </Label>
        <input
          id="password"
          type="password"
          {...register('password')}
          className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border border-white/10 bg-white/[0.04] accent-purple-500 cursor-pointer"
          />
          <span className="text-sm text-gray-400">Remember me</span>
        </label>
      </div>

      <div ref={turnstileRef} />

      <Button
        type="submit"
        disabled={isSubmitting || !isReady || !turnstileToken}
        className="group w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 h-12 text-sm font-medium rounded-lg shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
      >
        <span className="flex items-center justify-center gap-2">
          {isSubmitting ? 'Signing in…' : !isReady ? 'Verifying…' : 'Sign In'}
          {!isSubmitting && isReady && turnstileToken && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
              <ArrowRight weight="bold" size={12} />
            </span>
          )}
        </span>
      </Button>

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link
          to="/register"
          className="text-purple-400 hover:text-purple-300 transition-colors duration-300"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
```

Key changes from the original:
- Added `useRef` import and `turnstileRef`
- Added `useTurnstile` hook with `'login'` action
- `onSubmit` guards on `!turnstileToken`, passes token to `login()`, handles 403
- `finally` block calls `resetTurnstile()` after every submit
- `<div ref={turnstileRef} />` placed before the submit button
- Submit button disabled when `!isReady || !turnstileToken`
- Button text shows "Verifying..." when widget hasn't resolved yet

- [ ] **Step 2: Commit**

```bash
git add src/frontend/src/components/auth/LoginForm.tsx
git commit -m "feat: wire Turnstile into LoginForm with token handling"
```

---

## Task 9: Frontend — Wire Turnstile into RegisterForm

**Files:**
- Modify: `src/frontend/src/components/auth/RegisterForm.tsx`

- [ ] **Step 1: Update RegisterForm**

Replace the full contents of `src/frontend/src/components/auth/RegisterForm.tsx`:

```tsx
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { ApiException } from '@/services/api';
import { useTurnstile } from '@/hooks/useTurnstile';

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be at most 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
    email: z.string().email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterForm() {
  const { register: registerUser } = useAuth();
  const turnstileRef = useRef<HTMLDivElement>(null);
  const { token: turnstileToken, isReady, resetTurnstile } = useTurnstile(turnstileRef, 'register');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterFormData) {
    if (!turnstileToken) return;
    try {
      await registerUser(data.username, data.email, data.password, turnstileToken);
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 409) toast.error('Email or username already taken');
        else if (err.status === 403) toast.error('Verification failed. Please try again.');
        else if (err.status === 429) toast.error('Too many attempts. Please try again later.');
        else toast.error(err.detail);
      }
    } finally {
      resetTurnstile();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="username" className="text-sm font-medium text-gray-300">
          Username
        </Label>
        <input
          id="username"
          type="text"
          {...register('username')}
          className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
          placeholder="Enter your username"
        />
        {errors.username && (
          <p className="text-xs text-red-400">{errors.username.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-gray-300">
          Email
        </Label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
          placeholder="Enter your email"
        />
        {errors.email && (
          <p className="text-xs text-red-400">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-medium text-gray-300">
          Password
        </Label>
        <input
          id="password"
          type="password"
          {...register('password')}
          className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="text-xs text-red-400">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
          Confirm Password
        </Label>
        <input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
          className="glass-input w-full rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none"
          placeholder="••••••••"
        />
        {errors.confirmPassword && (
          <p className="text-xs text-red-400">{errors.confirmPassword.message}</p>
        )}
      </div>

      <div ref={turnstileRef} />

      <Button
        type="submit"
        disabled={isSubmitting || !isReady || !turnstileToken}
        className="group w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 h-12 text-sm font-medium rounded-lg shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_50px_rgba(168,85,247,0.3)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
      >
        <span className="flex items-center justify-center gap-2">
          {isSubmitting ? 'Creating account…' : !isReady ? 'Verifying…' : 'Create Account'}
          {!isSubmitting && isReady && turnstileToken && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
              <ArrowRight weight="bold" size={12} />
            </span>
          )}
        </span>
      </Button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-purple-400 hover:text-purple-300 transition-colors duration-300"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
```

Key changes identical to LoginForm: `useTurnstile` hook, token guard, 403 handling, `resetTurnstile()` in `finally`, disabled button states.

- [ ] **Step 2: Verify TypeScript compiles**

Run from `src/frontend`:
```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/frontend/src/components/auth/RegisterForm.tsx
git commit -m "feat: wire Turnstile into RegisterForm with token handling"
```

---

## Task 10: Docker & Environment Config

**Files:**
- Modify: `docker-compose.yml:1-8` (frontend build args)
- Modify: `docker-compose.yml:15-16` (backend env)
- Modify: `.env:2` (add keys)
- Modify: `src/frontend/Dockerfile:5` (add build arg)

- [ ] **Step 1: Update frontend Dockerfile to accept build arg**

The frontend is built as a static nginx image. `VITE_*` env vars are baked in at build time, so we need a Docker build arg. Update `src/frontend/Dockerfile`:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_TURNSTILE_SITE_KEY
ENV VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 2: Update `docker-compose.yml`**

Add the build arg to the frontend service and the env var to the backend service.

The frontend service (lines 2-6) becomes:
```yaml
  frontend:
    build:
      context: ./src/frontend
      args:
        VITE_TURNSTILE_SITE_KEY: ${TURNSTILE_SITE_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

Add the Turnstile secret key to the backend environment (after the existing `Cors__AllowedOrigins__1` line):
```yaml
      - Turnstile__SecretKey=${TURNSTILE_SECRET_KEY}
```

- [ ] **Step 3: Add keys to `.env`**

Add to the end of the `.env` file at the repo root (after the `GCP_PROJECT_ID` line):

```env
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Note: These are Cloudflare's official test keys — the site key `1x00000000000000000000AA` always passes invisibly, and the secret key `1x0000000000000000000000000000000AA` always returns `success: true`. Replace with real keys when deploying.

- [ ] **Step 4: Create `.env` for frontend local dev**

Create `src/frontend/.env`:

```env
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

- [ ] **Step 5: Commit**

```bash
git add src/frontend/Dockerfile docker-compose.yml .env src/frontend/.env
git commit -m "feat: add Turnstile env vars to Docker config and .env"
```

---

## Task 11: Deployment Checklist Update

**Files:**
- Modify: `docs/deployment-checklist.md`

- [ ] **Step 1: Add Turnstile row to Feature Status Matrix**

In `docs/deployment-checklist.md`, add a new row to the Feature Status Matrix table (after the GDELT Sentiment row, line 17):

```markdown
| Turnstile (bot protection) | Cloudflare account | Test keys in `.env` | `TURNSTILE_*` in `.env` | Azure App Settings |
```

- [ ] **Step 2: Add Section 8: Cloudflare Turnstile**

Add after the end of Section 7 (after line 215, the `---` before Environment Variables Summary):

```markdown
## 8. Cloudflare Turnstile (Bot Protection)

Protects login and register endpoints from bots. Uses managed mode with `interaction-only` appearance.

### Cloudflare Setup (one-time)
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → Turnstile → Add Site
2. Add your domain(s): `localhost` for dev, production domain for deployment
3. Widget type: **Managed**
4. Copy the **Site Key** (frontend) and **Secret Key** (backend)

### Local Dev
Uses Cloudflare's official always-pass test keys — no Cloudflare account needed for development.

Frontend: `src/frontend/.env`:
```
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

Backend: already configured in `appsettings.Development.json` with test secret key `1x0000000000000000000000000000000AA`.

### Docker
Set real keys in `.env` at repo root:
```
TURNSTILE_SITE_KEY=<your-site-key>
TURNSTILE_SECRET_KEY=<your-secret-key>
```
These are injected via `docker-compose.yml` — frontend as a build arg, backend as an env var.

### Azure Deployment
Set as Azure App Settings:
```bash
az webapp config appsettings set --name <backend-app> --resource-group <rg> \
  --settings Turnstile__SecretKey="<your-secret-key>"
```
For the frontend (static build), set `VITE_TURNSTILE_SITE_KEY` as a build-time variable in your CI/CD pipeline.

---
```

- [ ] **Step 3: Add Turnstile keys to Environment Variables Summary table**

In the Azure App Settings table near the end of the file, add two new rows:

```markdown
| `TURNSTILE_SITE_KEY` | Frontend | Yes | Cloudflare Turnstile site key (build-time) |
| `Turnstile__SecretKey` | Backend | Yes | Cloudflare Turnstile secret key |
```

- [ ] **Step 4: Add to `.env` file example section**

In the `.env` file example section, add:

```env
TURNSTILE_SITE_KEY=<your-cloudflare-site-key>
TURNSTILE_SECRET_KEY=<your-cloudflare-secret-key>
```

- [ ] **Step 5: Commit**

```bash
git add docs/deployment-checklist.md
git commit -m "docs: add Cloudflare Turnstile section to deployment checklist"
```

---

## Task 12: End-to-End Smoke Test via Docker

**Files:** None (verification only)

- [ ] **Step 1: Rebuild and start Docker stack**

Run from repo root:
```bash
docker compose down && docker compose build --no-cache && docker compose up -d
```
Wait for all services to be healthy:
```bash
docker compose ps
```
Expected: All 4 services (frontend, backend, ml, db) running.

- [ ] **Step 2: Verify backend health**

```bash
curl http://localhost:5000/api/health
```
Expected: 200 OK.

- [ ] **Step 3: Test login WITHOUT Turnstile token (should fail)**

```bash
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}' | jq .
```
Expected: 400 Bad Request with validation error about `TurnstileToken` being required.

- [ ] **Step 4: Test login WITH Turnstile test token (should work)**

First register a test user:
```bash
curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"password123","turnstileToken":"test-token"}' | jq .
```
Expected: 201 Created with JWT response (because the test secret key always passes).

Then login:
```bash
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","turnstileToken":"test-token"}' | jq .
```
Expected: 200 OK with JWT response.

- [ ] **Step 5: Test the frontend via browser (Playwright)**

Open `http://localhost:3000/login` in the browser. Verify:
1. The login form renders
2. The Turnstile widget loads (invisible — check the network tab for requests to `challenges.cloudflare.com`)
3. Fill in email + password, click "Sign In"
4. Successful login → redirected to `/dashboard`

Repeat for `http://localhost:3000/register`:
1. The register form renders
2. Fill in all fields, click "Create Account"
3. Successful registration → redirected to `/dashboard`

- [ ] **Step 6: Commit (if any fixes were needed)**

Only commit if smoke testing revealed issues that required code changes. Otherwise, skip this step.
