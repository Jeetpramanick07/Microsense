from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app import models
from app.schemas import AnalyticsSummary
from app.routes.samples import _build_sample_out

router = APIRouter(prefix="/analytics", tags=["Analytics"])

RISK_LEVELS = ["Very Low", "Low", "Moderate", "High", "Very High"]


@router.get("/summary", response_model=AnalyticsSummary)
def analytics_summary(db: Session = Depends(get_db)):
    """Aggregate statistics across all analyzed samples."""

    total = db.query(func.count(models.Sample.id)).scalar() or 0

    avg_mpi = db.query(func.avg(models.Sample.mpi_score)).scalar() or 0.0
    avg_ppl = db.query(func.avg(models.Sample.estimated_particles_per_litre)).scalar() or 0.0

    high_risk = (
        db.query(func.count(models.Sample.id))
        .filter(models.Sample.monitoring_risk_level == "High")
        .scalar() or 0
    )
    very_high_risk = (
        db.query(func.count(models.Sample.id))
        .filter(models.Sample.monitoring_risk_level == "Very High")
        .scalar() or 0
    )

    latest = (
        db.query(models.Sample)
        .order_by(models.Sample.created_at.desc())
        .first()
    )

    # Build risk distribution dict
    distribution = {}
    for level in RISK_LEVELS:
        count = (
            db.query(func.count(models.Sample.id))
            .filter(models.Sample.monitoring_risk_level == level)
            .scalar() or 0
        )
        distribution[level] = count

    return {
        "total_samples": total,
        "average_mpi": round(float(avg_mpi), 2),
        "average_particles_per_litre": round(float(avg_ppl), 2),
        "high_risk_samples": high_risk,
        "very_high_risk_samples": very_high_risk,
        "latest_sample": _build_sample_out(latest) if latest else None,
        "risk_distribution": distribution,
    }
