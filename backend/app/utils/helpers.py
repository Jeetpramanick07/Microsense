import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional


def generate_unique_filename(original_filename: str, prefix: str = "") -> str:
    """Generate a unique filename using UUID + timestamp."""
    ext = Path(original_filename).suffix.lower()
    uid = uuid.uuid4().hex[:10]
    ts = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    name = f"{prefix}{ts}_{uid}{ext}"
    return name


def path_to_url(file_path: str) -> Optional[str]:
    """Convert a local filesystem path to a relative URL served by FastAPI."""
    if not file_path:
        return None
    # Normalize to forward slashes and strip leading path up to /uploads/
    p = Path(file_path).as_posix()
    idx = p.find("/uploads/")
    if idx != -1:
        return p[idx:]
    return f"/{p}"


