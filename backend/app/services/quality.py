"""
Image quality validation service for MicroSense AI-Cam.

This module checks whether an uploaded sample image is suitable for
microplastic-like particle analysis before or during AI detection.

It evaluates:
1. Focus / blur
2. Brightness
3. Underexposure
4. Overexposure
5. Contrast
6. Overall image quality score

This helps prevent poor images from producing misleading AI results.
"""

from __future__ import annotations

from dataclasses import dataclass
import cv2
import numpy as np


@dataclass
class ImageQualityResult:
    focus_score: float
    brightness_score: float
    contrast_score: float
    overexposed_percent: float
    underexposed_percent: float
    image_quality_score: float
    image_quality_status: str
    quality_warning: str


def _normalize(value: float, min_value: float, max_value: float) -> float:
    """
    Normalize a value to 0–100.
    """
    if max_value == min_value:
        return 0.0

    value = max(min_value, min(value, max_value))
    return ((value - min_value) / (max_value - min_value)) * 100.0


def evaluate_image_quality(gray: np.ndarray) -> ImageQualityResult:
    """
    Evaluate grayscale image quality.

    Parameters:
        gray: Grayscale image as numpy array.

    Returns:
        ImageQualityResult
    """

    if gray is None or gray.size == 0:
        return ImageQualityResult(
            focus_score=0.0,
            brightness_score=0.0,
            contrast_score=0.0,
            overexposed_percent=0.0,
            underexposed_percent=100.0,
            image_quality_score=0.0,
            image_quality_status="Poor",
            quality_warning="Invalid or empty image.",
        )

    # Focus score using Laplacian variance
    laplacian_variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    # Normalize focus.
    # Values vary by camera, but 0–300 works well for prototype scoring.
    focus_score = _normalize(laplacian_variance, 20, 300)

    # Brightness
    mean_brightness = float(np.mean(gray))

    # Ideal brightness around 120–170.
    # Score decreases if too dark or too bright.
    brightness_distance = abs(mean_brightness - 145)
    brightness_score = max(0.0, 100.0 - (brightness_distance / 145.0) * 100.0)

    # Contrast
    contrast = float(np.std(gray))
    contrast_score = _normalize(contrast, 10, 80)

    # Underexposure and overexposure percentages
    total_pixels = gray.size

    underexposed_pixels = np.sum(gray < 30)
    overexposed_pixels = np.sum(gray > 240)

    underexposed_percent = float((underexposed_pixels / total_pixels) * 100.0)
    overexposed_percent = float((overexposed_pixels / total_pixels) * 100.0)

    # Penalty for too many bad pixels
    exposure_penalty = min(40.0, underexposed_percent + overexposed_percent)

    # Weighted final score
    image_quality_score = (
        0.40 * focus_score
        + 0.30 * brightness_score
        + 0.20 * contrast_score
        + 0.10 * max(0.0, 100.0 - exposure_penalty)
    )

    image_quality_score = round(max(0.0, min(100.0, image_quality_score)), 2)

    # Status and warning
    warnings = []

    if focus_score < 35:
        warnings.append("Image may be blurry.")

    if mean_brightness < 60:
        warnings.append("Image is too dark.")

    if mean_brightness > 220:
        warnings.append("Image is too bright.")

    if overexposed_percent > 10:
        warnings.append("High overexposure detected.")

    if underexposed_percent > 20:
        warnings.append("High underexposure detected.")

    if contrast_score < 30:
        warnings.append("Low contrast image.")

    if image_quality_score >= 75:
        status = "Good"
    elif image_quality_score >= 50:
        status = "Acceptable"
    else:
        status = "Poor"

    quality_warning = " ".join(warnings) if warnings else "Image quality is suitable for analysis."

    return ImageQualityResult(
        focus_score=round(focus_score, 2),
        brightness_score=round(brightness_score, 2),
        contrast_score=round(contrast_score, 2),
        overexposed_percent=round(overexposed_percent, 2),
        underexposed_percent=round(underexposed_percent, 2),
        image_quality_score=image_quality_score,
        image_quality_status=status,
        quality_warning=quality_warning,
    )