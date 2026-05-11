"""
MSMI / MPI calculation logic for MicroSense AI-Cam.

DISCLAIMER:
This is a prototype monitoring estimator only.
True particle concentration, polymer type, and accurate micron-level sizing
require calibrated lab equipment such as FTIR, Raman spectroscopy,
fluorescence microscopy, or validated laboratory methods.

WHO has not defined official numeric safe limits for microplastics in drinking water.
Risk levels here are labelled "Monitoring Risk Level", NOT health risk levels.
"""

from typing import Dict

from app.services.risk_scoring import calculate_msmi_score


# ── Legacy risk level thresholds based only on particles/litre ────────────────
# Kept for reference and compatibility.
# Final monitoring risk will now come from MSMI.

RISK_THRESHOLDS = [
    (10, "Very Low"),
    (50, "Low"),
    (200, "Moderate"),
    (1000, "High"),
]


def get_risk_level(particles_per_litre: float) -> str:
    """
    Legacy concentration-only risk level.
    Kept for comparison.
    """
    for threshold, label in RISK_THRESHOLDS:
        if particles_per_litre <= threshold:
            return label

    return "Very High"


# ── Concentration score ───────────────────────────────────────────────────────

def get_concentration_score(particles_per_litre: float) -> float:
    """
    Convert estimated particles/litre into a 0–100 concentration score.
    Prototype thresholds only.
    """

    if particles_per_litre <= 10:
        return 10.0
    elif particles_per_litre <= 50:
        return 25.0
    elif particles_per_litre <= 200:
        return 50.0
    elif particles_per_litre <= 1000:
        return 75.0

    return 100.0


# ── Size score ────────────────────────────────────────────────────────────────
# NOTE:
# Average particle area is currently based on bounding-box area in pixels².
# Accurate micron-level size estimation requires camera calibration.

def get_size_score(average_area: float) -> float:
    """
    Map average particle bounding-box area to a prototype size score.

    Smaller particles are harder to filter and may be more concerning,
    so smaller detected particles receive a higher size score.
    """

    if average_area > 2000:
        return 20.0
    elif average_area > 500:
        return 40.0
    elif average_area > 100:
        return 70.0

    return 100.0


def get_size_category(average_area: float) -> str:
    """
    Human-readable prototype size category label.
    """

    if average_area > 2000:
        return ">500 µm estimated (prototype)"
    elif average_area > 500:
        return "100–500 µm estimated (prototype)"
    elif average_area > 100:
        return "50–100 µm estimated (prototype)"

    return "<50 µm estimated (prototype)"


# ── Confidence score ──────────────────────────────────────────────────────────

def compute_confidence(
    laplacian_variance: float,
    mean_brightness: float,
    particle_count: int,
    image_quality_score: float | None = None,
) -> float:
    """
    Heuristic confidence score from 0–100.

    Uses:
    - Sharpness / focus
    - Brightness
    - Particle count sanity
    - Optional image quality score from quality.py
    """

    score = 100.0

    # Sharpness penalty
    if laplacian_variance < 20:
        score -= 30
    elif laplacian_variance < 50:
        score -= 15

    # Brightness penalty
    if mean_brightness < 40:
        score -= 20
    elif mean_brightness > 230:
        score -= 20

    # Particle count sanity
    if particle_count == 0:
        score -= 25
    elif particle_count > 500:
        score -= 20

    # Image quality score influence
    if image_quality_score is not None:
        if image_quality_score < 40:
            score -= 25
        elif image_quality_score < 60:
            score -= 10

    return round(float(max(0.0, min(100.0, score))), 1)


# ── Legacy MPI formula ────────────────────────────────────────────────────────

def compute_mpi(
    concentration_score: float,
    size_score: float,
    confidence_score: float,
) -> float:
    """
    Legacy MPI formula.

    Kept for compatibility, but final mpi_score will now be aligned
    with MSMI from risk_scoring.py.
    """

    mpi = (
        0.60 * concentration_score
        + 0.25 * size_score
        + 0.15 * confidence_score
    )

    return round(float(max(0.0, min(100.0, mpi))), 2)


# ── Recommendation text ───────────────────────────────────────────────────────

RECOMMENDATIONS = {
    "Low": (
        "Low monitoring concern. Continue normal monitoring and retest periodically."
    ),
    "Moderate": (
        "Moderate monitoring concern. Retest the sample and check possible contamination sources."
    ),
    "High": (
        "High monitoring concern. Source investigation and filtration review are recommended. "
        "Use lab validation if the sample is intended for drinking or sensitive use."
    ),
    "Critical": (
        "Critical monitoring concern. Immediate retest and laboratory validation are strongly recommended."
    ),
    "Very Low": (
        "Very low concentration detected. Continue routine observation."
    ),
    "Very High": (
        "Very high concentration detected. Immediate retest and lab validation strongly recommended."
    ),
}


def get_recommendation(risk_level: str) -> str:
    return RECOMMENDATIONS.get(
        risk_level,
        "No recommendation available. Retest and validate if required.",
    )


# ── Main calculation entry point ──────────────────────────────────────────────

def calculate_results(
    detected_particles: int,
    chamber_volume_ml: float,
    average_area: float,
    laplacian_variance: float,
    mean_brightness: float,
    sample_source: str | None = None,
    image_quality_score: float | None = None,
) -> Dict:
    """
    Given raw detection stats, return a fully computed result dictionary
    ready to be stored and returned through the API.

    New additions:
    - MSMI score
    - Source-based risk weighting
    - Image-quality-aware confidence adjustment
    - Risk explanation

    This function is backward-compatible.
    Existing calls without sample_source and image_quality_score will still work.
    """

    if chamber_volume_ml <= 0:
        chamber_volume_ml = 50.0

    particles_per_litre = detected_particles * (1000.0 / chamber_volume_ml)

    concentration_score = get_concentration_score(particles_per_litre)
    size_score = get_size_score(average_area)

    confidence = compute_confidence(
        laplacian_variance=laplacian_variance,
        mean_brightness=mean_brightness,
        particle_count=detected_particles,
        image_quality_score=image_quality_score,
    )

    # Legacy concentration-only label, useful for comparison/debugging
    concentration_only_risk = get_risk_level(particles_per_litre)

    # New MSMI calculation
    risk = calculate_msmi_score(
        detected_particles=detected_particles,
        estimated_particles_per_litre=particles_per_litre,
        average_particle_area=average_area,
        sample_source=sample_source,
        confidence_score=confidence,
        image_quality_score=image_quality_score,
    )

    return {
        "estimated_particles_per_litre": round(particles_per_litre, 2),

        # Main final risk fields
        "msmi_score": risk.msmi_score,
        "mpi_score": risk.mpi_score,
        "monitoring_risk_level": risk.monitoring_risk_level,

        # Extra novelty/scoring fields
        "source_risk_factor": risk.source_risk_factor,
        "risk_explanation": risk.risk_explanation,
        "concentration_only_risk_level": concentration_only_risk,

        # Component scores
        "concentration_score": concentration_score,
        "size_score": size_score,
        "confidence_score": confidence,

        # Particle size category
        "size_category": get_size_category(average_area),

        # Recommendation
        "recommendation": get_recommendation(risk.monitoring_risk_level),
    }