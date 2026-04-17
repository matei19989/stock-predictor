FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Fail the build if any required model artifact is missing from the image.
# Catches silent .gitignore/.dockerignore mistakes that would otherwise ship
# a container whose /predict returns 503 "Model not loaded" on every request.
RUN set -e; \
    for f in training_metadata.json label_encoder.joblib \
             xgb_3m_blended.json xgb_6m_blended.json xgb_1y_blended.json; do \
      test -f "/app/app/models/$f" || { echo "MODEL MISSING: $f" >&2; exit 1; }; \
    done; \
    echo "Model smoke check: all required artifacts present"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
