"""
YOLOv5-based particle detection for MicroSense AI-Cam.

Permanent fix:
- Try YOLOv5 first.
- If YOLO / torch.hub fails on Render, do not crash.
- Automatically use OpenCV fallback detection.
- Always generate processed image.
- Always return DetectionResult to samples.py.
- Always calculate image quality, even when OpenCV fallback is used.
- Apply Hybrid AI + Image Processing Filter to reduce false positives.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import List
import os
import pathlib

import cv2
import numpy as np
import torch

from app.config import (
    RESIZE_WIDTH,
    RESIZE_HEIGHT,
    IMAGE_UPLOAD_DIR,
    MIN_CONTOUR_AREA,
    MAX_CONTOUR_AREA,
)
from app.utils.helpers import generate_unique_filename
from app.services.quality import evaluate_image_quality
from app.services.hybrid_filter import validate_particle


# ── Paths ─────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_PATH = BASE_DIR / "model" / "best.pt"


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

    @property
    def count(self) -> int:
        """
        Final trusted particle count.

        This returns the number of accepted particles after hybrid validation.
        samples.py uses result.count for detected_particles and MSMI calculation.
        """
        return len(self.particles)


# ── Model loading ─────────────────────────────────────────────────────────────

_model = None


def get_model():
    """
    Load YOLOv5 model only once.

    Windows:
    PosixPath patch is needed only for Windows local machine.

    Render/Linux:
    trust_repo=True prevents torch.hub interactive prompt.
    """
    global _model

    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"YOLO model not found at: {MODEL_PATH}")

        print("Loading YOLOv5 model from:", MODEL_PATH)

        # This patch is only for Windows local development.
        # Do not apply it on Render/Linux.
        if os.name == "nt":
            pathlib.PosixPath = pathlib.WindowsPath

        _model = torch.hub.load(
            "ultralytics/yolov5",
            "custom",
            path=str(MODEL_PATH),
            force_reload=False,
            trust_repo=True,
        )

        _model.conf = 0.25
        _model.iou = 0.45

        print("YOLOv5 model loaded successfully.")

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


def _mean_or_zero(values: list[float]) -> float:
    return float(np.mean(values)) if values else 0.0


# ── OpenCV fallback detector ──────────────────────────────────────────────────

def _classical_cv_detection(
    img_resized: np.ndarray,
    gray: np.ndarray,
    lap_var: float,
    mean_brightness: float,
    image_path: str,
    reason: str = "YOLO unavailable",
) -> DetectionResult:
    """
    OpenCV fallback detector.

    This prevents Render from returning 500 if YOLOv5/torch.hub fails.
    It also calculates image quality and applies hybrid validation.
    """

    print(f"WARNING: Falling back to OpenCV detector. Reason: {reason}")

    quality = evaluate_image_quality(gray)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    blurred = cv2.GaussianBlur(enhanced, (5, 5), 0)

    _, binary_light = cv2.threshold(
        blurred,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU,
    )

    _, binary_dark = cv2.threshold(
        blurred,
        0,
        255,
        cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU,
    )

    if cv2.countNonZero(binary_light) < cv2.countNonZero(binary_dark):
        mask = binary_light
    else:
        mask = binary_dark

    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)

    contours, _ = cv2.findContours(
        mask,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE,
    )

    particles: List[Particle] = []
    output_img = img_resized.copy()

    raw_detection_count = 0
    rejected_detection_count = 0
    validation_scores: list[float] = []
    rejection_reasons: list[str] = []

    for cnt in contours:
        area = float(cv2.contourArea(cnt))

        if area < MIN_CONTOUR_AREA or area > MAX_CONTOUR_AREA:
            continue

        x, y, w, h = cv2.boundingRect(cnt)

        if w <= 1 or h <= 1:
            continue

        raw_detection_count += 1

        validation = validate_particle(
            gray=gray,
            x=int(x),
            y=int(y),
            width=int(w),
            height=int(h),
            area=area,
        )

        validation_scores.append(validation.validation_score)

        if not validation.is_valid:
            rejected_detection_count += 1
            rejection_reasons.append(validation.rejection_reason)

            # Rejected candidates are shown in red.
            cv2.rectangle(
                output_img,
                (x, y),
                (x + w, y + h),
                (0, 0, 255),
                1,
            )

            cv2.putText(
                output_img,
                "Rejected",
                (x, max(20, y - 8)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                (0, 0, 255),
                1,
            )

            continue

        roi = _safe_crop(gray, x, y, x + w, y + h)
        brightness = float(np.mean(roi)) if roi.size > 0 else 0.0

        particle = Particle(
            x=int(x),
            y=int(y),
            width=int(w),
            height=int(h),
            area=round(area, 2),
            brightness=round(brightness, 2),
            size_category=_size_label(area),
        )

        particles.append(particle)

        # Accepted candidates are shown in yellow.
        cv2.rectangle(
            output_img,
            (x, y),
            (x + w, y + h),
            (0, 255, 255),
            2,
        )

        cv2.putText(
            output_img,
            f"Accepted {validation.validation_score:.0f}",
            (x, max(20, y - 8)),
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
        f"CV Accepted: {accepted_detection_count}/{raw_detection_count}",
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
        prefix="cv_processed_",
    )

    proc_path = IMAGE_UPLOAD_DIR / proc_filename

    saved = cv2.imwrite(str(proc_path), output_img)

    if not saved:
        raise ValueError(f"Failed to save processed fallback image at: {proc_path}")

    avg_area = _mean_or_zero([p.area for p in particles])
    avg_brightness = _mean_or_zero([p.brightness for p in particles])

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
    )


# ── Public API: Image ─────────────────────────────────────────────────────────

def analyze_image(image_path: str) -> DetectionResult:
    """
    Analyze uploaded image.

    Flow:
    1. Read image.
    2. Resize image.
    3. Calculate image quality.
    4. Try YOLOv5 detection.
    5. If YOLO fails, use OpenCV fallback.
    6. Apply hybrid validation filter.
    7. Save processed image.
    8. Return DetectionResult.
    """

    print("USING DETECTOR: YOLOv5 WITH OPENCV FALLBACK + HYBRID FILTER")

    img = cv2.imread(str(image_path))

    if img is None:
        raise ValueError(f"OpenCV could not read image: {image_path}")

    img_resized = cv2.resize(img, (RESIZE_WIDTH, RESIZE_HEIGHT))
    gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)

    lap_var = _laplacian_variance(gray)
    mean_brightness = float(np.mean(gray))
    quality = evaluate_image_quality(gray)

    try:
        model = get_model()

        rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
        results = model(rgb)

        detections = results.xyxy[0].cpu().numpy()

    except Exception as e:
        return _classical_cv_detection(
            img_resized=img_resized,
            gray=gray,
            lap_var=lap_var,
            mean_brightness=mean_brightness,
            image_path=image_path,
            reason=str(e),
        )

    particles: List[Particle] = []
    output_img = img_resized.copy()

    raw_detection_count = 0
    rejected_detection_count = 0
    validation_scores: list[float] = []
    rejection_reasons: list[str] = []

    for det in detections:
        x1, y1, x2, y2, conf, cls = det

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
        f"YOLO Accepted: {accepted_detection_count}/{raw_detection_count}",
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
        prefix="yolo_processed_",
    )

    proc_path = IMAGE_UPLOAD_DIR / proc_filename

    saved = cv2.imwrite(str(proc_path), output_img)

    if not saved:
        raise ValueError(f"Failed to save processed image at: {proc_path}")

    print("DETECTOR.PY FINAL processed_path:", proc_path)
    print("Raw detection count:", raw_detection_count)
    print("Accepted detection count:", accepted_detection_count)
    print("Rejected detection count:", rejected_detection_count)
    print("Hybrid filter score:", hybrid_filter_score)
    print("Filter summary:", filter_summary)

    avg_area = _mean_or_zero([p.area for p in particles])
    avg_brightness = _mean_or_zero([p.brightness for p in particles])

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
    )


# ── Public API: Video ─────────────────────────────────────────────────────────

def analyze_video(video_path: str, frame_interval: int = 10) -> dict:
    """
    Analyze video using YOLOv5 frame-by-frame.

    If YOLO fails for video, this will still raise error.
    Main permanent fix is for image upload route.
    """

    print("USING VIDEO DETECTOR: YOLOv5 VERSION")

    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        raise ValueError(f"OpenCV could not open video: {video_path}")

    model = get_model()

    frame_results: list[dict] = []
    frame_index = 0
    preview_saved = False
    preview_path = ""

    while True:
        ret, frame = cap.read()

        if not ret:
            break

        if frame_index % frame_interval == 0:
            resized = cv2.resize(frame, (RESIZE_WIDTH, RESIZE_HEIGHT))
            gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
            rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)

            lap_var = _laplacian_variance(gray)
            mean_brightness = float(np.mean(gray))

            results = model(rgb)
            detections = results.xyxy[0].cpu().numpy()

            out_frame = resized.copy()
            areas = []
            brightnesses = []
            count = 0

            for det in detections:
                x1, y1, x2, y2, conf, cls = det

                x1 = int(round(x1))
                y1 = int(round(y1))
                x2 = int(round(x2))
                y2 = int(round(y2))

                width = max(0, x2 - x1)
                height = max(0, y2 - y1)
                area = float(width * height)

                if width <= 0 or height <= 0:
                    continue

                roi = _safe_crop(gray, x1, y1, x2, y2)
                brightness = float(np.mean(roi)) if roi.size > 0 else 0.0

                areas.append(area)
                brightnesses.append(brightness)
                count += 1

                cv2.rectangle(
                    out_frame,
                    (x1, y1),
                    (x2, y2),
                    (0, 255, 255),
                    2,
                )

                cv2.putText(
                    out_frame,
                    f"{conf:.2f}",
                    (x1, max(20, y1 - 8)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 255, 255),
                    2,
                )

            frame_results.append(
                {
                    "frame": frame_index,
                    "count": count,
                    "avg_area": float(np.mean(areas)) if areas else 0.0,
                    "avg_brightness": float(np.mean(brightnesses)) if brightnesses else 0.0,
                    "laplacian_variance": lap_var,
                    "mean_brightness": mean_brightness,
                }
            )

            if not preview_saved:
                cv2.putText(
                    out_frame,
                    f"YOLO Frame {frame_index} | Particles: {count}",
                    (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (0, 255, 0),
                    2,
                )

                fname = generate_unique_filename(
                    Path(video_path).name,
                    prefix="yolo_preview_",
                )

                preview_path = str(IMAGE_UPLOAD_DIR / fname)

                saved = cv2.imwrite(preview_path, out_frame)

                if not saved:
                    cap.release()
                    raise ValueError(f"Failed to save video preview at: {preview_path}")

                preview_saved = True

        frame_index += 1

    cap.release()

    if not frame_results:
        raise ValueError("No frames could be extracted from the video.")

    avg_count = float(np.mean([r["count"] for r in frame_results]))
    avg_area = float(np.mean([r["avg_area"] for r in frame_results]))
    avg_brightness = float(np.mean([r["avg_brightness"] for r in frame_results]))
    avg_lap = float(np.mean([r["laplacian_variance"] for r in frame_results]))

    return {
        "frames_analyzed": len(frame_results),
        "average_particles_per_frame": round(avg_count, 2),
        "average_particle_area": round(avg_area, 2),
        "average_brightness": round(avg_brightness, 2),
        "laplacian_variance": round(avg_lap, 2),
        "preview_image_path": preview_path,
        "detected_particles": round(avg_count),
    }