"""
Auto-capture routes for Option 3.

The backend directly opens the USB microscope/camera using OpenCV, captures one
frame, analyzes it, saves the result, and returns the same response structure as
manual image upload.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Form, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import SampleOut
from app.routes.samples import _build_sample_out
from app.services import camera_service, detector, calculator, file_service
from app.config import CAMERA_DEFAULT_INDEX, CAMERA_WARMUP_FRAMES

router = APIRouter(prefix="/camera", tags=["Camera Auto Capture"])


@router.post("/capture-and-analyze", response_model=SampleOut, status_code=201)
def capture_and_analyze(
    sample_source: str = Form("Tap Water"),
    chamber_volume_ml: float = Form(50.0, gt=0),
    notes: Optional[str] = Form("Auto-captured from USB microscope"),
    camera_index: int = Form(CAMERA_DEFAULT_INDEX),
    warmup_frames: int = Form(CAMERA_WARMUP_FRAMES),
    db: Session = Depends(get_db),
):
    """Capture one frame from camera and analyze it automatically."""
    try:
        original_path = camera_service.capture_frame(camera_index=camera_index, warmup_frames=warmup_frames)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    try:
        result = detector.analyze_image(str(original_path))
    except ValueError as exc:
        file_service.delete_file_if_exists(str(original_path))
        raise HTTPException(status_code=422, detail=str(exc))

    calc = calculator.calculate_results(
        detected_particles=result.count,
        chamber_volume_ml=chamber_volume_ml,
        average_area=result.average_particle_area,
        laplacian_variance=result.laplacian_variance,
        mean_brightness=result.mean_brightness,
    )

    sample = models.Sample(
        sample_source=sample_source,
        chamber_volume_ml=chamber_volume_ml,
        detected_particles=result.count,
        estimated_particles_per_litre=calc["estimated_particles_per_litre"],
        mpi_score=calc["mpi_score"],
        monitoring_risk_level=calc["monitoring_risk_level"],
        confidence_score=calc["confidence_score"],
        average_particle_area=result.average_particle_area,
        average_brightness=result.average_brightness,
        size_category=calc["size_category"],
        original_file_path=str(original_path),
        processed_file_path=result.processed_image_path,
        file_type="image",
        average_particles_per_frame=None,
        notes=notes,
        recommendation=calc["recommendation"],
    )
    db.add(sample)
    db.flush()

    for p in result.particles:
        db.add(models.ParticleFeature(
            sample_id=sample.id,
            x=p.x, y=p.y, width=p.width, height=p.height,
            area=p.area, brightness=p.brightness,
            size_category=p.size_category,
        ))

    db.commit()
    db.refresh(sample)
    return _build_sample_out(sample)
