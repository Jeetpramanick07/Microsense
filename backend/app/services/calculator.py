"""
MPI (Microplastic Pollution Index) calculation logic.

DISCLAIMER: This is a prototype estimator only.
True particle concentration and size require calibrated lab equipment.
WHO has not defined official numeric safe limits for microplastics in drinking water.
Risk levels here are labelled "Monitoring Risk Level", NOT health risk levels.
"""

from typing import List, Dict
import numpy as np


# ── Risk level thresholds (particles/litre) ───────────────────────────────────

RISK_THRESHOLDS = [
    (10,   "Very Low"),
    (50,   "Low"),
    (200,  "Moderate"),
    (1000, "High"),
]


def get_risk_level(particles_per_litre: float) -> str:
    for threshold, label in RISK_THRESHOLDS:
        if particles_per_litre <= threshold:
            return label
    return "Very High"


# ── Concentration score (0–100) ───────────────────────────────────────────────

def get_concentration_score(particles_per_litre: float) -> float:
    if particles_per_litre <= 10:
        return 10.0
    elif particles_per_litre <= 50:
        return 25.0
    elif particles_per_litre <= 200:
        return 50.0
    elif particles_per_litre <= 1000:
        return 75.0
    return 100.0


# ── Size score (0–100) ────────────────────────────────────────────────────────
# NOTE: Contour area (pixels²) is used as a PROTOTYPE approximation.
# Accurate micron-level size calibration requires a microscope with a stage
# micrometer or known scale bar. This mapping is NOT scientifically calibrated.

def get_size_score(average_area: float) -> float:
    """
    Map average particle contour area (px²) to a size score.
    Larger particles → lower score (fewer but bigger fragments).
    Smaller particles → higher score (finer = harder to filter).
    """
    if average_area > 2000:
        return 20.0   # very large visible fragments
    elif average_area > 500:
        return 40.0   # large particles
    elif average_area > 100:
        return 70.0   # medium particles
    return 100.0      # small particles


def get_size_category(average_area: float) -> str:
    """Human-readable prototype size category label."""
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
) -> float:
    """
    Simple heuristic confidence score (0–100) based on:
    - Image sharpness (Laplacian variance) – blurry images give less reliable counts
    - Brightness – severely under/over-exposed images are less reliable
    - Particle count sanity – very high counts may indicate noise
    """
    score = 100.0

    # Sharpness penalty: very blurry images (variance < 50) are less reliable
    if laplacian_variance < 20:
        score -= 30
    elif laplacian_variance < 50:
        score -= 15

    # Brightness penalty
    if mean_brightness < 40:
        score -= 20  # too dark
    elif mean_brightness > 230:
        score -= 20  # overexposed

    # Particle count sanity
    if particle_count == 0:
        score -= 30  # no particles could mean bad image or genuinely clean
    elif particle_count > 500:
        score -= 20  # suspiciously high; possible noise

    return float(max(0.0, min(100.0, score)))


# ── MPI formula ───────────────────────────────────────────────────────────────

def compute_mpi(
    concentration_score: float,
    size_score: float,
    confidence_score: float,
) -> float:
    """MPI = 0.60 × C_score + 0.25 × S_score + 0.15 × Conf_score (clamped 0–100)."""
    mpi = 0.60 * concentration_score + 0.25 * size_score + 0.15 * confidence_score
    return round(float(max(0.0, min(100.0, mpi))), 2)


# ── Recommendation text ───────────────────────────────────────────────────────

RECOMMENDATIONS = {
    "Very Low":  "Normal monitoring. No immediate action required.",
    "Low":       "Occasional retest recommended to track trends.",
    "Moderate":  "Retest and check possible contamination sources.",
    "High":      "Filtering/source investigation recommended; validate if this is drinking water.",
    "Very High": "Immediate retest and lab validation strongly recommended.",
}


def get_recommendation(risk_level: str) -> str:
    return RECOMMENDATIONS.get(risk_level, "No recommendation available.")


# ── Main calculation entry point ──────────────────────────────────────────────

def calculate_results(
    detected_particles: int,
    chamber_volume_ml: float,
    average_area: float,
    laplacian_variance: float,
    mean_brightness: float,
) -> Dict:
    """
    Given raw detection stats, return a fully computed result dict
    ready to be stored and returned via the API.
    """
    particles_per_litre = detected_particles * (1000.0 / chamber_volume_ml)

    risk_level = get_risk_level(particles_per_litre)
    concentration_score = get_concentration_score(particles_per_litre)
    size_score = get_size_score(average_area)
    confidence = compute_confidence(laplacian_variance, mean_brightness, detected_particles)
    mpi = compute_mpi(concentration_score, size_score, confidence)

    return {
        "estimated_particles_per_litre": round(particles_per_litre, 2),
        "monitoring_risk_level": risk_level,
        "concentration_score": concentration_score,
        "size_score": size_score,
        "confidence_score": round(confidence, 1),
        "mpi_score": mpi,
        "size_category": get_size_category(average_area),
        "recommendation": get_recommendation(risk_level),
    }
