"""
YOLO26n-based particle candidate detection for MicroSense AI-Cam.

Important:
- This is an experimental YOLO26n detector.
- It does not replace the existing YOLOv5 detector.py.
- It detects microplastic-like particle candidates only.
- It does not confirm polymer composition or regulatory-grade microplastic quantity.

Flow:
1. Read image.
2. Resize image.
3. Evaluate image quality.
4. Run YOLO26n detection.
5. Apply Hybrid AI + Image Processing Filter.
6. Save processed image.
7. Return DetectionResult compatible with samples.py.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import List
import time

import cv2
import numpy as np
from ultralytics import YOLO

from app.config import (
    RESIZE_WIDTH,
    RESIZE_HEIGHT,
    IMAGE_UPLOAD_DIR,
)
from app.utils.helpers import generate_unique_filename
from app.services.quality import evaluate_image_quality
from app.services.hybrid_filter import validate_particle


# ── Paths ─────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH = BASE_DIR / "model" / "yolo26_best.pt"


# ── Data structures ───────────────────────────────────────────────────────────

@dataclass
class Particle:
    x: int
    y: int
    width: int
    height: int
    area: float
    brightness: float
    size_category: str


@dataclass
class DetectionResult:
    particles: List[Particle] = field(default_factory=list)
    processed_image_path: str = ""

    # Basic image statistics
    laplacian_variance: float = 0.0
    mean_brightness: float = 0.0
    average_particle_area: float = 0.0
    average_brightness: float = 0.0

    # Image quality fields
    focus_score: float = 0.0
    brightness_score: float = 0.0
    contrast_score: float = 0.0
    overexposed_percent: float = 0.0
    underexposed_percent: float = 0.0
    image_quality_score: float = 0.0
    image_quality_status: str = "Unknown"
    quality_warning: str = ""

    # Hybrid filter fields
    raw_detection_count: int = 0
    accepted_detection_count: int = 0
    rejected_detection_count: int = 0
    hybrid_filter_score: float = 0.0
    filter_summary: str = ""

    # YOLO26 metadata
    model_name: str = "YOLO26n"
    confidence_threshold: float = 0.70
    iou_threshold: float = 0.40
    processing_time_seconds: float = 0.0

    @property
    def count(self) -> int:
        """
        Final trusted particle count.

        This returns the number of accepted particles after hybrid validation.
        """
        return len(self.particles)


# ── Model loading ─────────────────────────────────────────────────────────────

_model = None


def get_yolo26_model():
    """
    Load YOLO26n model only once.
    """
    global _model

    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"YOLO26n model not found at: {MODEL_PATH}")

        print("Loading YOLO26n model from:", MODEL_PATH)

        _model = YOLO(str(MODEL_PATH))

        print("YOLO26n model loaded successfully.")

    return _model


# ── Helper functions ──────────────────────────────────────────────────────────

def _size_label(area: float) -> str:
    if area > 2000:
        return ">500 µm est."
    elif area > 500:
        return "100–500 µm est."
    elif area > 100:
        return "50–100 µm est."

    return "<50 µm est."


def _laplacian_variance(gray: np.ndarray) -> float:
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _safe_crop(gray: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> np.ndarray:
    h, w = gray.shape[:2]

    x1 = max(0, min(x1, w - 1))
    x2 = max(0, min(x2, w))
    y1 = max(0, min(y1, h - 1))
    y2 = max(0, min(y2, h))

    if x2 <= x1 or y2 <= y1:
        return np.array([])

    return gray[y1:y2, x1:x2]


def _mean_or_zero(values: list[float]) -> float:
    return float(np.mean(values)) if values else 0.0


def _build_filter_summary(
    raw_count: int,
    accepted_count: int,
    rejected_count: int,
    rejection_reasons: list[str],
) -> str:
    """
    Build human-readable explanation for hybrid filter output.
    """

    if raw_count == 0:
        return "No particle candidates were detected."

    if rejected_count == 0:
        return (
            f"All {accepted_count} detected particle candidates passed "
            f"the hybrid validation filter."
        )

    reason_counts: dict[str, int] = {}

    for reason in rejection_reasons:
        if not reason:
            continue

        parts = [r.strip() for r in reason.split(",") if r.strip()]

        for part in parts:
            reason_counts[part] = reason_counts.get(part, 0) + 1

    if reason_counts:
        top_reasons = sorted(
            reason_counts.items(),
            key=lambda item: item[1],
            reverse=True,
        )

        reason_text = ", ".join(
            [f"{reason} ({count})" for reason, count in top_reasons[:3]]
        )

        return (
            f"{rejected_count} of {raw_count} particle candidates were rejected. "
            f"Main rejection reasons: {reason_text}."
        )

    return (
        f"{rejected_count} of {raw_count} particle candidates were rejected "
        f"by the hybrid validation filter."
    )


# ── Public API: YOLO26 Image Analysis ─────────────────────────────────────────

def analyze_image_yolo26(
    image_path: str,
    conf_threshold: float = 0.70,
    iou_threshold: float = 0.40,
) -> DetectionResult:
    """
    Analyze uploaded image using YOLO26n + hybrid validation.

    This function is intentionally separate from analyze_image() in detector.py.
    Do not replace YOLOv5 yet.
    """

    print("USING DETECTOR: YOLO26n + HYBRID FILTER")

    start_time = time.time()

    img = cv2.imread(str(image_path))

    if img is None:
        raise ValueError(f"OpenCV could not read image: {image_path}")

    img_resized = cv2.resize(img, (RESIZE_WIDTH, RESIZE_HEIGHT))
    gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)

    lap_var = _laplacian_variance(gray)
    mean_brightness = float(np.mean(gray))
    quality = evaluate_image_quality(gray)

    model = get_yolo26_model()

    results = model.predict(
        source=img_resized,
        conf=conf_threshold,
        iou=iou_threshold,
        imgsz=640,
        verbose=False,
    )

    particles: List[Particle] = []
    output_img = img_resized.copy()

    raw_detection_count = 0
    rejected_detection_count = 0
    validation_scores: list[float] = []
    rejection_reasons: list[str] = []

    boxes = results[0].boxes

    for box in boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        conf = float(box.conf[0])
        cls = int(box.cls[0])

        x1 = int(round(x1))
        y1 = int(round(y1))
        x2 = int(round(x2))
        y2 = int(round(y2))

        width = max(0, x2 - x1)
        height = max(0, y2 - y1)
        area = float(width * height)

        if width <= 0 or height <= 0:
            continue

        raw_detection_count += 1

        validation = validate_particle(
            gray=gray,
            x=x1,
            y=y1,
            width=width,
            height=height,
            area=area,
        )

        validation_scores.append(validation.validation_score)

        if not validation.is_valid:
            rejected_detection_count += 1
            rejection_reasons.append(validation.rejection_reason)

            # Rejected candidates are shown in red.
            cv2.rectangle(
                output_img,
                (x1, y1),
                (x2, y2),
                (0, 0, 255),
                1,
            )

            cv2.putText(
                output_img,
                "Rejected",
                (x1, max(20, y1 - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 0, 255),
                1,
            )

            continue

        roi = _safe_crop(gray, x1, y1, x2, y2)
        brightness = float(np.mean(roi)) if roi.size > 0 else 0.0

        particle = Particle(
            x=x1,
            y=y1,
            width=width,
            height=height,
            area=round(area, 2),
            brightness=round(brightness, 2),
            size_category=_size_label(area),
        )

        particles.append(particle)

        # Accepted candidates are shown in yellow.
        cv2.rectangle(
            output_img,
            (x1, y1),
            (x2, y2),
            (0, 255, 255),
            2,
        )

        label = f"Accepted {conf:.2f} | H:{validation.validation_score:.0f}"

        cv2.putText(
            output_img,
            label,
            (x1, max(20, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (0, 255, 255),
            1,
        )

    accepted_detection_count = len(particles)

    hybrid_filter_score = (
        round(float(np.mean(validation_scores)), 2)
        if validation_scores
        else 0.0
    )

    filter_summary = _build_filter_summary(
        raw_count=raw_detection_count,
        accepted_count=accepted_detection_count,
        rejected_count=rejected_detection_count,
        rejection_reasons=rejection_reasons,
    )

    cv2.putText(
        output_img,
        f"YOLO26 Accepted: {accepted_detection_count}/{raw_detection_count}",
        (10, 25),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 0),
        2,
    )

    cv2.putText(
        output_img,
        f"Quality: {quality.image_quality_status} ({quality.image_quality_score})",
        (10, 55),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (0, 255, 0),
        2,
    )

    cv2.putText(
        output_img,
        f"Hybrid: {hybrid_filter_score}",
        (10, 85),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.6,
        (0, 255, 0),
        2,
    )

    proc_filename = generate_unique_filename(
        Path(image_path).name,
        prefix="yolo26_processed_",
    )

    proc_path = IMAGE_UPLOAD_DIR / proc_filename

    saved = cv2.imwrite(str(proc_path), output_img)

    if not saved:
        raise ValueError(f"Failed to save YOLO26 processed image at: {proc_path}")

    avg_area = _mean_or_zero([p.area for p in particles])
    avg_brightness = _mean_or_zero([p.brightness for p in particles])

    processing_time = round(time.time() - start_time, 4)

    print("YOLO26 processed_path:", proc_path)
    print("YOLO26 raw detection count:", raw_detection_count)
    print("YOLO26 accepted detection count:", accepted_detection_count)
    print("YOLO26 rejected detection count:", rejected_detection_count)
    print("YOLO26 hybrid filter score:", hybrid_filter_score)
    print("YOLO26 filter summary:", filter_summary)
    print("YOLO26 processing time:", processing_time)

    return DetectionResult(
        particles=particles,
        processed_image_path=str(proc_path),
        laplacian_variance=round(lap_var, 2),
        mean_brightness=round(mean_brightness, 2),
        average_particle_area=round(avg_area, 2),
        average_brightness=round(avg_brightness, 2),

        focus_score=quality.focus_score,
        brightness_score=quality.brightness_score,
        contrast_score=quality.contrast_score,
        overexposed_percent=quality.overexposed_percent,
        underexposed_percent=quality.underexposed_percent,
        image_quality_score=quality.image_quality_score,
        image_quality_status=quality.image_quality_status,
        quality_warning=quality.quality_warning,

        raw_detection_count=raw_detection_count,
        accepted_detection_count=accepted_detection_count,
        rejected_detection_count=rejected_detection_count,
        hybrid_filter_score=hybrid_filter_score,
        filter_summary=filter_summary,

        model_name="YOLO26n",
        confidence_threshold=conf_threshold,
        iou_threshold=iou_threshold,
        processing_time_seconds=processing_time,
    )


# Optional short alias for testing
def detect_with_yolo26(
    image_path: str,
    conf_threshold: float = 0.70,
    iou_threshold: float = 0.40,
) -> DetectionResult:
    return analyze_image_yolo26(
        image_path=image_path,
        conf_threshold=conf_threshold,
        iou_threshold=iou_threshold,
    )