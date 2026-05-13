"""
Hybrid AI + Image Processing Filter for MicroSense AI-Cam.

This module validates particle detections using classical image-processing
features after YOLO/OpenCV detection.

Purpose:
- Reduce false positives
- Improve reliability
- Provide explainable validation metrics
- Strengthen research/patent novelty

This does NOT chemically confirm microplastics.
It only validates whether a detected object is visually particle-like.
"""

from __future__ import annotations

from dataclasses import dataclass
import cv2
import numpy as np


@dataclass
class HybridValidationResult:
    is_valid: bool
    validation_score: float
    rejection_reason: str
    contrast_score: float
    aspect_ratio: float
    edge_score: float
    compactness_score: float


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _safe_crop(gray: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    img_h, img_w = gray.shape[:2]

    x1 = max(0, min(x, img_w - 1))
    y1 = max(0, min(y, img_h - 1))
    x2 = max(0, min(x + w, img_w))
    y2 = max(0, min(y + h, img_h))

    if x2 <= x1 or y2 <= y1:
        return np.array([])

    return gray[y1:y2, x1:x2]


def _contrast_score(gray: np.ndarray, x: int, y: int, w: int, h: int) -> float:
    """
    Compares particle ROI brightness with nearby surrounding region.
    Higher contrast means detection is more visually reliable.
    """

    roi = _safe_crop(gray, x, y, w, h)

    if roi.size == 0:
        return 0.0

    pad = max(5, int(max(w, h) * 0.4))

    surrounding = _safe_crop(
        gray,
        x - pad,
        y - pad,
        w + 2 * pad,
        h + 2 * pad,
    )

    if surrounding.size == 0:
        return 0.0

    roi_mean = float(np.mean(roi))
    surrounding_mean = float(np.mean(surrounding))

    diff = abs(roi_mean - surrounding_mean)

    # Difference of 40+ is considered strong contrast for prototype images.
    return round(_clamp((diff / 40.0) * 100.0), 2)


def _edge_score(roi: np.ndarray) -> float:
    """
    Uses Canny edges to estimate whether the particle has visible boundaries.
    """

    if roi.size == 0:
        return 0.0

    edges = cv2.Canny(roi, 50, 150)
    edge_density = float(np.count_nonzero(edges)) / float(roi.size)

    # 0.12 edge density or above is treated as strong.
    return round(_clamp((edge_density / 0.12) * 100.0), 2)


def _compactness_score(w: int, h: int) -> float:
    """
    Penalizes extremely stretched objects.

    Many microplastic-like visible fragments may be irregular,
    but extremely thin lines are often scratches/noise/fibers.
    """

    if w <= 0 or h <= 0:
        return 0.0

    aspect = max(w / h, h / w)

    if aspect <= 2:
        return 100.0
    elif aspect <= 4:
        return 75.0
    elif aspect <= 6:
        return 50.0
    elif aspect <= 8:
        return 25.0

    return 10.0


def validate_particle(
    gray: np.ndarray,
    x: int,
    y: int,
    width: int,
    height: int,
    area: float,
) -> HybridValidationResult:
    """
    Validate one detected particle using hybrid image-processing rules.
    """

    if width <= 1 or height <= 1:
        return HybridValidationResult(
            is_valid=False,
            validation_score=0.0,
            rejection_reason="Invalid bounding-box size.",
            contrast_score=0.0,
            aspect_ratio=0.0,
            edge_score=0.0,
            compactness_score=0.0,
        )

    aspect_ratio = round(max(width / height, height / width), 2)

    roi = _safe_crop(gray, x, y, width, height)

    contrast = _contrast_score(gray, x, y, width, height)
    edge = _edge_score(roi)
    compactness = _compactness_score(width, height)

    # Area score
    if area < 15:
        area_score = 0.0
    elif area <= 100:
        area_score = 60.0
    elif area <= 3000:
        area_score = 100.0
    elif area <= 8000:
        area_score = 70.0
    else:
        area_score = 20.0

    validation_score = (
        0.30 * contrast
        + 0.25 * edge
        + 0.25 * compactness
        + 0.20 * area_score
    )

    validation_score = round(_clamp(validation_score), 2)

    reasons = []

    if contrast < 20:
        reasons.append("weak contrast")

    if edge < 15:
        reasons.append("weak edge boundary")

    if compactness < 25:
        reasons.append("extreme aspect ratio")

    if area_score < 30:
        reasons.append("invalid area range")

    is_valid = validation_score >= 45 and len(reasons) <= 2

    rejection_reason = "Accepted" if is_valid else ", ".join(reasons)

    return HybridValidationResult(
        is_valid=is_valid,
        validation_score=validation_score,
        rejection_reason=rejection_reason,
        contrast_score=contrast,
        aspect_ratio=aspect_ratio,
        edge_score=edge,
        compactness_score=compactness,
    )