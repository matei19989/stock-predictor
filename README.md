# StockPredictor

Stock market analysis and prediction app. View stock data, manage watchlists, and get ML-powered trading signal recommendations (Strong Sell to Strong Buy).

**Live demo:** https://frontend.proudsky-6e05d5cc.westeurope.azurecontainerapps.io *(scale-to-zero — first load takes ~10–15s, instant thereafter)*

**Stack:** React + TypeScript | .NET 9 API | Python FastAPI (ML) | PostgreSQL (Neon in prod) | Cloudflare Turnstile | Azure Communication Services (email) | Azure Container Apps + GitHub Actions CI/CD

**Deployment:** see [`docs/deployment.md`](docs/deployment.md) for architecture, cost, rollback, and cold-start mitigation.

## Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Python 3.11+](https://www.python.org/downloads/)
- [PostgreSQL 16](https://www.postgresql.org/download/) (or use Docker)
- [Docker](https://www.docker.com/) (optional, for containerized setup)

## Quick Start with Docker

The easiest way to run everything:

```bash
# Set a JWT signing key (required)
export JWT_KEY="your-secret-key-at-least-32-characters-long"

# Build and start all services
docker compose up --build
```

This starts:
| Service    | URL                     |
|------------|-------------------------|
| Frontend   | http://localhost:3000    |
| Backend    | http://localhost:5000    |
| ML Service | http://localhost:8000    |
| PostgreSQL | localhost:5432           |

To stop: `docker compose down` (add `-v` to also wipe the database volume).

### Optional: GDELT Sentiment

Predictions work without this, but for full sentiment analysis:

1. Create a GCP service account with BigQuery access
2. Place the JSON key at `credentials/gcp-service-account.json`

## Local Development (without Docker)

Run each service separately for faster iteration with hot-reload.

### 1. Database

Start PostgreSQL and create the database:

```bash
psql -U postgres -c "CREATE DATABASE stockpredictor;"
psql -U postgres -c "CREATE USER admin WITH PASSWORD 'dev_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE stockpredictor TO admin;"
```

Or just run the database container alone:

```bash
docker compose up db
```

### 2. ML Service

```bash
cd src/ml

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Start the service
uvicorn app.main:app --reload --port 8000
```

Runs at http://localhost:8000. Check health: `GET http://localhost:8000/health`

### 3. Backend (.NET API)

```bash
cd src/backend/API

# Apply EF Core migrations
dotnet ef database update --project ../Infrastructure/StockPredictor.Infrastructure.csproj

# Run the API
dotnet run
```

Runs at http://localhost:5000. The dev config (`appsettings.Development.json`) points to `localhost` for both PostgreSQL and the ML service.

### 4. Frontend

```bash
cd src/frontend

npm install
npm run dev
```

Runs at http://localhost:5173 (Vite dev server). API calls are proxied to `http://localhost:5000` automatically via Vite's dev proxy.

## Running Tests

```bash
# Backend unit tests
dotnet test tests/backend/StockPredictor.Tests.Unit/StockPredictor.Tests.Unit.csproj

# ML tests (from repo root)
cd src/ml && python -m pytest ../../tests/ml -v

# Frontend lint + type check
cd src/frontend && npm run lint && npm run build
```

## Project Structure

```
StockPredictor/
├── .github/workflows/     # GitHub Actions (build + deploy on push to main)
├── src/
│   ├── frontend/          # React + TypeScript (Vite)
│   ├── backend/           # .NET 9 Clean Architecture
│   │   ├── Domain/        #   Entities, enums
│   │   ├── Application/   #   Interfaces, DTOs, validators
│   │   ├── Infrastructure/#   EF Core, repositories, services
│   │   └── API/           #   Controllers, middleware, DI
│   └── ml/                # Python FastAPI ML service
├── tests/
│   ├── backend/           # xUnit tests
│   └── ml/                # pytest tests
├── docs/                  # Deployment + ML progress notes
├── deploy/azure/          # ARM/YAML specs used during Azure bootstrap
├── docker-compose.yml
└── README.md
```

## Environment Variables (local dev)

| Variable | Service | Description |
|----------|---------|-------------|
| `JWT_KEY` | Backend | JWT signing key (min 32 chars, required) |
| `TURNSTILE_SITE_KEY` | Frontend | Cloudflare Turnstile site key (bot protection) |
| `TURNSTILE_SECRET_KEY` | Backend | Cloudflare Turnstile secret key (bot protection) |
| `GOOGLE_APPLICATION_CREDENTIALS` | ML | Path to GCP service account JSON (optional, for GDELT sentiment) |
| `VITE_API_URL` | Frontend | Backend API base URL (empty in dev, proxied by Vite) |
| `Email__ConnectionString` | Backend | Azure Communication Services connection string (empty in dev = auto-confirm) |
| `Email__FrontendUrl` | Backend | Frontend URL for email confirmation links |
| `Email__SenderAddress` | Backend | Azure-managed sender email address |

For **production environment variables and secrets** (set as Container Apps secrets + GitHub Actions repository secrets), see [`docs/deployment.md`](docs/deployment.md).

## Deploying changes

Merge a PR into `main`. The GitHub Actions workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) detects which of `src/{backend,ml,frontend}` changed and rebuilds only those images, pushes them to ghcr.io, and updates the corresponding Container App. Changes to `docs/`, `notebooks/`, or `tests/` don't trigger any deploy.
