"""
Optional ESP32/OLED device routes.

These routes let the laptop/backend send the latest computed result to ESP32 over
USB serial, so the OLED can show Particles/L, MPI, and Monitoring Risk Level.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.routes.samples import _build_sample_out
from app.services.serial_service import format_oled_message, send_to_esp32

router = APIRouter(prefix="/device", tags=["Device / OLED"])


class SendLatestRequest(BaseModel):
    port: Optional[str] = None
    baud_rate: Optional[int] = None


@router.post("/send-latest-to-oled")
def send_latest_to_oled(payload: SendLatestRequest | None = None, db: Session = Depends(get_db)):
    sample = db.query(models.Sample).order_by(models.Sample.created_at.desc()).first()
    if not sample:
        raise HTTPException(status_code=404, detail="No analyzed sample found.")

    message = format_oled_message(sample)
    port = payload.port if payload else None
    baud_rate = payload.baud_rate if payload else None
    result = send_to_esp32(message, port=port, baud_rate=baud_rate)
    return {
        "sample": _build_sample_out(sample),
        "oled": result,
    }
