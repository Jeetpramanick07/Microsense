from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.config import DATABASE_URL

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_sqlite_optional_columns() -> None:
    """Tiny SQLite-safe migration for fields added during prototype iteration."""
    if not DATABASE_URL.startswith("sqlite"):
        return

    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(samples)")).fetchall()
        existing = {row[1] for row in rows}
        if rows and "average_particles_per_frame" not in existing:
            conn.execute(text("ALTER TABLE samples ADD COLUMN average_particles_per_frame FLOAT"))


def init_db():
    from app import models  # noqa: F401 — import triggers table registration
    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_optional_columns()
