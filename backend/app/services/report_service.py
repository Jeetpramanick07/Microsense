"""
Report generator for MicroSense AI-Cam.
Produces a plain-text / JSON report for a single sample.
"""

import json
from datetime import datetime
from pathlib import Path
from app.config import REPORTS_DIR

DISCLAIMER = (
    "DISCLAIMER: This prototype provides field-level monitoring estimation only "
    "and is NOT a lab-certified microplastic identification method. "
    "WHO has not defined official numeric safe limits for microplastics in drinking water. "
    "Results should be treated as indicative only and must not be used for clinical, "
    "regulatory, or public health decision-making without independent laboratory validation."
)


def generate_text_report(sample) -> Path:
    """
    Generate a human-readable text report for a sample ORM object.
    Saves file to reports/ and returns the file path.
    """
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"report_sample{sample.id}_{ts}.txt"
    report_path = REPORTS_DIR / filename

    lines = [
        "=" * 60,
        "       MicroSense AI-Cam — Analysis Report",
        "=" * 60,
        f"Report Generated : {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC",
        f"Sample ID        : {sample.id}",
        f"Sample Source    : {sample.sample_source}",
        f"Chamber Volume   : {sample.chamber_volume_ml} mL",
        f"File Type        : {sample.file_type}",
        "",
        "── Detection Results ─────────────────────────────────",
        f"Detected Particles        : {sample.detected_particles}",
        f"Est. Particles / Litre    : {sample.estimated_particles_per_litre}",
        f"MPI Score                 : {sample.mpi_score} / 100",
        f"Monitoring Risk Level     : {sample.monitoring_risk_level}",
        f"Confidence Score          : {sample.confidence_score} / 100",
        "",
        "── Particle Statistics ───────────────────────────────",
        f"Avg. Particle Area        : {sample.average_particle_area} px² (prototype)",
        f"Avg. Brightness           : {sample.average_brightness}",
        f"Size Category             : {sample.size_category}",
    ]

    if sample.frames_analyzed:
        lines.append(f"Frames Analyzed           : {sample.frames_analyzed}")
    if getattr(sample, "average_particles_per_frame", None) is not None:
        lines.append(f"Avg. Particles / Frame    : {sample.average_particles_per_frame}")

    lines += [
        "",
        "── Recommendation ────────────────────────────────────",
        sample.recommendation,
        "",
    ]

    if sample.notes:
        lines += ["── Notes ─────────────────────────────────────────────", sample.notes, ""]

    lines += [
        "── Disclaimer ────────────────────────────────────────",
        DISCLAIMER,
        "=" * 60,
    ]

    report_path.write_text("\n".join(lines), encoding="utf-8")
    return report_path


def generate_json_report(sample) -> dict:
    """Return a structured dict report (also exposed via the API)."""
    return {
        "report_generated_at": datetime.utcnow().isoformat(),
        "sample_id": sample.id,
        "sample_source": sample.sample_source,
        "chamber_volume_ml": sample.chamber_volume_ml,
        "file_type": sample.file_type,
        "detected_particles": sample.detected_particles,
        "estimated_particles_per_litre": sample.estimated_particles_per_litre,
        "mpi_score": sample.mpi_score,
        "monitoring_risk_level": sample.monitoring_risk_level,
        "confidence_score": sample.confidence_score,
        "average_particle_area": sample.average_particle_area,
        "average_brightness": sample.average_brightness,
        "size_category": sample.size_category,
        "frames_analyzed": sample.frames_analyzed,
        "average_particles_per_frame": getattr(sample, "average_particles_per_frame", None),
        "recommendation": sample.recommendation,
        "notes": sample.notes,
        "created_at": sample.created_at.isoformat(),
        "disclaimer": DISCLAIMER,
    }
