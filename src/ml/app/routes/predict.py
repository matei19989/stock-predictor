"""Prediction endpoint."""

import logging

from fastapi import APIRouter, HTTPException, Request

from app.schemas.predict import PredictRequest, PredictResponse
from app.services.prediction import run_prediction

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
def predict(request: Request, body: PredictRequest) -> PredictResponse:
    """Run XGBoost inference and return a trading signal."""
    state = request.app.state

    # Check overall model readiness
    if not state.model_loaded:
        raise HTTPException(status_code=503, detail={"error": "model_not_ready"})

    # Look up model for requested horizon
    model_entry = state.models.get(body.horizon)
    if model_entry is None:
        raise HTTPException(
            status_code=501,
            detail={"error": "horizon_not_supported", "detail": f"No trained model for '{body.horizon}' horizon yet"},
        )

    try:
        result = run_prediction(
            ticker=body.ticker.upper(),
            horizon=body.horizon,
            model=model_entry["model"],
            label_encoder=state.label_encoder,
            feature_columns=state.feature_columns,
            ticker_to_company=state.ticker_to_company,
            model_type=model_entry["type"],
        )
    except ValueError as e:
        logger.warning("Data fetch failed for %s: %s", body.ticker, e)
        raise HTTPException(
            status_code=502,
            detail={"error": "data_fetch_failed"},
        )
    except Exception as e:
        logger.error("Prediction failed for %s: %s", body.ticker, e, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={"error": "prediction_failed"},
        )

    return PredictResponse(**result)
