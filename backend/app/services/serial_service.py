"""
Optional ESP32/OLED serial output service.

The laptop/backend still performs OpenCV processing. ESP32 only receives a short
result line and displays it on OLED. This service is optional; if the port is not
configured, API endpoints will return a clear message instead of crashing.
"""
from app.config import ESP32_SERIAL_PORT, ESP32_BAUD_RATE


def format_oled_message(sample) -> str:
    ppl = int(round(sample.estimated_particles_per_litre or 0))
    mpi = int(round(sample.mpi_score or 0))
    risk = (sample.monitoring_risk_level or "UNKNOWN").upper().replace(" ", "_")
    return f"PPL:{ppl},MPI:{mpi},RISK:{risk}\n"


def send_to_esp32(message: str, port: str | None = None, baud_rate: int | None = None) -> dict:
    serial_port = port or ESP32_SERIAL_PORT
    baud = baud_rate or ESP32_BAUD_RATE

    if not serial_port:
        return {
            "sent": False,
            "detail": "ESP32 serial port is not configured. Set ESP32_SERIAL_PORT=COMx in .env or pass port in request.",
        }

    try:
        import serial  # pyserial
    except ImportError:
        return {
            "sent": False,
            "detail": "pyserial is not installed. Run: pip install pyserial",
        }

    try:
        with serial.Serial(serial_port, baud, timeout=2) as ser:
            ser.write(message.encode("utf-8"))
            ser.flush()
        return {"sent": True, "detail": f"Message sent to ESP32 on {serial_port}.", "message": message.strip()}
    except Exception as exc:
        return {"sent": False, "detail": str(exc), "message": message.strip()}
