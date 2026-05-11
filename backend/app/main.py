"""
MicroSense AI-Cam — FastAPI backend entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import CORS_ORIGINS, UPLOAD_DIR, create_dirs
from app.database import init_db
from app.routes import health, samples, analytics, camera, device

# Ensure upload/report directories exist before anything else
create_dirs()

# Initialize DB tables
init_db()

app = FastAPI(
    title="MicroSense AI-Cam API",
    description=(
        "Backend for low-cost optical microplastic detection prototype. "
        "⚠️ Prototype only — not lab-certified. "
        "WHO has not defined official numeric safe limits for microplastics in drinking water."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static files: serve uploaded images ───────────────────────────────────────
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(health.router, prefix=API_PREFIX)
app.include_router(samples.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)
app.include_router(camera.router, prefix=API_PREFIX)
app.include_router(device.router, prefix=API_PREFIX)


@app.get("/", include_in_schema=False)
def root():
    return {
        "project": "MicroSense AI-Cam",
        "status": "running",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/health", include_in_schema=False)
def direct_health_check():
    """
    Direct health endpoint for frontend checks.

    This allows both:
    /api/health
    /health
    """
    return {
        "status": "online",
        "service": "MicroSense Backend",
    }