"""Training endpoint (stub)."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


@router.post("/train")
def train() -> JSONResponse:
    """Stub — full retraining is future work."""
    return JSONResponse(
        status_code=501,
        content={"status": "not_implemented"},
    )
