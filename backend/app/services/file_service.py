import shutil
from pathlib import Path
from fastapi import UploadFile, HTTPException
from app.config import (
    IMAGE_UPLOAD_DIR, VIDEO_UPLOAD_DIR,
    ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES,
    ALLOWED_IMAGE_EXTENSIONS, ALLOWED_VIDEO_EXTENSIONS,
    MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_MB,
)
from app.utils.helpers import generate_unique_filename


def _extension(file: UploadFile) -> str:
    return Path(file.filename or "").suffix.lower()


def _validate_upload_size(file: UploadFile) -> None:
    """Reject very large uploads when size is available from the client."""
    size = getattr(file, "size", None)
    if size is not None and size > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File is too large. Maximum allowed size is {MAX_UPLOAD_SIZE_MB:g} MB.",
        )


def _validate_image(file: UploadFile) -> None:
    ext = _extension(file)
    if file.content_type not in ALLOWED_IMAGE_TYPES and ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid image type '{file.content_type}' / extension '{ext}'. "
                f"Accepted extensions: {sorted(ALLOWED_IMAGE_EXTENSIONS)}"
            ),
        )


def _validate_video(file: UploadFile) -> None:
    ext = _extension(file)
    if file.content_type not in ALLOWED_VIDEO_TYPES and ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid video type '{file.content_type}' / extension '{ext}'. "
                f"Accepted extensions: {sorted(ALLOWED_VIDEO_EXTENSIONS)}"
            ),
        )


async def save_image(file: UploadFile) -> Path:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Image file is required.")
    _validate_upload_size(file)
    _validate_image(file)
    filename = generate_unique_filename(file.filename, prefix="original_")
    dest = IMAGE_UPLOAD_DIR / filename
    try:
        with open(dest, "wb") as out:
            shutil.copyfileobj(file.file, out)
    finally:
        await file.close()
    return dest


async def save_video(file: UploadFile) -> Path:
    if not file.filename:
        raise HTTPException(status_code=400, detail="Video file is required.")
    _validate_upload_size(file)
    _validate_video(file)
    filename = generate_unique_filename(file.filename, prefix="video_")
    dest = VIDEO_UPLOAD_DIR / filename
    try:
        with open(dest, "wb") as out:
            shutil.copyfileobj(file.file, out)
    finally:
        await file.close()
    return dest


def delete_file_if_exists(path: str | None) -> None:
    if path:
        p = Path(path)
        if p.exists() and p.is_file():
            p.unlink()
