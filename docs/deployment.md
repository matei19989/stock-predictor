# Deployment

Live URL: **https://frontend.proudsky-6e05d5cc.westeurope.azurecontainerapps.io**

The app is deployed to Azure Container Apps with Neon for PostgreSQL. Total recurring cost: effectively $0/mo while idle (scale-to-zero) and inside the Container Apps free grant during typical demo usage.

## Architecture

```
  Browser ──https──▶ Frontend (nginx)  ◀── public, scale-to-zero
                         │
                         │ https
                         ▼
                    Backend (.NET 9)   ◀── public, scale-to-zero
                         │       │
                  http   │       │ TLS (sslmode=require)
                         ▼       ▼
                    ML (FastAPI)    Neon Postgres 17
                    internal, s2z   (eu-central, free tier)
```

All three apps run on one **Azure Container Apps environment** (`stockpredictor-env`, West Europe). The environment is free; you only pay for container runtime above the monthly free grant (180k vCPU-sec + 360k GiB-sec). Everything is `min-replicas=0` so idle costs nothing.

## Resources

| Resource | Type | Notes |
|---|---|---|
| `stockpredictor-rg` | Azure Resource Group | West Europe |
| `stockpredictor-env` | Container Apps environment | Logs destination: none (saves Log Analytics cost) |
| `frontend` | Container App | nginx serving static build; external ingress :3000 |
| `backend` | Container App | .NET 9; external ingress :5000 |
| `ml` | Container App | Python FastAPI; internal ingress :8000 |
| `stockpredictor-email` | Email Communication Services | Azure-managed domain, free tier (100 emails/mo) |
| `stockpredictor-comms` | Communication Services | Linked to the email domain above |
| Neon project `stockpredictor` | External (neon.tech) | Postgres 17, eu-central-1, free tier 0.5 GB |
| `ghcr.io/matei19989/stockpredictor-*` | Public container images | Pulled by ACA without credentials |

## Environment variables on the backend

Set via `az containerapp update --set-env-vars` and secrets via `az containerapp secret set`. Current values:

| Name | Source | Purpose |
|---|---|---|
| `ConnectionStrings__Default` | secret `conn-str` | Neon Postgres URL |
| `Jwt__Key` | secret `jwt-key` | JWT signing key |
| `Turnstile__SecretKey` | secret `turnstile-secret` | Cloudflare Turnstile secret |
| `Email__ConnectionString` | secret `acs-conn` | Azure Communication Services connection string |
| `Email__FrontendUrl` | env | `https://frontend.proudsky-...` |
| `Email__SenderAddress` | env | `DoNotReply@<guid>.azurecomm.net` |
| `MlService__BaseUrl` | env | `http://ml` (short hostname, same env) |
| `Cors__AllowedOrigins__0` | env | Frontend URL |
| `Hangfire__RefreshCron` | env | `0 */6 * * *` (every 6h) |
| `ASPNETCORE_ENVIRONMENT` | env | `Production` |

Secrets are rotated with `az containerapp secret set`; env vars with `az containerapp update --set-env-vars KEY=value`. Either operation requires a container restart to take effect; scale-to-zero handles this automatically on the next request.

## Where each cost comes from

| Item | Approx /mo | Why |
|---|---|---|
| Container Apps compute | $0 | All `min-replicas=0`, well inside free grant at demo usage |
| Neon Postgres | $0 | Free tier, pauses after 5 min idle |
| Azure Communication Services | $0 | Free tier: 100 emails/mo |
| Static outbound bandwidth | $0 | First 100 GB/mo free from Azure |
| ghcr.io image storage | $0 | Free for public packages |

If something starts charging unexpectedly, check Cost Analysis in the Azure Portal scoped to `stockpredictor-rg`.

## Cold starts

Scale-to-zero means the first request after ~5–10 min of idle pays a cold-start tax:

| Component | Cold start | Warm |
|---|---|---|
| Frontend (nginx) | ~3s | <50ms |
| Backend (.NET 9 + EF migrations check) | ~8–12s | ~100ms |
| ML (Python + XGBoost models load) | ~20–30s | ~500ms |
| Neon Postgres | ~2s | <10ms |

**First page-load after idle**: frontend + backend + DB = ~15s total.
**First prediction after idle**: add ML = ~40s total.

### Warming strategy before a demo

Hit these URLs a few minutes before presenting:

```bash
curl https://frontend.proudsky-6e05d5cc.westeurope.azurecontainerapps.io/
curl https://backend.proudsky-6e05d5cc.westeurope.azurecontainerapps.io/api/stocks/search?q=AAPL
# (backend call indirectly warms ML + Neon)
```

For absolute reliability during thesis defense, bump `min-replicas=1` on backend + ml a day before:

```bash
az containerapp update --name backend --resource-group stockpredictor-rg --min-replicas 1
az containerapp update --name ml      --resource-group stockpredictor-rg --min-replicas 1
```

Reverse it after the defense to go back to $0/mo:

```bash
az containerapp update --name backend --resource-group stockpredictor-rg --min-replicas 0
az containerapp update --name ml      --resource-group stockpredictor-rg --min-replicas 0
```

## CI/CD

`.github/workflows/deploy.yml` triggers on push to `main`. Path filters decide which of the three services get rebuilt:

- Changes under `src/backend/**` → backend job (runs `dotnet test`, builds, pushes, deploys)
- Changes under `src/ml/**` → ml job
- Changes under `src/frontend/**` → frontend job

Auth:
- **ghcr.io push**: `GITHUB_TOKEN` with `packages: write` permission (no PAT needed)
- **Azure deploy**: service principal stored as `AZURE_CREDENTIALS` repo secret, scoped to `stockpredictor-rg`

Build-time secrets consumed by the frontend job:
- `VITE_TURNSTILE_SITE_KEY` — Turnstile site key (public once in the bundle, but stored as secret for consistency)
- `VITE_API_URL` — backend URL baked into the frontend build

All three images are tagged `:sha-<commit>` and `:latest`. ACA is updated with the SHA tag to guarantee a new revision on every deploy.

### Trigger a deploy manually

Push something to `main`, or use workflow_dispatch:

```
https://github.com/matei19989/stock-predictor/actions/workflows/deploy.yml → Run workflow
```

## Rollback

Each deploy creates a new Container Apps revision. To roll back:

```bash
# List recent revisions
az containerapp revision list --name backend --resource-group stockpredictor-rg \
  --query "[].{name:name, created:properties.createdTime, active:properties.active}" -o table

# Activate an older one
az containerapp revision activate --name backend --resource-group stockpredictor-rg \
  --revision <old-revision-name>
```

Or just redeploy an older SHA tag:

```bash
az containerapp update --name backend --resource-group stockpredictor-rg \
  --image ghcr.io/matei19989/stockpredictor-backend:sha-<older-commit>
```

## Operational gotchas learned the hard way

- **TCP internal ingress in ACA**: use the short hostname (`postgres`, `ml`) between apps in the same env, never the full `.internal.<env>.azurecontainerapps.io` FQDN — the long form times out on TCP even though DNS resolves. HTTP works either way.
- **Azure subdomains and Cloudflare Turnstile**: `*.azurecontainerapps.io` is on the Public Suffix List, which makes it awkward to register as a Turnstile hostname. Add it in the Cloudflare dashboard with a workaround or buy a real domain.
- **Axios timeout vs cold start**: `src/frontend/src/services/api.ts` uses 60s timeout; don't lower it below ~30s or cold starts will surface as failed requests.
- **Migrations on deploy**: EF Core auto-applies migrations on backend startup. If a migration is broken, the backend crash-loops — catch it locally against Neon with `dotnet ef database update` before merging.
- **EF Core design-time tools need `Jwt__Key`**: any `dotnet ef` command bootstraps the full host, which requires the JWT key. Pass it as an env var when running migrations locally: `Jwt__Key=... dotnet ef ...`.

## Local development

See the top-level [README.md](../README.md) for local setup.
