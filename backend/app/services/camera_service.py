"""
Camera capture service for MicroSense AI-Cam.

Captures one frame from a USB microscope/camera and saves it
for YOLO26n processing.
"""

from pathlib import Path
import time
import cv2

from app.config import IMAGE_UPLOAD_DIR
from app.utils.helpers import generate_unique_filename


def capture_frame(
    camera_index: int = 2,
    warmup_frames: int = 60
) -> Path:
    """
    Capture a frame from USB microscope.

    Parameters
    ----------
    camera_index : int
        Camera number (0, 1, 2, etc.)

    warmup_frames : int
        Number of frames to discard before capture.
    """

    print(f"\n[CAMERA] Opening camera index {camera_index}")

    cap = cv2.VideoCapture(camera_index)

    if not cap.isOpened():
        raise ValueError(
            f"Could not open camera index {camera_index}"
        )

    try:
        # Give camera time to initialize
        time.sleep(2)

        # Safe resolution for most USB microscopes
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

        frame = None

        print("[CAMERA] Warming up camera...")

        for _ in range(max(1, warmup_frames)):
            ret, frame = cap.read()

            if not ret:
                time.sleep(0.05)

        ret, frame = cap.read()

        if not ret or frame is None:
            raise ValueError(
                "Camera opened, but no frame could be captured."
            )

        print(f"[CAMERA] Frame shape: {frame.shape}")
        print(f"[CAMERA] Mean brightness: {frame.mean():.2f}")

        filename = generate_unique_filename(
            "camera_capture.jpg",
            prefix="captured_"
        )

        save_path = IMAGE_UPLOAD_DIR / filename

        success = cv2.imwrite(
            str(save_path),
            frame
        )

        if not success:
            raise ValueError(
                "Failed to save captured image."
            )

        print(f"[CAMERA] Image saved: {save_path}")

        return save_path

    finally:
        cap.release()
        print("[CAMERA] Camera released")