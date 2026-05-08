# MicroSense AI-Cam — Frontend Setup Guide

## Folder Structure

```
D:\Microsense
│
├── backend\                 ← Your existing FastAPI backend
│   ├── app\
│   ├── model\best.pt
│   ├── uploads\
│   ├── venv\
│   └── run.py
│
└── frontend\                ← This frontend (copy here)
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src\
        ├── main.jsx
        ├── App.jsx
        ├── api.js
        ├── index.css
        └── components\
            ├── Navbar.jsx
            ├── StatusCard.jsx
            ├── RiskBadge.jsx
            ├── Dashboard.jsx
            ├── UploadPage.jsx
            ├── HistoryPage.jsx
            └── SampleModal.jsx
```

---

## Step 1 — Copy Files

Copy all files from this package into:

```
D:\Microsense\frontend\
```

---

## Step 2 — Install Dependencies (Windows PowerShell)

```powershell
cd D:\Microsense\frontend
npm install
```

> If you get errors about Tailwind, run:
> ```powershell
> npm install tailwindcss@3 @tailwindcss/vite autoprefixer postcss
> ```

---

## Step 3 — Run Frontend

```powershell
cd D:\Microsense\frontend
npm run dev
```

Frontend will be available at:
```
http://localhost:5173
```

---

## Step 4 — Run Backend (in a separate terminal)

```powershell
cd D:\Microsense\backend
.\venv\Scripts\activate
python run.py
```

Backend will be available at:
```
http://127.0.0.1:8000
http://127.0.0.1:8000/docs
```

---

## Step 5 — Verify Everything

| Check | URL | Expected |
|-------|-----|----------|
| Frontend running | http://localhost:5173 | Dashboard loads with status cards |
| Backend running | http://127.0.0.1:8000/docs | Swagger UI |
| History page | http://localhost:5173/history | Shows list or "no records" |
| Manual upload | http://localhost:5173/upload | Upload form |

---

## Step 6 — CORS (Important)

If the frontend cannot call the backend, make sure this is in your `backend/app/main.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Common Errors & Fixes

### "Backend Offline" banner on dashboard
- Make sure backend is running: `python run.py`
- Check it responds at `http://127.0.0.1:8000/docs`

### Images not loading (broken thumbnails)
- The frontend uses `http://127.0.0.1:8000` + relative URL from backend
- Make sure the backend serves `/uploads/images/` as a static files route
- Check your FastAPI has: `app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")`

### 422 Validation Error on upload
- Make sure `chamber_volume_ml` is a valid number > 0
- Make sure `sample_source` is not empty
- Do NOT set `Content-Type` manually — browser sets it with the boundary automatically

### Empty history page
- Go to `/upload`, submit a sample
- Backend stores it automatically on each POST to `/api/samples/analyze-image`

### Tailwind styles not working
- Make sure `tailwind.config.js` content paths include `./src/**/*.{js,ts,jsx,tsx}`
- Try: `npm run dev` again after config changes

---

## Routes

| Route | Page |
|-------|------|
| `/` | Hardware Control Dashboard (main page) |
| `/upload` | Manual Upload / Demo Mode |
| `/history` | Testing History (all database records) |

---

## Hardware Status Legend

| Component | Status | Source |
|-----------|--------|--------|
| Backend API | Real (checks /docs) | Live API call |
| YOLOv5 Model | Ready if backend connected | Inferred |
| Storage/Database | Real (checks /api/samples/) | Live API call |
| Latest Sample Sync | Real (checks /api/samples/latest) | Live API call |
| Camera Module | Waiting for hardware signal | Honest placeholder |
| ESP32 Unit | Pending integration | Honest placeholder |
| OLED Display | Optional / Not connected | Honest placeholder |
