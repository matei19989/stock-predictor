# Deployment Checklist

Everything you need to enable each feature locally and in production.

## Feature Status Matrix

| Feature | What it needs | Local Dev | Docker | Azure Deployment |
|---------|--------------|-----------|--------|-----------------|
| Frontend | Node.js 20+ | `npm run dev` | Dockerfile | Container |
| Backend API | .NET 9 SDK | `dotnet run` | Dockerfile | Container |
| ML Service | Python 3.11+ | `uvicorn` | Dockerfile | Container |
| PostgreSQL | Database | Local install or `docker compose up db` | docker-compose | Azure Database for PostgreSQL |
| JWT Auth | Secret key | appsettings.Development.json | `JWT_KEY` in `.env` | Azure App Settings / Key Vault |
| DB Migrations | EF Core CLI | `dotnet ef database update` | Auto on startup | Run once against prod DB |
| Stock Data (yfinance) | Internet | Works out of the box | Works out of the box | Works out of the box |
| Predictions (XGBoost) | `.joblib` model files | Train via notebook 07 | Copy into `src/ml/app/models/` | Include in Docker image |
| GDELT Sentiment | BigQuery access | `gcloud auth application-default login` | Mount ADC or set `GCP_CREDENTIALS_JSON` | Workload Identity Federation |

---

## 1. JWT Authentication

### Local Dev
Already configured in `appsettings.Development.json`. No action needed.

### Docker
Set `JWT_KEY` in `.env` at repo root (already gitignored):
```
JWT_KEY=your-secret-key-at-least-32-characters-long
```

### Azure Deployment
Store as an **App Setting** or in **Azure Key Vault**:
```bash
az webapp config appsettings set --name <app> --resource-group <rg> \
  --settings Jwt__Key="<your-secret-key>"
```

---

## 2. PostgreSQL Database

### Local Dev
Option A — Run via Docker (recommended):
```bash
docker compose up db
```
Connection: `Host=localhost;Database=stockpredictor;Username=admin;Password=dev_password`

Option B — Local PostgreSQL install, then:
```sql
CREATE DATABASE stockpredictor;
CREATE USER admin WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE stockpredictor TO admin;
```

### Docker
Included in `docker-compose.yml`. Automatic.

### Azure Deployment
Create **Azure Database for PostgreSQL Flexible Server**, then set the connection string:
```bash
az webapp config appsettings set --name <app> --resource-group <rg> \
  --settings ConnectionStrings__Default="Host=<server>.postgres.database.azure.com;Database=stockpredictor;Username=<user>;Password=<pass>;SslMode=Require"
```

---

## 3. Database Migrations

### Local Dev
```bash
cd src/backend/API
dotnet ef database update --project ../Infrastructure/StockPredictor.Infrastructure.csproj
```

### Docker / Azure
Migrations run automatically on backend startup via EF Core. Ensure the database is reachable before the backend container starts.

---

## 4. ML Model Files (.joblib)

**These are gitignored and must be generated locally.**

### How to generate
1. Open `notebooks/07_model_optimization.ipynb`
2. Run all cells — this trains the model and saves:
   - `src/ml/app/models/xgb_3m_sentiment.joblib` (XGBoost model)
   - `src/ml/app/models/label_encoder.joblib` (label encoder)
3. Verify: `ls src/ml/app/models/*.joblib`

### Local Dev
After training, the files are in place. ML service picks them up on startup.

### Docker
The Dockerfile copies everything from `src/ml/` including the `models/` directory. **Train the model before building the Docker image.**

### Azure Deployment
Same as Docker — the `.joblib` files must exist in `src/ml/app/models/` before `docker build`.

---

## 5. GDELT Sentiment (BigQuery)

Predictions work without this — sentiment features degrade to NaN and XGBoost handles it natively. But for full accuracy:

### Local Dev
Authenticate once with Google Cloud:
```bash
gcloud auth application-default login
```
Set `GCP_PROJECT_ID` in `.env`:
```
GCP_PROJECT_ID=stock-predictor-491310
```
Or export it:
```bash
export GCP_PROJECT_ID=stock-predictor-491310
```

### Docker (local)
Option A — Mount your local ADC credentials:
Add to `docker-compose.yml` under `ml` service volumes:
```yaml
- ${APPDATA}/gcloud/application_default_credentials.json:/app/credentials/adc.json:ro
```
And set:
```yaml
- GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/adc.json
```

Option B — Use `GCP_CREDENTIALS_JSON` env var (see Azure section below).

### Azure Deployment (Workload Identity Federation)

Since Google no longer allows downloading service account JSON keys, use **Workload Identity Federation** to let Azure authenticate to GCP:

#### Step 1: Create a Workload Identity Pool in GCP
```bash
# In GCP Cloud Shell or gcloud CLI
gcloud iam workload-identity-pools create azure-pool \
  --location="global" \
  --display-name="Azure Pool"

gcloud iam workload-identity-pools providers create-oidc azure-provider \
  --location="global" \
  --workload-identity-pool="azure-pool" \
  --issuer-uri="https://login.microsoftonline.com/<AZURE_TENANT_ID>/v2.0" \
  --attribute-mapping="google.subject=assertion.sub" \
  --allowed-audiences="api://<AZURE_CLIENT_ID>"
```

#### Step 2: Grant BigQuery access to the federated identity
```bash
gcloud projects add-iam-policy-binding stock-predictor-491310 \
  --role="roles/bigquery.user" \
  --member="principalSet://iam.googleapis.com/projects/<GCP_PROJECT_NUMBER>/locations/global/workloadIdentityPools/azure-pool/*"
```

#### Step 3: Configure the ML service
Set these environment variables in Azure App Settings:
```
GCP_PROJECT_ID=stock-predictor-491310
GOOGLE_CLOUD_PROJECT=stock-predictor-491310
```

The Google Cloud client libraries automatically discover Workload Identity Federation when running on a supported platform.

#### Alternative: Base64-encoded credentials
If you have access to a service account JSON (e.g., from an existing key), encode and store it:
```bash
# Encode
base64 -w 0 service-account.json

# Set as Azure App Setting
az webapp config appsettings set --name <app> --resource-group <rg> \
  --settings GCP_CREDENTIALS_JSON="<base64-encoded-json>"
```
The ML service decodes this at startup (handled in `sentiment.py`).

---

## 6. CORS Configuration

### Local Dev
Already configured in `appsettings.Development.json`: allows `http://localhost:3000`.

### Docker
Set in `docker-compose.yml`: allows `http://localhost:3000` and `http://frontend:3000`.

### Azure Deployment
Update via App Settings:
```bash
az webapp config appsettings set --name <app> --resource-group <rg> \
  --settings Cors__AllowedOrigins__0="https://your-frontend-domain.com"
```

---

## 7. Hangfire (Background Jobs)

### All environments
Configured via `Hangfire__RefreshCron` (default: `0 * * * *` = every hour).
Hangfire uses the same PostgreSQL database — no additional setup needed.

### Azure Deployment
If you want a different schedule:
```bash
az webapp config appsettings set --name <app> --resource-group <rg> \
  --settings Hangfire__RefreshCron="0 */2 * * *"
```

---

## Environment Variables Summary

### `.env` file (local Docker — gitignored)
```env
JWT_KEY=<random-secret-min-32-chars>
GCP_PROJECT_ID=stock-predictor-491310
GCP_CREDENTIALS_JSON=<base64-encoded-service-account-json>  # optional
```

### Azure App Settings (production)
| Variable | Service | Required | Description |
|----------|---------|----------|-------------|
| `Jwt__Key` | Backend | Yes | JWT signing key (min 32 chars) |
| `ConnectionStrings__Default` | Backend | Yes | PostgreSQL connection string |
| `MlService__BaseUrl` | Backend | Yes | ML service URL (e.g., `http://ml:8000`) |
| `Cors__AllowedOrigins__0` | Backend | Yes | Frontend URL |
| `GCP_PROJECT_ID` | ML | No | GCP project for BigQuery billing |
| `GCP_CREDENTIALS_JSON` | ML | No | Base64 service account JSON (if not using WIF) |
| `ASPNETCORE_ENVIRONMENT` | Backend | No | Set to `Production` |

---

## Quick Verification Commands

```bash
# Check everything is running (Docker)
docker compose ps

# Test backend health
curl http://localhost:5000/api/health

# Test ML service health
curl http://localhost:8000/health

# Test BigQuery connectivity (from ML container)
docker compose exec ml python -c "
from app.services.sentiment import _get_bq_client
c = _get_bq_client()
print('OK' if c else 'FAILED')
"

# Test prediction (requires model files)
curl -X POST http://localhost:8000/predict \
  -H 'Content-Type: application/json' \
  -d '{"ticker": "AAPL", "horizon": "3m"}'
```
