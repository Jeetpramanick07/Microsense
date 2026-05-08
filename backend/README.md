# MicroSense AI-Cam — Backend

> ⚠️ **Prototype Disclaimer**: This system provides **field-level monitoring estimation only** and is **not** a lab-certified microplastic identification method. WHO has not defined official numeric safe limits for microplastics in drinking water. Results are indicative only.

---

## Project Overview

MicroSense AI-Cam is a low-cost optical microplastic detection prototype. A camera/microscope captures an image or short video of a water sample in a transparent flow chamber. The backend processes the media using OpenCV, estimates particle concentration (particles/litre), calculates a **Microplastic Pollution Index (MPI)**, assigns a **Monitoring Risk Level**, stores results in SQLite, and exposes a REST API for a React dashboard.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.11+ |
| Framework | FastAPI |
| Vision | OpenCV, NumPy |
| Database | SQLite + SQLAlchemy ORM |
| Validation | Pydantic v2 |
| Server | Uvicorn |

---

## Setup

### 1. Clone / navigate into the backend folder

```bash
cd backend
```

### 2. Create a virtual environment

```bash
python -m venv venv

# Activate
# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the server

```bash
# Option A — convenience script
python run.py

# Option B — uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server starts at: **http://localhost:8000**
Swagger UI: **http://localhost:8000/docs**

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/samples/analyze-image` | Upload & analyze image |
| POST | `/api/samples/analyze-video` | Upload & analyze video |
| GET | `/api/samples/` | List all samples (filterable) |
| GET | `/api/samples/{id}` | Single sample detail |
| DELETE | `/api/samples/{id}` | Delete sample & files |
| GET | `/api/samples/{id}/report` | Download report (json or text) |
| GET | `/api/analytics/summary` | Aggregate statistics |

---

## Example cURL Commands

### Health check
```bash
curl http://localhost:8000/api/health
```

### Analyze an image
```bash
curl -X POST http://localhost:8000/api/samples/analyze-image \
  -F "file=@/path/to/sample.jpg" \
  -F "sample_source=Tap Water" \
  -F "chamber_volume_ml=50" \
  -F "notes=Collected from kitchen tap"
```

### List samples (filter by risk level)
```bash
curl "http://localhost:8000/api/samples/?risk_level=High&limit=10"
```

### Download text report
```bash
curl "http://localhost:8000/api/samples/1/report?format=text" -o report.txt
```

---

## MPI Calculation

```
particles_per_litre = detected_particles × (1000 / chamber_volume_ml)

MPI = 0.60 × concentration_score
    + 0.25 × size_score
    + 0.15 × confidence_score
```

### Monitoring Risk Levels (particles/litre)

| Range | Level |
|---|---|
| 0 – 10 | Very Low |
| 11 – 50 | Low |
| 51 – 200 | Moderate |
| 201 – 1000 | High |
| > 1000 | Very High |

---

## Folder Structure

```
backend/
├── app/
│   ├── main.py          # FastAPI app & router registration
│   ├── config.py        # Paths, thresholds, constants
│   ├── database.py      # SQLAlchemy engine + session
│   ├── models.py        # ORM table definitions
│   ├── schemas.py       # Pydantic request/response models
│   ├── services/
│   │   ├── detector.py      # OpenCV detection pipeline
│   │   ├── calculator.py    # MPI / risk calculation
│   │   ├── file_service.py  # Upload validation & saving
│   │   └── report_service.py
│   ├── routes/
│   │   ├── health.py
│   │   ├── samples.py
│   │   └── analytics.py
│   └── utils/helpers.py
├── uploads/
│   ├── images/
│   └── videos/
├── reports/
├── requirements.txt
├── run.py
└── README.md
```

---

## Notes for Future Development

- **DeepSORT / centroid tracking** for video to avoid double-counting particles across frames
- **Scale calibration** using a stage micrometer to convert pixel areas to real micron sizes
- **ML classifier** (YOLO / CNN) to distinguish microplastics from dust/air bubbles
- **PDF report** generation with charts
- **User authentication** for multi-user deployments

## Option 3 Auto Capture Update

New endpoints:

- `POST /api/camera/capture-and-analyze` — backend opens the USB microscope/webcam using OpenCV, captures one frame, analyzes it, saves the result, and returns the result JSON.
- `GET /api/samples/latest` — returns the most recent analyzed sample.
- `POST /api/device/send-latest-to-oled` — optional endpoint to send latest result to ESP32/OLED through USB serial.

### Auto Capture Requirements

The USB microscope must be connected to the same laptop/PC that runs this backend.
If the built-in laptop webcam is captured instead of the USB microscope, try camera index `1`, `2`, or `3` from the frontend Auto Test page.

### Optional ESP32/OLED Serial Setup

Install dependency:

```bash
pip install pyserial
```

Set environment variable if needed:

```env
ESP32_SERIAL_PORT=COM3
ESP32_BAUD_RATE=115200
CAMERA_DEFAULT_INDEX=0
CAMERA_WARMUP_FRAMES=15
```

The OLED message format sent to ESP32 is:

```text
PPL:360,MPI:78,RISK:HIGH
```
