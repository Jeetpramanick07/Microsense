"""
YOLOv5-based particle detection for MicroSense AI-Cam.

This detector:
  1. Loads custom YOLOv5 model from backend/model/best.pt
  2. Fixes Windows PosixPath issue for models trained on Linux/Colab
  3. Runs YOLOv5 inference on uploaded images
  4. Draws bounding boxes on detected particles
  5. Saves processed image with prefix yolo_processed_
  6. Returns DetectionResult compatible with existing samples.py and calculator.py

NOTE:
This is still a prototype estimator. YOLO detects trained particle-like objects.
True microplastic confirmation requires FTIR, Raman, fluorescence microscopy,
or other validated material analysis techniques.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import List
import pathlib

import cv2
import numpy as np
import torch

from app.config import (
    RESIZE_WIDTH,
    RESIZE_HEIGHT,
    IMAGE_UPLOAD_DIR,
)
from app.utils.helpers import generate_unique_filename


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
    laplacian_variance: float = 0.0
    mean_brightness: float = 0.0
    average_particle_area: float = 0.0
    average_brightness: float = 0.0

    @property
    def count(self) -> int:
        return len(self.particles)


# ── Model loading ─────────────────────────────────────────────────────────────

_model = None


def get_model():
    """
    Load YOLOv5 model only once.

    Important:
    The pathlib.PosixPath patch fixes this Windows error:
    "cannot instantiate 'PosixPath' on your system"

    This usually happens when best.pt was trained/saved on Linux or Google Colab.
    """
    global _model

    if _model is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"YOLO model not found at: {MODEL_PATH}")

        print("Loading YOLOv5 model from:", MODEL_PATH)

        # Windows fix for YOLO models trained on Linux/Colab
        pathlib.PosixPath = pathlib.WindowsPath

        _model = torch.hub.load(
            "ultralytics/yolov5",
            "custom",
            path=str(MODEL_PATH),
            force_reload=False,
        )

        # Confidence and IoU thresholds
        _model.conf = 0.25
        _model.iou = 0.45

        print("YOLOv5 model loaded successfully.")

    return _model


# ── Helpers ───────────────────────────────────────────────────────────────────

def _size_label(area: float) -> str:
    """
    Rough size category based on bounding-box area.
    Prototype estimation only.
    """
    if area > 2000:
        return ">500 µm est."
    elif area > 500:
        return "100–500 µm est."
    elif area > 100:
        return "50–100 µm est."
    return "<50 µm est."


def _laplacian_variance(gray: np.ndarray) -> float:
    """
    Measure image sharpness.
    Low value means blurry image.
    """
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _safe_crop(gray: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> np.ndarray:
    """
    Safely crop a region from grayscale image.
    Prevents out-of-bound indexing.
    """
    h, w = gray.shape[:2]

    x1 = max(0, min(x1, w - 1))
    x2 = max(0, min(x2, w))
    y1 = max(0, min(y1, h - 1))
    y2 = max(0, min(y2, h))

    if x2 <= x1 or y2 <= y1:
        return np.array([])

    return gray[y1:y2, x1:x2]


# ── Public API: Image ─────────────────────────────────────────────────────────

def analyze_image(image_path: str) -> DetectionResult:
    """
    Run YOLOv5 detection on a single image.

    This function is called by:
        app/routes/samples.py

    The returned processed_image_path is stored in DB and converted to:
        /uploads/images/yolo_processed_...
    """

    print("USING DETECTOR: YOLOv5 VERSION")

    img = cv2.imread(str(image_path))

    if img is None:
        raise ValueError(f"OpenCV could not read image: {image_path}")

    # Resize for consistent dashboard/frontend output
    img_resized = cv2.resize(img, (RESIZE_WIDTH, RESIZE_HEIGHT))

    # Grayscale for brightness and sharpness metrics
    gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)

    lap_var = _laplacian_variance(gray)
    mean_brightness = float(np.mean(gray))

    # Load YOLO model
    model = get_model()

    # YOLO expects RGB image
    rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)

    # Run inference
    results = model(rgb)

    # YOLO detections format:
    # x1, y1, x2, y2, confidence, class
    detections = results.xyxy[0].cpu().numpy()

    particles: List[Particle] = []
    output_img = img_resized.copy()

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

        # Draw bounding box
        cv2.rectangle(
            output_img,
            (x1, y1),
            (x2, y2),
            (0, 255, 255),
            2,
        )

        # Draw label
        label = f"Particle {conf:.2f}"

        cv2.putText(
            output_img,
            label,
            (x1, max(20, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 255, 255),
            2,
        )

    # Overlay total count
    cv2.putText(
        output_img,
        f"YOLO Particles: {len(particles)}",
        (10, 25),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 255, 0),
        2,
    )

    # Save processed image with YOLO prefix
    proc_filename = generate_unique_filename(
        Path(image_path).name,
        prefix="yolo_processed_",
    )

    proc_path = IMAGE_UPLOAD_DIR / proc_filename

    saved = cv2.imwrite(str(proc_path), output_img)

    if not saved:
        raise ValueError(f"Failed to save processed image at: {proc_path}")

    print("DETECTOR.PY FINAL processed_path:", proc_path)

    # Aggregate stats
    avg_area = float(np.mean([p.area for p in particles])) if particles else 0.0
    avg_brightness = float(np.mean([p.brightness for p in particles])) if particles else 0.0

    return DetectionResult(
        particles=particles,
        processed_image_path=str(proc_path),
        laplacian_variance=round(lap_var, 2),
        mean_brightness=round(mean_brightness, 2),
        average_particle_area=round(avg_area, 2),
        average_brightness=round(avg_brightness, 2),
    )


# ── Public API: Video ─────────────────────────────────────────────────────────

def analyze_video(video_path: str, frame_interval: int = 10) -> dict:
    """
    Analyze video using YOLOv5 frame-by-frame.

    Saves the first processed frame as preview image with prefix:
        yolo_preview_
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

            # Save first processed frame as preview
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