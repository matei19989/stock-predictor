# Security audit — 2026-04-17

Baseline audit of runtime (non-dev) dependencies across the three services. Ran `npm audit --omit=dev` (frontend), `dotnet list package --vulnerable --include-transitive` (backend), and `pip-audit -r requirements.txt` (ML).

## Findings & resolutions

| Service | Package | Version | Severity | Advisory | Resolution |
|---|---|---|---|---|---|
| Frontend | `follow-redirects` | `<=1.15.11` | Moderate | [GHSA-r4q5-vmmm-2653](https://github.com/advisories/GHSA-r4q5-vmmm-2653) — leaks Authorization headers on cross-domain redirects | `npm audit fix` bumped the transitive dep; 13 packages updated in `package-lock.json`. Post-fix: **0 vulnerabilities**. |
| Backend | `Newtonsoft.Json` | `11.0.1` (transitive via `Hangfire.AspNetCore`) | High | [GHSA-5crp-9r3c-p9vr](https://github.com/advisories/GHSA-5crp-9r3c-p9vr) — denial-of-service via crafted JSON | Added direct `<PackageReference Include="Newtonsoft.Json" Version="13.0.3" />` to both `API` and `Infrastructure` csproj to override the transitive version. Post-fix: **0 vulnerabilities** across all projects. |
| ML | `requests` | `2.32.5` | — | CVE-2026-25645 | Bumped to `requests==2.33.0` in `requirements.txt`. |
| ML | `curl-cffi` | `0.13.0` (transitive via `yfinance==1.2.0`) | — | CVE-2026-33752 | **Not fixed**. `yfinance 1.2.0` pins `curl-cffi<0.15.0`, so the patched version can't be installed without upgrading yfinance, which risks breaking `services/data_fetcher.py`. Tracked for a future yfinance bump. |

## Net result

- Frontend: 0 vulnerabilities.
- Backend: 0 vulnerabilities.
- ML: 1 remaining (curl-cffi, transitive, blocked on yfinance upgrade).

## Ongoing coverage

Automated package-level auditing is intentionally not wired into CI (npm/nuget/pypi advisories move too fast to treat as a deploy gate). Rerun the three commands manually before each thesis milestone.

```bash
# Frontend
cd src/frontend && npm audit --omit=dev

# Backend (after dotnet restore)
cd src/backend && dotnet list StockPredictor.sln package --vulnerable --include-transitive

# ML
pip-audit -r src/ml/requirements.txt --desc off
```
