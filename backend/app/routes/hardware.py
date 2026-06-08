from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.services import detector_yolo26, calculator
from app.utils.helpers import path_to_url

router = APIRouter(
    prefix="/api/hardware",
    tags=["Hardware"]
)

# In-memory hardware state
hardware_state = {
    "status": "connected",
    "command": "IDLE",
    "scan_requested": False,
    "last_request_time": None,
    "last_scan_result": None,
}


def _build_sample_out(sample: models.Sample) -> dict:
    """
    Convert ORM sample to response dict with URL fields.
    Same style as samples.py.
    """

    d = {c.name: getattr(sample, c.name) for c in sample.__table__.columns}

    d["original_image_url"] = path_to_url(sample.original_file_path)
    d["processed_image_url"] = path_to_url(sample.processed_file_path)

    return d


@router.get("/status")
def hardware_status():
    return {
        "project": "MicroSense AI-Cam",
        "hardware": "ESP32",
        "status": hardware_state["status"],
        "command": hardware_state["command"],
        "scan_requested": hardware_state["scan_requested"],
        "message": "Hardware API is working",
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/request-scan")
def request_hardware_scan():
    """
    Called by frontend dashboard/analyze page.

    This does not directly scan.
    It sends START_SCAN command for ESP32 to pick up.
    """

    hardware_state["command"] = "START_SCAN"
    hardware_state["scan_requested"] = True
    hardware_state["last_request_time"] = datetime.now().isoformat()

    return {
        "project": "MicroSense AI-Cam",
        "status": "command_sent",
        "command": "START_SCAN",
        "message": "Scan command sent to ESP32. Waiting for hardware scan.",
        "timestamp": hardware_state["last_request_time"],
    }


@router.get("/command")
def get_hardware_command():
    """
    ESP32 polls this endpoint every second.

    If command is START_SCAN, ESP32 starts hardware scan.
    """

    return {
        "command": hardware_state["command"],
        "scan_requested": hardware_state["scan_requested"],
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/command/clear")
def clear_hardware_command():
    """
    ESP32 calls this after receiving START_SCAN.

    This prevents repeated scan from the same command.
    """

    hardware_state["command"] = "IDLE"
    hardware_state["scan_requested"] = False

    return {
        "status": "cleared",
        "command": "IDLE",
        "message": "Hardware command cleared",
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/latest-result")
def get_latest_hardware_result():
    """
    Frontend polls this after requesting scan.
    """

    if hardware_state["last_scan_result"] is None:
        return {
            "scan_status": "waiting",
            "message": "No hardware scan result available yet",
            "timestamp": datetime.now().isoformat(),
        }

    return hardware_state["last_scan_result"]


@router.post("/scan")
def hardware_scan(db: Session = Depends(get_db)):
    """
    Called by ESP32 after receiving START_SCAN command.

    Flow:
    1. ESP32 turns ON illumination and buzzer.
    2. ESP32 calls this endpoint.
    3. Backend captures USB microscope image.
    4. YOLO26n + hybrid validation analyzes image.
    5. Result is saved to database.
    6. History page updates because /api/samples/ reads database records.
    """

    try:
        # Imported inside function so /status and /docs load faster
        from app.services.camera_service import capture_frame

        sample_source = "Hardware USB Microscope"
        chamber_volume_ml = 50.0
        notes = "Captured using ESP32-triggered hardware scan with USB microscope and YOLO26n"

        captured_image_path = capture_frame(camera_index=0, warmup_frames=20)

        result = detector_yolo26.analyze_image_yolo26(str(captured_image_path))

        calc = calculator.calculate_results(
            detected_particles=result.count,
            chamber_volume_ml=chamber_volume_ml,
            average_area=result.average_particle_area,
            laplacian_variance=result.laplacian_variance,
            mean_brightness=result.mean_brightness,
            sample_source=sample_source,
            image_quality_score=getattr(result, "image_quality_score", None),
        )

        sample = models.Sample(
            sample_source=sample_source,
            chamber_volume_ml=chamber_volume_ml,

            detected_particles=result.count,
            estimated_particles_per_litre=calc["estimated_particles_per_litre"],

            mpi_score=calc["mpi_score"],
            msmi_score=calc.get("msmi_score"),
            monitoring_risk_level=calc["monitoring_risk_level"],
            concentration_only_risk_level=calc.get("concentration_only_risk_level"),

            concentration_score=calc.get("concentration_score"),
            size_score=calc.get("size_score"),
            confidence_score=calc["confidence_score"],

            source_risk_factor=calc.get("source_risk_factor"),
            risk_explanation=calc.get("risk_explanation"),

            average_particle_area=result.average_particle_area,
            average_brightness=result.average_brightness,
            size_category=calc["size_category"],

            focus_score=getattr(result, "focus_score", None),
            brightness_score=getattr(result, "brightness_score", None),
            contrast_score=getattr(result, "contrast_score", None),
            overexposed_percent=getattr(result, "overexposed_percent", None),
            underexposed_percent=getattr(result, "underexposed_percent", None),
            image_quality_score=getattr(result, "image_quality_score", None),
            image_quality_status=getattr(result, "image_quality_status", None),
            quality_warning=getattr(result, "quality_warning", None),

            raw_detection_count=getattr(result, "raw_detection_count", None),
            accepted_detection_count=getattr(result, "accepted_detection_count", None),
            rejected_detection_count=getattr(result, "rejected_detection_count", None),
            hybrid_filter_score=getattr(result, "hybrid_filter_score", None),
            filter_summary=getattr(result, "filter_summary", None),

            original_file_path=str(captured_image_path),
            processed_file_path=result.processed_image_path,

            file_type="image",
            frames_analyzed=None,
            average_particles_per_frame=None,

            notes=notes,
            recommendation=calc["recommendation"],
        )

        db.add(sample)
        db.flush()

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

        sample_response = _build_sample_out(sample)

        scan_result = {
            "project": "MicroSense AI-Cam",
            "scan_status": "completed",

            "sample_id": sample.id,
            "id": sample.id,

            "captured_image_path": str(captured_image_path),
            "processed_image_path": result.processed_image_path,

            "original_image_url": sample_response.get("original_image_url"),
            "processed_image_url": sample_response.get("processed_image_url"),

            "detected_particles": sample.detected_particles,
            "accepted_particles": sample.accepted_detection_count,
            "rejected_particles": sample.rejected_detection_count,

            "raw_detection_count": sample.raw_detection_count,
            "accepted_detection_count": sample.accepted_detection_count,
            "rejected_detection_count": sample.rejected_detection_count,

            "risk_level": sample.monitoring_risk_level,
            "monitoring_risk_level": sample.monitoring_risk_level,

            "msmi_score": sample.msmi_score,
            "mpi_score": sample.mpi_score,

            "estimated_particles_per_litre": sample.estimated_particles_per_litre,
            "hybrid_score": sample.hybrid_filter_score,
            "hybrid_filter_score": sample.hybrid_filter_score,

            "image_quality_score": sample.image_quality_score,
            "image_quality_status": sample.image_quality_status,

            "message": "Hardware scan completed, saved to database, and added to history.",
            "timestamp": datetime.now().isoformat(),
        }

        hardware_state["last_scan_result"] = scan_result
        hardware_state["command"] = "IDLE"
        hardware_state["scan_requested"] = False

        print("\n========== HARDWARE SCAN SAVED ==========")
        print("Sample ID:", sample.id)
        print("Original image:", sample.original_file_path)
        print("Processed image:", sample.processed_file_path)
        print("Detected particles:", sample.detected_particles)
        print("Accepted particles:", sample.accepted_detection_count)
        print("Risk:", sample.monitoring_risk_level)
        print("History should now update.")
        print("=========================================\n")

        return scan_result

    except Exception as e:
        db.rollback()

        error_result = {
            "project": "MicroSense AI-Cam",
            "scan_status": "failed",
            "message": f"Hardware scan failed: {str(e)}",
            "timestamp": datetime.now().isoformat(),
        }

        hardware_state["last_scan_result"] = error_result
        hardware_state["command"] = "IDLE"
        hardware_state["scan_requested"] = False

        raise HTTPException(
            status_code=500,
            detail=f"Hardware scan failed: {str(e)}",
        )