from datetime import datetime

from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Sample(Base):
    """Stores the result of one image/video microplastic analysis."""
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True, index=True)

    # Sample metadata
    sample_source = Column(String(120), nullable=False)
    chamber_volume_ml = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Detection results
    detected_particles = Column(Integer, nullable=False)
    estimated_particles_per_litre = Column(Float, nullable=False)

    # Main scoring results
    mpi_score = Column(Float, nullable=False)
    msmi_score = Column(Float, nullable=True)
    monitoring_risk_level = Column(String(20), nullable=False)
    concentration_only_risk_level = Column(String(30), nullable=True)

    # Component scores
    concentration_score = Column(Float, nullable=True)
    size_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=False)

    # Source-aware scoring
    source_risk_factor = Column(Float, nullable=True)
    risk_explanation = Column(Text, nullable=True)

    # Particle statistics
    average_particle_area = Column(Float, nullable=True)
    average_brightness = Column(Float, nullable=True)
    size_category = Column(String(80), nullable=True)

    # Image quality validation
    focus_score = Column(Float, nullable=True)
    brightness_score = Column(Float, nullable=True)
    contrast_score = Column(Float, nullable=True)
    overexposed_percent = Column(Float, nullable=True)
    underexposed_percent = Column(Float, nullable=True)
    image_quality_score = Column(Float, nullable=True)
    image_quality_status = Column(String(30), nullable=True)
    quality_warning = Column(Text, nullable=True)

    raw_detection_count = Column(Integer, nullable=True)
    accepted_detection_count = Column(Integer, nullable=True)
    rejected_detection_count = Column(Integer, nullable=True)
    hybrid_filter_score = Column(Float, nullable=True)
    filter_summary = Column(Text, nullable=True)

    # File references
    original_file_path = Column(String(300), nullable=True)
    processed_file_path = Column(String(300), nullable=True)
    file_type = Column(String(10), nullable=False, default="image")

    # Video-specific
    frames_analyzed = Column(Integer, nullable=True)
    average_particles_per_frame = Column(Float, nullable=True)

    # Recommendation
    recommendation = Column(Text, nullable=False)

    # Relationship to individual particle features
    particles = relationship(
        "ParticleFeature",
        back_populates="sample",
        cascade="all, delete-orphan",
    )


class ParticleFeature(Base):
    """Stores individual detected particle bounding-box and feature data."""
    __tablename__ = "particle_features"

    id = Column(Integer, primary_key=True, index=True)
    sample_id = Column(Integer, ForeignKey("samples.id"), nullable=False)

    x = Column(Integer)
    y = Column(Integer)
    width = Column(Integer)
    height = Column(Integer)
    area = Column(Float)
    brightness = Column(Float)
    size_category = Column(String(40))

    sample = relationship("Sample", back_populates="particles")