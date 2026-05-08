from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Sample(Base):
    """Stores the result of one image/video microplastic analysis."""
    __tablename__ = "samples"

    id = Column(Integer, primary_key=True, index=True)
    sample_source = Column(String(120), nullable=False)
    chamber_volume_ml = Column(Float, nullable=False)

    # Detection results
    detected_particles = Column(Integer, nullable=False)
    estimated_particles_per_litre = Column(Float, nullable=False)
    mpi_score = Column(Float, nullable=False)
    monitoring_risk_level = Column(String(20), nullable=False)
    confidence_score = Column(Float, nullable=False)

    # Particle statistics
    average_particle_area = Column(Float, nullable=True)
    average_brightness = Column(Float, nullable=True)
    size_category = Column(String(60), nullable=True)

    # File references
    original_file_path = Column(String(300), nullable=True)
    processed_file_path = Column(String(300), nullable=True)
    file_type = Column(String(10), nullable=False, default="image")  # "image" | "video"

    # Video-specific
    frames_analyzed = Column(Integer, nullable=True)
    average_particles_per_frame = Column(Float, nullable=True)

    # Metadata
    notes = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship to individual particle features (optional detail)
    particles = relationship("ParticleFeature", back_populates="sample", cascade="all, delete-orphan")


class ParticleFeature(Base):
    """Stores individual detected particle bounding-box & feature data."""
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
