"""Ticker-to-company-name mapping endpoint."""

import json
import logging
from pathlib import Path

from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter()

_NAMES_PATH = Path(__file__).parent.parent / "models" / "ticker_names.json"
_cached: dict | None = None


@router.get("/names")
def get_ticker_names() -> dict:
    """Return all 499 ticker → {name, sector} mappings."""
    global _cached
    if _cached is None:
        with open(_NAMES_PATH) as f:
            _cached = json.load(f)
        logger.info("Loaded %d ticker names from %s", len(_cached), _NAMES_PATH)
    return _cached
