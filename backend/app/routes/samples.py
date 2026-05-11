"""
Sample routes: upload & analyze, list, detail, delete, report.
"""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.schemas import SampleOut, SampleDetail
from app.services import file_service, detector, calculator, report_service
from app.utils.helpers import path_to_url
from app.config import VIDEO_FRAME_INTERVAL


router = APIRouter(prefix="/samples", tags=["Samples"])


# ── Shared helper ─────────────────────────────────────────────────────────────

def _build_sample_out(sample: models.Sample) -> dict:
    """
    Convert ORM sample to response dict with URL fields.
    This function converts stored local paths into frontend/API URLs.
    """
    d = {c.name: getattr(sample, c.name) for c in sample.__table__.columns}

    d["original_image_url"] = path_to_url(sample.original_file_path)
    d["processed_image_url"] = path_to_url(sample.processed_file_path)

    return d


# ── Analyze Image ─────────────────────────────────────────────────────────────

@router.post("/analyze-image", response_model=SampleOut, status_code=201)
async def analyze_image(
    file: UploadFile = File(..., description="Image of the water sample"),
    sample_source: str = Form(..., description='e.g. "Tap Water", "Lake Water"'),
    chamber_volume_ml: float = Form(50.0, gt=0, description="Volume of sample in mL"),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Upload a microscope/camera image and detect microplastic-like particles.

    Important:
    - The processed image path must come from detector.analyze_image().
    - This route should NOT manually create processed_ filenames.
    - If detector.py is YOLO-based, result.processed_image_path should contain yolo_processed_...
    """

    # 1. Save original uploaded image
    original_path = await file_service.save_image(file)

    # 2. YOLOv5 detection through detector.py
    try:
        result = detector.analyze_image(str(original_path))

        # Debugging logs
        print("\n========== MICROSENSE IMAGE DEBUG ==========")
        print("Original image path:", str(original_path))
        print("Detector result object:", result)
        print("Detector processed image path:", result.processed_image_path)
        print("Detector count:", result.count)
        print("Average particle area:", result.average_particle_area)
        print("Average brightness:", result.average_brightness)
        print("Laplacian variance:", result.laplacian_variance)
        print("===========================================\n")

    except ValueError as e:
        file_service.delete_file_if_exists(str(original_path))
        raise HTTPException(status_code=422, detail=str(e))

    except Exception as e:
        file_service.delete_file_if_exists(str(original_path))
        print("Unexpected detection error:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Image analysis failed: {str(e)}"
        )

    # 3. Calculate MPI and risk values
    calc = calculator.calculate_results(
        detected_particles=result.count,
        chamber_volume_ml=chamber_volume_ml,
        average_area=result.average_particle_area,
        laplacian_variance=result.laplacian_variance,
        mean_brightness=result.mean_brightness,
    )

    # 4. Save sample result to database
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

        # Very important:
        # This uses detector.py output directly.
        # If detector.py returns yolo_processed_..., API will also return yolo_processed_...
        processed_file_path=result.processed_image_path,

        file_type="image",
        frames_analyzed=None,
        average_particles_per_frame=None,

        notes=notes,
        recommendation=calc["recommendation"],
    )

    db.add(sample)
    db.flush()  # Required to get sample.id before adding particle features

    # 5. Save individual detected particle features
    for p in result.particles:
        db.add(
            models.ParticleFeature(
                sample_id=sample.id,
                x=p.x,
                y=p.y,
                width=p.width,
                height=p.height,
                area=p.area,
                brightness=p.brightness,
                size_category=p.size_category,
            )
        )

    db.commit()
    db.refresh(sample)

    response = _build_sample_out(sample)

    # Final response debug
    print("\n========== MICROSENSE RESPONSE DEBUG ==========")
    print("DB processed_file_path:", sample.processed_file_path)
    print("API processed_image_url:", response.get("processed_image_url"))
    print("==============================================\n")

    return response


# ── Analyze Video ─────────────────────────────────────────────────────────────

@router.post("/analyze-video", response_model=SampleOut, status_code=201)
async def analyze_video(
    file: UploadFile = File(..., description="Video of the water sample"),
    sample_source: str = Form(...),
    chamber_volume_ml: float = Form(50.0, gt=0),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Upload a video of the flow chamber.
    Every Nth frame is analysed for particles and results are averaged.

    TODO:
    Add centroid tracking such as SORT / DeepSORT to avoid double-counting
    particles that persist across consecutive frames.
    """

    # 1. Save video
    video_path = await file_service.save_video(file)

    # 2. Frame-by-frame detection
    try:
        vresult = detector.analyze_video(
            str(video_path),
            frame_interval=VIDEO_FRAME_INTERVAL
        )

        # Debugging logs
        print("\n========== MICROSENSE VIDEO DEBUG ==========")
        print("Video path:", str(video_path))
        print("Video result:", vresult)
        print("Preview image path:", vresult.get("preview_image_path"))
        print("===========================================\n")

    except ValueError as e:
        file_service.delete_file_if_exists(str(video_path))
        raise HTTPException(status_code=422, detail=str(e))

    except Exception as e:
        file_service.delete_file_if_exists(str(video_path))
        print("Unexpected video detection error:", str(e))
        raise HTTPException(
            status_code=500,
            detail=f"Video analysis failed: {str(e)}"
        )

    # 3. MPI calculation using average particle count across frames
    calc = calculator.calculate_results(
        detected_particles=vresult["detected_particles"],
        chamber_volume_ml=chamber_volume_ml,
        average_area=vresult["average_particle_area"],
        laplacian_variance=vresult["laplacian_variance"],
        mean_brightness=vresult["average_brightness"],
    )

    # 4. Save video sample result
    sample = models.Sample(
        sample_source=sample_source,
        chamber_volume_ml=chamber_volume_ml,

        detected_particles=vresult["detected_particles"],
        estimated_particles_per_litre=calc["estimated_particles_per_litre"],
        mpi_score=calc["mpi_score"],
        monitoring_risk_level=calc["monitoring_risk_level"],
        confidence_score=calc["confidence_score"],

        average_particle_area=vresult["average_particle_area"],
        average_brightness=vresult["average_brightness"],
        size_category=calc["size_category"],

        original_file_path=str(video_path),
        processed_file_path=vresult["preview_image_path"],

        file_type="video",
        frames_analyzed=vresult["frames_analyzed"],
        average_particles_per_frame=vresult["average_particles_per_frame"],

        notes=notes,
        recommendation=calc["recommendation"],
    )

    db.add(sample)
    db.commit()
    db.refresh(sample)

    response = _build_sample_out(sample)

    print("\n========== MICROSENSE VIDEO RESPONSE DEBUG ==========")
    print("DB processed_file_path:", sample.processed_file_path)
    print("API processed_image_url:", response.get("processed_image_url"))
    print("====================================================\n")

    return response


# ── List Samples ──────────────────────────────────────────────────────────────

@router.get("/", response_model=list[SampleOut])
def list_samples(
    risk_level: Optional[str] = None,
    source: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    Return analyzed samples sorted newest first.
    Supports optional filtering by risk level and sample source.
    """

    q = db.query(models.Sample)

    if risk_level:
        q = q.filter(models.Sample.monitoring_risk_level == risk_level)

    if source:
        q = q.filter(models.Sample.sample_source.ilike(f"%{source}%"))

    samples = q.order_by(models.Sample.created_at.desc()).limit(limit).all()

    return [_build_sample_out(s) for s in samples]


# ── Latest Sample ────────────────────────────────────────────────────────────

@router.get("/latest")
def get_latest_sample(db: Session = Depends(get_db)):
    """
    Return the latest analyzed sample.

    Permanent fix:
    If database is empty, return null instead of 404.
    This prevents repeated frontend console errors before first analysis.
    """

    sample = db.query(models.Sample).order_by(models.Sample.created_at.desc()).first()

    if not sample:
        return None

    return _build_sample_out(sample)

# ── Single Sample ─────────────────────────────────────────────────────────────

@router.get("/{sample_id}", response_model=SampleDetail)
def get_sample(sample_id: int, db: Session = Depends(get_db)):
    """
    Return full details of a single sample including per-particle features.
    """

    sample = db.query(models.Sample).filter(models.Sample.id == sample_id).first()

    if not sample:
        raise HTTPException(
            status_code=404,
            detail=f"Sample {sample_id} not found"
        )

    out = _build_sample_out(sample)

    out["particles"] = [
        {c.name: getattr(p, c.name) for c in p.__table__.columns}
        for p in sample.particles
    ]

    return out


# ── Delete Sample ─────────────────────────────────────────────────────────────

@router.delete("/{sample_id}", status_code=200)
def delete_sample(sample_id: int, db: Session = Depends(get_db)):
    """
    Delete a sample record and its associated files.
    """

    sample = db.query(models.Sample).filter(models.Sample.id == sample_id).first()

    if not sample:
        raise HTTPException(
            status_code=404,
            detail=f"Sample {sample_id} not found"
        )

    # Delete associated files if they exist
    file_service.delete_file_if_exists(sample.original_file_path)
    file_service.delete_file_if_exists(sample.processed_file_path)

    db.delete(sample)
    db.commit()

    return {"detail": f"Sample {sample_id} deleted successfully"}


# ── Report ────────────────────────────────────────────────────────────────────

@router.get("/{sample_id}/report")
def get_report(
    sample_id: int,
    format: str = "json",
    db: Session = Depends(get_db),
):
    """
    Generate a report for a sample.

    Query:
    - ?format=json returns structured JSON
    - ?format=text saves a .txt file and returns it as a download
    """

    sample = db.query(models.Sample).filter(models.Sample.id == sample_id).first()

    if not sample:
        raise HTTPException(
            status_code=404,
            detail=f"Sample {sample_id} not found"
        )

    format = format.lower().strip()

    if format not in {"json", "text"}:
        raise HTTPException(
            status_code=400,
            detail="format must be either 'json' or 'text'"
        )

    if format == "text":
        path = report_service.generate_text_report(sample)

        return FileResponse(
            path=str(path),
            media_type="text/plain",
            filename=path.name,
        )

    return JSONResponse(content=report_service.generate_json_report(sample))