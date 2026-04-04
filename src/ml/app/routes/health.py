"""Health check endpoint."""

from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
def health_check(request: Request) -> dict:
    """Return service health status and model readiness."""
    return {
        "status": "healthy",
        "model_loaded": request.app.state.model_loaded,
    }
