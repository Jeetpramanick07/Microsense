"""
Camera capture service for Option 3 automation.

The USB microscope must be connected to the same laptop/PC where this FastAPI
backend is running. OpenCV captures one frame and saves it as an image, then the
existing detection pipeline can process it.
"""
from pathlib import Path
import time
import cv2

from app.config import IMAGE_UPLOAD_DIR, RESIZE_WIDTH, RESIZE_HEIGHT
from app.utils.helpers import generate_unique_filename


def capture_frame(camera_index: int = 0, warmup_frames: int = 15) -> Path:
    """Capture one image from a USB camera/microscope and save it."""
    cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)

    if not cap.isOpened():
        # Fallback for non-Windows OpenCV builds
        cap = cv2.VideoCapture(camera_index)

    if not cap.isOpened():
        raise ValueError(
            f"Could not open camera index {camera_index}. Try camera_index 1, 2, or 3."
        )

    try:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, RESIZE_WIDTH)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, RESIZE_HEIGHT)

        frame = None
        # Warm up camera so exposure/focus stabilizes
        for _ in range(max(1, warmup_frames)):
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.05)

        ret, frame = cap.read()
        if not ret or frame is None:
            raise ValueError("Camera opened, but no frame could be captured.")

        filename = generate_unique_filename("camera_capture.jpg", prefix="captured_")
        path = IMAGE_UPLOAD_DIR / filename
        ok = cv2.imwrite(str(path), frame)
        if not ok:
            raise ValueError("Failed to save captured camera image.")
        return path
    finally:
        cap.release()
