"""Health check endpoint."""

from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
def health_check(request: Request) -> dict:
    """Return service health status, model readiness, and loaded horizons."""
    model_loaded = request.app.state.model_loaded
    models = getattr(request.app.state, "models", {})
    loaded_horizons = [h for h, entry in models.items() if entry is not None]
    return {
        "status": "healthy" if model_loaded else "degraded",
        "model_loaded": model_loaded,
        "horizons": loaded_horizons,
    }
