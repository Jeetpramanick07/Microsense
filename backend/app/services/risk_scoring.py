"""
MicroSense Monitoring Index calculation.

This module generates a custom MicroSense Monitoring Index, MSMI.

The score is not an official health safety score.
It is a prototype monitoring score for early-stage screening.

MSMI uses:
1. Estimated particles per litre
2. Detected particle count
3. Average particle area
4. Image quality score
5. Source-based risk factor
6. Detection confidence
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class RiskScoreResult:
    msmi_score: int
    mpi_score: int
    monitoring_risk_level: str
    source_risk_factor: float
    risk_explanation: str


SOURCE_RISK_FACTORS = {
    "filtered water": 0.75,
    "filter water": 0.75,
    "purified water": 0.75,
    "ro water": 0.75,

    "tap water": 1.00,
    "drinking water": 1.00,
    "bottled water": 1.00,

    "canteen water": 1.10,
    "hostel water": 1.10,
    "tank water": 1.15,

    "pond water": 1.25,
    "lake water": 1.25,
    "river water": 1.30,

    "drain water": 1.50,
    "wastewater": 1.60,
    "industrial water": 1.70,
}


def get_source_risk_factor(sample_source: str | None) -> float:
    """
    Return source-based risk factor.

    Unknown source gets neutral factor 1.0.
    """

    if not sample_source:
        return 1.0

    source = sample_source.strip().lower()

    for key, factor in SOURCE_RISK_FACTORS.items():
        if key in source:
            return factor

    return 1.0


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _concentration_score(estimated_particles_per_litre: float) -> float:
    """
    Convert estimated particles/L into 0–100 score.

    Prototype thresholds.
    You can tune these after collecting real sample data.
    """

    if estimated_particles_per_litre <= 0:
        return 0.0

    if estimated_particles_per_litre <= 100:
        return 20.0

    if estimated_particles_per_litre <= 300:
        return 40.0

    if estimated_particles_per_litre <= 700:
        return 60.0

    if estimated_particles_per_litre <= 1200:
        return 80.0

    return 100.0


def _particle_count_score(detected_particles: int) -> float:
    """
    Convert particle count into 0–100 score.
    """

    if detected_particles <= 0:
        return 0.0

    if detected_particles <= 5:
        return 20.0

    if detected_particles <= 15:
        return 40.0

    if detected_particles <= 35:
        return 60.0

    if detected_particles <= 60:
        return 80.0

    return 100.0


def _particle_area_score(average_particle_area: float) -> float:
    """
    Convert average bounding-box area into 0–100 score.

    Larger particle-like detections can indicate more visible contamination.
    This is prototype-only and not a chemical confirmation.
    """

    if average_particle_area <= 0:
        return 0.0

    if average_particle_area <= 100:
        return 20.0

    if average_particle_area <= 500:
        return 40.0

    if average_particle_area <= 1500:
        return 60.0

    if average_particle_area <= 3000:
        return 80.0

    return 100.0


def _confidence_factor(confidence_score: float | None) -> float:
    """
    Convert confidence score into multiplier.

    Low confidence reduces final score reliability.
    """

    if confidence_score is None:
        return 0.90

    confidence_score = _clamp(confidence_score)

    if confidence_score >= 80:
        return 1.00

    if confidence_score >= 60:
        return 0.90

    if confidence_score >= 40:
        return 0.80

    return 0.70


def _quality_factor(image_quality_score: float | None) -> float:
    """
    Poor image quality should reduce final trust in the result.
    """

    if image_quality_score is None:
        return 0.90

    image_quality_score = _clamp(image_quality_score)

    if image_quality_score >= 75:
        return 1.00

    if image_quality_score >= 50:
        return 0.90

    return 0.75


def _risk_level(score: int) -> str:
    if score <= 25:
        return "Low"
    if score <= 50:
        return "Moderate"
    if score <= 75:
        return "High"
    return "Critical"


def calculate_msmi_score(
    detected_particles: int,
    estimated_particles_per_litre: float,
    average_particle_area: float,
    sample_source: str | None,
    confidence_score: float | None = None,
    image_quality_score: float | None = None,
) -> RiskScoreResult:
    """
    Calculate MicroSense Monitoring Index.

    Formula:
        raw_score =
            0.45 × concentration score
          + 0.25 × particle count score
          + 0.15 × particle area score
          + 0.15 × source weighted adjustment

    Then adjusted by:
        confidence factor
        image quality factor

    Final score: 0–100
    """

    concentration = _concentration_score(estimated_particles_per_litre)
    count = _particle_count_score(detected_particles)
    area = _particle_area_score(average_particle_area)

    source_factor = get_source_risk_factor(sample_source)

    base_score = (
        0.45 * concentration
        + 0.25 * count
        + 0.15 * area
    )

    # Source risk increases/decreases the base score.
    source_adjusted_score = base_score * source_factor

    confidence_adj = _confidence_factor(confidence_score)
    quality_adj = _quality_factor(image_quality_score)

    final_score = source_adjusted_score * confidence_adj * quality_adj
    final_score = int(round(_clamp(final_score)))

    level = _risk_level(final_score)

    explanation = (
        f"MSMI is calculated using estimated particle concentration, detected count, "
        f"average particle area, sample source risk factor ({source_factor}), "
        f"confidence adjustment, and image quality adjustment. "
        f"This is a prototype monitoring score, not a certified health safety index."
    )

    return RiskScoreResult(
        msmi_score=final_score,
        mpi_score=final_score,
        monitoring_risk_level=level,
        source_risk_factor=source_factor,
        risk_explanation=explanation,
    )