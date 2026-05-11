from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import DATABASE_URL


# SQLite needs check_same_thread=False.
# PostgreSQL should not use that option.
engine_options = {
    "pool_pre_ping": True,
}

if DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}


engine = create_engine(
    DATABASE_URL,
    **engine_options,
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    pass


def get_db():
    """
    FastAPI dependency for creating and closing DB sessions.
    """
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def _ensure_sqlite_optional_columns() -> None:
    """
    Tiny SQLite-safe migration for fields added during prototype iteration.

    This only runs for local SQLite.
    Hosted PostgreSQL will rely on Base.metadata.create_all().
    """
    if not DATABASE_URL.startswith("sqlite"):
        return

    with engine.begin() as conn:
        rows = conn.execute(text("PRAGMA table_info(samples)")).fetchall()
        existing = {row[1] for row in rows}

        if rows and "average_particles_per_frame" not in existing:
            conn.execute(
                text("ALTER TABLE samples ADD COLUMN average_particles_per_frame FLOAT")
            )


def init_db():
    """
    Create database tables automatically.

    This is acceptable for prototype/demo deployment.
    Later, use Alembic migrations for production.
    """
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_sqlite_optional_columns()