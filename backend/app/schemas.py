from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, field_validator


class ParticleFeatureOut(BaseModel):
    id: int
    sample_id: int
    x: int
    y: int
    width: int
    height: int
    area: float
    brightness: float
    size_category: str

    model_config = {"from_attributes": True}


class SampleBase(BaseModel):
    sample_source: str
    chamber_volume_ml: float
    notes: Optional[str] = None

    @field_validator("sample_source")
    @classmethod
    def source_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("sample_source is required")
        return v.strip()

    @field_validator("chamber_volume_ml")
    @classmethod
    def volume_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("chamber_volume_ml must be greater than 0")
        return v


class SampleOut(BaseModel):
    id: int

    # Sample metadata
    sample_source: str
    chamber_volume_ml: float
    notes: Optional[str] = None
    created_at: datetime

    # Detection results
    detected_particles: int
    estimated_particles_per_litre: float

    # Main scoring results
    mpi_score: float
    msmi_score: Optional[float] = None
    monitoring_risk_level: str
    concentration_only_risk_level: Optional[str] = None

    # Component scores
    concentration_score: Optional[float] = None
    size_score: Optional[float] = None
    confidence_score: float

    # Source-aware scoring
    source_risk_factor: Optional[float] = None
    risk_explanation: Optional[str] = None

    # Particle statistics
    average_particle_area: Optional[float] = None
    average_brightness: Optional[float] = None
    size_category: Optional[str] = None

    # Image quality validation
    focus_score: Optional[float] = None
    brightness_score: Optional[float] = None
    contrast_score: Optional[float] = None
    overexposed_percent: Optional[float] = None
    underexposed_percent: Optional[float] = None
    image_quality_score: Optional[float] = None
    image_quality_status: Optional[str] = None
    quality_warning: Optional[str] = None

    # File URLs
    original_image_url: Optional[str] = None
    processed_image_url: Optional[str] = None
    file_type: str

    # Video-specific
    frames_analyzed: Optional[int] = None
    average_particles_per_frame: Optional[float] = None

    # Recommendation
    recommendation: str

    model_config = {"from_attributes": True}


class SampleDetail(SampleOut):
    particles: List[ParticleFeatureOut] = Field(default_factory=list)


class AnalyticsSummary(BaseModel):
    total_samples: int
    average_mpi: float
    average_particles_per_litre: float
    high_risk_samples: int
    very_high_risk_samples: int
    latest_sample: Optional[SampleOut] = None
    risk_distribution: dict


class HealthResponse(BaseModel):
    status: str
    project: str
    message: str    