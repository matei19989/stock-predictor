"""FastAPI ML service entry point.

Loads the XGBoost model, label encoder, and training metadata on startup.
Serves prediction, data, health, and training endpoints.
"""

import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
from fastapi import FastAPI

from app.routes import data, health, predict, train
from app.services.sentiment import _build_ticker_mapping

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).parent / "models"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load model artifacts on startup, clean up on shutdown."""
    app.state.model_loaded = False
    app.state.model = None
    app.state.label_encoder = None
    app.state.feature_columns = []
    app.state.training_metadata = {}
    app.state.ticker_to_company = {}

    model_path = MODELS_DIR / "xgb_3m_sentiment.joblib"
    encoder_path = MODELS_DIR / "label_encoder.joblib"
    metadata_path = MODELS_DIR / "training_metadata.json"

    try:
        # Load training metadata
        with open(metadata_path) as f:
            metadata = json.load(f)
        app.state.training_metadata = metadata
        app.state.feature_columns = metadata["sentiment_model"]["feature_columns"]
        logger.info("Loaded training metadata: %d features", len(app.state.feature_columns))

        # Load model and encoder
        app.state.model = joblib.load(model_path)
        logger.info("Loaded XGBoost model from %s", model_path)

        app.state.label_encoder = joblib.load(encoder_path)
        logger.info("Loaded label encoder: %s", list(app.state.label_encoder.classes_))

        app.state.model_loaded = True
        logger.info("All model artifacts loaded successfully")

        # Build ticker→company mapping for sentiment (non-blocking)
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
app.include_router(predict.router)
app.include_router(train.router)
