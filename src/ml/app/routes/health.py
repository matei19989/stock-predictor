"""Health check endpoint."""

from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
def health_check(request: Request) -> dict:
    """Return service health status and model readiness."""
    model_loaded = request.app.state.model_loaded
    return {
        "status": "healthy" if model_loaded else "degraded",
        "model_loaded": model_loaded,
    }
