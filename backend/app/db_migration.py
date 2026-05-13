from sqlalchemy import inspect, text
from app.database import engine


SAMPLE_COLUMNS = {
    # MSMI / source-aware fields
    "msmi_score": "FLOAT",
    "concentration_only_risk_level": "VARCHAR(50)",
    "concentration_score": "FLOAT",
    "size_score": "FLOAT",
    "source_risk_factor": "FLOAT",
    "risk_explanation": "TEXT",

    # Image quality fields
    "focus_score": "FLOAT",
    "brightness_score": "FLOAT",
    "contrast_score": "FLOAT",
    "overexposed_percent": "FLOAT",
    "underexposed_percent": "FLOAT",
    "image_quality_score": "FLOAT",
    "image_quality_status": "VARCHAR(50)",
    "quality_warning": "TEXT",

    # Hybrid validation fields
    "raw_detection_count": "INTEGER",
    "accepted_detection_count": "INTEGER",
    "rejected_detection_count": "INTEGER",
    "hybrid_filter_score": "FLOAT",
    "filter_summary": "TEXT",
}


def run_safe_migrations():
    """
    Adds missing columns to the samples table.

    create_all() creates tables if missing, but it does not add new columns
    to existing deployed tables. This function safely patches Render DB schema.
    """

    inspector = inspect(engine)

    table_names = inspector.get_table_names()

    if "samples" not in table_names:
        print("Migration skipped: samples table does not exist yet.")
        return

    existing_columns = {
        column["name"] for column in inspector.get_columns("samples")
    }

    with engine.begin() as connection:
        for column_name, column_type in SAMPLE_COLUMNS.items():
            if column_name not in existing_columns:
                print(f"Adding missing column: samples.{column_name}")

                connection.execute(
                    text(
                        f"ALTER TABLE samples "
                        f"ADD COLUMN {column_name} {column_type}"
                    )
                )

    print("Database migration check complete.")