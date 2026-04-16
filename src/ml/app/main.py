"""FastAPI ML service entry point.

Loads XGBoost models for all horizons, label encoder, and training metadata on startup.
Serves prediction, data, and health endpoints.
"""

import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import xgboost as xgb
from fastapi import FastAPI

from app.routes import data, health, names, predict
from app.services.sentiment import _build_ticker_mapping

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).parent / "models"

HORIZONS = ["3m", "6m", "1y"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model artifacts on startup, clean up on shutdown."""
    app.state.model_loaded = False
    app.state.models = {}
    app.state.label_encoder = None
    app.state.feature_columns = []
    app.state.training_metadata = {}
    app.state.ticker_to_company = {}

    encoder_path = MODELS_DIR / "label_encoder.joblib"
    metadata_path = MODELS_DIR / "training_metadata.json"

    try:
        # Load training metadata
        with open(metadata_path) as f:
            metadata = json.load(f)
        app.state.training_metadata = metadata
        app.state.feature_columns = metadata["sentiment_model"]["feature_columns"]
        logger.info("Loaded training metadata: %d features", len(app.state.feature_columns))

        # Load models per horizon
        for horizon in HORIZONS:
            blended_path = MODELS_DIR / f"xgb_{horizon}_blended.json"
            fallback_path = MODELS_DIR / f"xgb_{horizon}_sentiment.joblib"

            if blended_path.exists():
                booster = xgb.Booster()
                booster.load_model(str(blended_path))
                app.state.models[horizon] = {"model": booster, "type": "booster"}
                logger.info("Loaded blended model for %s from %s", horizon, blended_path)
            elif fallback_path.exists():
                app.state.models[horizon] = {"model": joblib.load(fallback_path), "type": "sklearn"}
                logger.info("Loaded sklearn model for %s from %s (fallback)", horizon, fallback_path)
            else:
                app.state.models[horizon] = None
                logger.warning("No model found for %s — this horizon will return 501", horizon)

        app.state.label_encoder = joblib.load(encoder_path)
        logger.info("Loaded label encoder: %s", list(app.state.label_encoder.classes_))

        loaded_horizons = [h for h in HORIZONS if app.state.models.get(h) is not None]
        if loaded_horizons:
            app.state.model_loaded = True
            logger.info("Models loaded for horizons: %s", loaded_horizons)
        else:
            logger.error("No models loaded — /predict will return 503")

        # Build ticker->company mapping for sentiment (non-blocking)
        try:
            app.state.ticker_to_company = _build_ticker_mapping(metadata)
        except Exception as e:
            logger.warning("Failed to build ticker mapping: %s — sentiment will be unavailable", e)

    except FileNotFoundError as e:
        logger.error("Model file not found: %s — /predict will return 503", e)
    except Exception as e:
        logger.error("Failed to load model artifacts: %s — /predict will return 503", e)

    yield

    logger.info("Shutting down ML service")


app = FastAPI(
    title="StockPredictor ML Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(data.router)
app.include_router(names.router)
app.include_router(predict.router)
