from fastapi import APIRouter
from app.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Simple health-check endpoint."""
    return {
        "status": "ok",
        "project": "MicroSense AI-Cam",
        "message": "Backend running successfully",
    }
