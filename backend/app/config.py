import os
from pathlib import Path

# ── Base paths ────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "uploads"
IMAGE_UPLOAD_DIR = UPLOAD_DIR / "images"
VIDEO_UPLOAD_DIR = UPLOAD_DIR / "videos"
REPORTS_DIR = BASE_DIR / "reports"

# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/microsense.db")

# ── Upload validation ─────────────────────────────────────────────────────────
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/bmp",
    "image/tiff",
    "image/webp",
}

ALLOWED_IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".tif",
    ".tiff",
    ".webp",
}

ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/avi",
    "video/quicktime",
    "video/x-msvideo",
    "video/mpeg",
    "video/webm",
}

ALLOWED_VIDEO_EXTENSIONS = {
    ".mp4",
    ".avi",
    ".mov",
    ".mpeg",
    ".mpg",
    ".webm",
}

MAX_UPLOAD_SIZE_MB = float(os.getenv("MAX_UPLOAD_SIZE_MB", "50"))
MAX_UPLOAD_SIZE_BYTES = int(MAX_UPLOAD_SIZE_MB * 1024 * 1024)

# ── Image / YOLO processing settings ──────────────────────────────────────────
MIN_CONTOUR_AREA = int(os.getenv("MIN_CONTOUR_AREA", "15"))
MAX_CONTOUR_AREA = int(os.getenv("MAX_CONTOUR_AREA", "8000"))

RESIZE_WIDTH = int(os.getenv("RESIZE_WIDTH", "640"))
RESIZE_HEIGHT = int(os.getenv("RESIZE_HEIGHT", "480"))

VIDEO_FRAME_INTERVAL = int(os.getenv("VIDEO_FRAME_INTERVAL", "10"))

# ── CORS ──────────────────────────────────────────────────────────────────────
# Local frontend:
#   http://localhost:5173
#
# Deployed frontend:
#   https://microsense-ai-cam.vercel.app
#
# You can also override this from Render Environment Variables using:
# CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://microsense-ai-cam.vercel.app

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        ",".join(
            [
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:5174",
                "http://127.0.0.1:3000",
                "https://microsense-ai-cam.vercel.app",
                "http://localhost:5175",
                "http://127.0.0.1:5175",
            ]
        ),
    ).split(",")
    if origin.strip()
]

# ── Optional device / OLED / camera configuration ─────────────────────────────
# Set ESP32_SERIAL_PORT to COM3 / COM4 on Windows when you want to push results
# to OLED or ESP32-connected display.

ESP32_SERIAL_PORT = os.getenv("ESP32_SERIAL_PORT", "")
ESP32_BAUD_RATE = int(os.getenv("ESP32_BAUD_RATE", "115200"))

CAMERA_DEFAULT_INDEX = int(os.getenv("CAMERA_DEFAULT_INDEX", "0"))
CAMERA_WARMUP_FRAMES = int(os.getenv("CAMERA_WARMUP_FRAMES", "15"))


def create_dirs():
    """Create required upload/report directories."""
    IMAGE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    VIDEO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)