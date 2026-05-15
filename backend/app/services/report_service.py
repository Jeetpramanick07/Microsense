"""
PDF report generation service for MicroSense AI-Cam.

Generates a prototype-level microplastic-like particle screening report
for each analyzed sample.

Scientific scope:
- Results represent microplastic-like particle candidates.
- The system does not chemically confirm polymer composition.
- The system does not provide certified laboratory-grade or regulatory-grade quantification.
"""

from __future__ import annotations

from pathlib import Path
from datetime import datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    PageBreak,
)

from app.config import REPORTS_DIR


def _safe(value: Any, fallback: str = "—") -> str:
    """Safely convert a value to string."""
    if value is None or value == "":
        return fallback
    return str(value)


def _num(value: Any, digits: int = 2, fallback: str = "—") -> str:
    """Safely format numeric values."""
    if value is None or value == "":
        return fallback

    try:
        number = float(value)

        if number.is_integer():
            return str(int(number))

        return f"{number:.{digits}f}"

    except Exception:
        return str(value)


def _risk_color(risk_level: str | None):
    """Return color based on monitoring risk level."""
    risk = str(risk_level or "").lower()

    if "low" in risk:
        return colors.HexColor("#059669")

    if "moderate" in risk:
        return colors.HexColor("#D97706")

    if "high" in risk:
        return colors.HexColor("#DC2626")

    return colors.HexColor("#475569")


def _resolve_local_image_path(path_value: str | None) -> str | None:
    """
    Convert stored image path into a local file path if possible.

    Supports:
    - Absolute local path
    - /uploads/images/file.jpg
    - uploads/images/file.jpg

    Skips:
    - Cloudinary / HTTPS URLs
    - Missing local files
    """

    if not path_value:
        return None

    path_str = str(path_value).replace("\\", "/").strip()

    if path_str.startswith("http://") or path_str.startswith("https://"):
        return None

    direct_path = Path(path_str)

    if direct_path.exists() and direct_path.is_file():
        return str(direct_path)

    # backend/app/services/report_service.py -> backend/
    backend_root = Path(__file__).resolve().parents[2]

    clean_path = path_str[1:] if path_str.startswith("/") else path_str
    possible_path = backend_root / clean_path

    if possible_path.exists() and possible_path.is_file():
        return str(possible_path)

    return None


def _build_key_value_table(rows):
    """Create styled key-value table."""
    table = Table(rows, colWidths=[2.35 * inch, 4.15 * inch])

    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#ECFEFF")),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#0E7490")),
                ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#0F172A")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )

    return table


def generate_sample_report(sample) -> Path:
    """
    Generate a PDF report for a Sample SQLAlchemy object.

    Args:
        sample: SQLAlchemy Sample object.

    Returns:
        Path to generated PDF report.
    """

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = REPORTS_DIR / f"microsense_sample_{sample.id}_{timestamp}.pdf"

    doc = SimpleDocTemplate(
        str(report_path),
        pagesize=A4,
        rightMargin=42,
        leftMargin=42,
        topMargin=42,
        bottomMargin=42,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "MicroSenseTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=28,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=12,
    )

    subtitle_style = ParagraphStyle(
        "MicroSenseSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#475569"),
        spaceAfter=18,
    )

    heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=18,
        textColor=colors.HexColor("#0E7490"),
        spaceBefore=12,
        spaceAfter=8,
    )

    normal_style = ParagraphStyle(
        "BodyText",
        parent=styles["Normal"],
        fontSize=9,
        leading=14,
        alignment=TA_LEFT,
        textColor=colors.HexColor("#334155"),
    )

    warning_style = ParagraphStyle(
        "WarningText",
        parent=styles["Normal"],
        fontSize=9,
        leading=14,
        textColor=colors.HexColor("#92400E"),
        backColor=colors.HexColor("#FFFBEB"),
        borderColor=colors.HexColor("#FCD34D"),
        borderWidth=0.5,
        borderPadding=8,
        spaceBefore=8,
        spaceAfter=8,
    )

    story = []

    # -------------------------------------------------------------------------
    # Title
    # -------------------------------------------------------------------------
    story.append(Paragraph("MicroSense AI-Cam Report", title_style))

    story.append(
        Paragraph(
            "AI-assisted optical monitoring report for preliminary screening of "
            "microplastic-like particle candidates in water samples.",
            subtitle_style,
        )
    )

    # -------------------------------------------------------------------------
    # 1. Sample Summary
    # -------------------------------------------------------------------------
    risk_level = _safe(getattr(sample, "monitoring_risk_level", None))
    risk_color = _risk_color(risk_level)

    summary_rows = [
        ["Report Generated", datetime.now().strftime("%d %b %Y, %I:%M %p")],
        ["Sample ID", _safe(getattr(sample, "id", None))],
        ["Sample Source", _safe(getattr(sample, "sample_source", None))],
        ["Chamber Volume", f"{_num(getattr(sample, 'chamber_volume_ml', None), 1)} ml"],
        ["File Type", _safe(getattr(sample, "file_type", None), "image")],
        ["Monitoring Risk Level", risk_level],
    ]

    summary_table = _build_key_value_table(summary_rows)

    summary_table.setStyle(
        TableStyle(
            [
                ("TEXTCOLOR", (1, 5), (1, 5), risk_color),
                ("FONTNAME", (1, 5), (1, 5), "Helvetica-Bold"),
            ]
        )
    )

    story.append(Paragraph("1. Sample Summary", heading_style))
    story.append(summary_table)
    story.append(Spacer(1, 12))

    # -------------------------------------------------------------------------
    # 2. Detection Results
    # -------------------------------------------------------------------------
    detection_rows = [
        ["Detected Candidates", _safe(getattr(sample, "detected_particles", None))],
        [
            "Estimated Particles / Litre",
            _num(getattr(sample, "estimated_particles_per_litre", None), 2),
        ],
        [
            "MSMI Score",
            _num(
                getattr(sample, "msmi_score", None)
                if getattr(sample, "msmi_score", None) is not None
                else getattr(sample, "mpi_score", None),
                2,
            ),
        ],
        ["MPI Score", _num(getattr(sample, "mpi_score", None), 2)],
        ["Confidence Score", _num(getattr(sample, "confidence_score", None), 2)],
        ["Particle Size Category", _safe(getattr(sample, "size_category", None))],
        ["Average Particle Area", _num(getattr(sample, "average_particle_area", None), 2)],
        ["Average Brightness", _num(getattr(sample, "average_brightness", None), 2)],
    ]

    story.append(Paragraph("2. Detection and Monitoring Results", heading_style))
    story.append(_build_key_value_table(detection_rows))
    story.append(Spacer(1, 12))

    # -------------------------------------------------------------------------
    # 3. Hybrid Validation
    # -------------------------------------------------------------------------
    validation_rows = [
        ["Raw Detection Count", _safe(getattr(sample, "raw_detection_count", None))],
        [
            "Accepted Candidate Count",
            _safe(getattr(sample, "accepted_detection_count", None)),
        ],
        [
            "Rejected Candidate Count",
            _safe(getattr(sample, "rejected_detection_count", None)),
        ],
        [
            "Hybrid Validation Score",
            _num(getattr(sample, "hybrid_filter_score", None), 2),
        ],
        ["Filter Summary", _safe(getattr(sample, "filter_summary", None))],
    ]

    story.append(Paragraph("3. Hybrid Validation Results", heading_style))
    story.append(_build_key_value_table(validation_rows))
    story.append(Spacer(1, 12))

    # -------------------------------------------------------------------------
    # 4. Image Quality
    # -------------------------------------------------------------------------
    quality_rows = [
        ["Image Quality Status", _safe(getattr(sample, "image_quality_status", None))],
        ["Image Quality Score", _num(getattr(sample, "image_quality_score", None), 2)],
        ["Focus Score", _num(getattr(sample, "focus_score", None), 2)],
        ["Brightness Score", _num(getattr(sample, "brightness_score", None), 2)],
        ["Contrast Score", _num(getattr(sample, "contrast_score", None), 2)],
        ["Overexposed Percent", _num(getattr(sample, "overexposed_percent", None), 2)],
        ["Underexposed Percent", _num(getattr(sample, "underexposed_percent", None), 2)],
        ["Quality Warning", _safe(getattr(sample, "quality_warning", None))],
    ]

    story.append(Paragraph("4. Image Quality Assessment", heading_style))
    story.append(_build_key_value_table(quality_rows))
    story.append(Spacer(1, 12))

    # -------------------------------------------------------------------------
    # 5. Risk Interpretation
    # -------------------------------------------------------------------------
    risk_rows = [
        ["Source Risk Factor", _num(getattr(sample, "source_risk_factor", None), 2)],
        ["Concentration Score", _num(getattr(sample, "concentration_score", None), 2)],
        ["Size Score", _num(getattr(sample, "size_score", None), 2)],
        [
            "Concentration-Only Risk Level",
            _safe(getattr(sample, "concentration_only_risk_level", None)),
        ],
        ["Risk Explanation", _safe(getattr(sample, "risk_explanation", None))],
        ["Recommendation", _safe(getattr(sample, "recommendation", None))],
        ["Notes", _safe(getattr(sample, "notes", None))],
    ]

    story.append(Paragraph("5. Risk Interpretation", heading_style))
    story.append(_build_key_value_table(risk_rows))
    story.append(Spacer(1, 12))

    # -------------------------------------------------------------------------
    # 6. Image Evidence
    # -------------------------------------------------------------------------
    processed_image_path = _resolve_local_image_path(
        getattr(sample, "processed_file_path", None)
    )

    original_image_path = _resolve_local_image_path(
        getattr(sample, "original_file_path", None)
    )

    story.append(Paragraph("6. Image Evidence", heading_style))

    if processed_image_path:
        story.append(Paragraph("Processed Output Image", normal_style))
        story.append(Spacer(1, 6))

        try:
            story.append(
                Image(processed_image_path, width=5.9 * inch, height=3.1 * inch)
            )
        except Exception as image_error:
            story.append(
                Paragraph(
                    f"Processed image could not be embedded in the PDF. Error: {image_error}",
                    warning_style,
                )
            )

        story.append(Spacer(1, 10))

    else:
        story.append(
            Paragraph(
                "Processed image file is not available for embedding. "
                "This may happen if local storage was cleared after deployment restart "
                "or if the image is stored as an external Cloudinary URL.",
                warning_style,
            )
        )

    if original_image_path:
        story.append(Paragraph("Original Uploaded Image", normal_style))
        story.append(Spacer(1, 6))

        try:
            story.append(
                Image(original_image_path, width=5.9 * inch, height=3.1 * inch)
            )
        except Exception as image_error:
            story.append(
                Paragraph(
                    f"Original image could not be embedded in the PDF. Error: {image_error}",
                    warning_style,
                )
            )

        story.append(Spacer(1, 10))

    else:
        story.append(
            Paragraph(
                "Original uploaded image file is not available for embedding.",
                warning_style,
            )
        )

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # 7. Disclaimer
    # -------------------------------------------------------------------------
    story.append(Paragraph("7. Scientific Scope and Disclaimer", heading_style))

    disclaimer = """
    This report is generated by MicroSense AI-Cam, a prototype-level AI-assisted
    optical monitoring system. The reported objects represent microplastic-like
    particle candidates identified from image-based visual features. The system
    does not chemically confirm polymer composition and does not replace certified
    laboratory techniques such as FTIR spectroscopy, Raman spectroscopy, or advanced
    microscopic analysis. The generated values, including estimated concentration,
    MSMI score, confidence score, and monitoring risk level, should be interpreted
    only as preliminary screening indicators and not as regulatory-grade or
    laboratory-certified measurements.
    """

    story.append(Paragraph(disclaimer, normal_style))
    story.append(Spacer(1, 14))

    # -------------------------------------------------------------------------
    # 8. Pipeline
    # -------------------------------------------------------------------------
    story.append(Paragraph("8. System Pipeline", heading_style))

    pipeline_text = """
    Water sample image acquisition → YOLO26n-based candidate detection →
    OpenCV-based fallback support where required → hybrid visual validation →
    image quality assessment → monitoring score calculation → database storage →
    dashboard and report generation.
    """

    story.append(Paragraph(pipeline_text, normal_style))

    # -------------------------------------------------------------------------
    # Build PDF
    # -------------------------------------------------------------------------
    doc.build(story)

    return report_path