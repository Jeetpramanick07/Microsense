"""
MicroSense AI-Cam PDF report generation service.

This version creates a full-page scientific sample analysis report with larger
readable text, stronger section hierarchy, and additional interpretation content.

Scientific scope:
- Results represent microplastic-like particle candidates.
- The system does not chemically confirm polymer composition.
- The report is intended for preliminary screening and monitoring only.
"""

from __future__ import annotations

from collections import Counter
from pathlib import Path
from datetime import datetime
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

from app.config import REPORTS_DIR


PAGE_W, PAGE_H = A4

BLUE = colors.HexColor("#1F4E79")
DARK_BLUE = colors.HexColor("#0B1F33")
TEXT = colors.HexColor("#111827")
MUTED = colors.HexColor("#4B5563")
BORDER = colors.HexColor("#6B7280")
LIGHT_BORDER = colors.HexColor("#D1D5DB")
SOFT_BG = colors.HexColor("#F8FAFC")
SOFT_BLUE = colors.HexColor("#EFF6FF")
GREEN = colors.HexColor("#16803A")
YELLOW = colors.HexColor("#F4B400")
RED = colors.HexColor("#D93025")
GRAY = colors.HexColor("#6B7280")


# -----------------------------------------------------------------------------
# Safe formatting helpers
# -----------------------------------------------------------------------------

def _safe(value: Any, fallback: str = "None") -> str:
    if value is None or value == "":
        return fallback
    return str(value)


def _num(value: Any, digits: int = 2, fallback: str = "None") -> str:
    if value is None or value == "":
        return fallback
    try:
        number = float(value)
        if number.is_integer():
            return str(int(number))
        return f"{number:.{digits}f}"
    except Exception:
        return str(value)


def _score_1(value: Any, digits: int = 2, fallback: str = "None") -> str:
    """Format a score as 0.xx / 1.00. If backend stores 0-100, normalize it."""
    if value is None or value == "":
        return fallback
    try:
        number = float(value)
        if number > 1:
            number = number / 100.0
        number = max(0.0, min(1.0, number))
        return f"{number:.{digits}f} / 1.00"
    except Exception:
        return str(value)


def _risk_dot_color(risk_level: str | None):
    risk = str(risk_level or "").lower()
    if "high" in risk:
        return RED
    if "moderate" in risk or "medium" in risk:
        return YELLOW
    if "low" in risk:
        return GREEN
    return GRAY


def _quality_dot_color(status: str | None):
    status_text = str(status or "").lower()
    if "poor" in status_text or "bad" in status_text or "fail" in status_text:
        return RED
    if "moderate" in status_text or "fair" in status_text or "warning" in status_text:
        return YELLOW
    if "good" in status_text or "ok" in status_text or "clear" in status_text:
        return GREEN
    return GREEN


def _recommendation_status(recommendation: str | None) -> str:
    text = str(recommendation or "").strip()
    if not text:
        return "Continue routine monitoring"
    if len(text) > 48:
        return text[:45].rstrip() + "..."
    return text


def _resolve_local_image_path(path_value: str | None) -> str | None:
    """
    Convert stored image path into a local file path if possible.

    Supports:
    - Absolute local path
    - /uploads/images/file.jpg
    - uploads/images/file.jpg

    Skips:
    - HTTPS URLs
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


# -----------------------------------------------------------------------------
# Canvas drawing helpers
# -----------------------------------------------------------------------------

def _draw_wrapped_text(
    c: canvas.Canvas,
    text: str,
    x: float,
    y: float,
    width: float,
    font: str = "Helvetica",
    size: float = 8.8,
    leading: float = 11,
    color=TEXT,
    max_lines: int | None = None,
) -> float:
    """Draw wrapped text and return the new y position."""
    c.setFont(font, size)
    c.setFillColor(color)
    words = str(text or "").replace("\n", " ").split()
    lines: list[str] = []
    line = ""

    for word in words:
        test = f"{line} {word}".strip()
        if c.stringWidth(test, font, size) <= width:
            line = test
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)

    if max_lines is not None and len(lines) > max_lines:
        lines = lines[:max_lines]
        if lines:
            lines[-1] = lines[-1][: max(0, len(lines[-1]) - 3)].rstrip() + "..."

    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def _section_header(c: canvas.Canvas, number: str, title: str, x: float, y: float, w: float, h: float = 17) -> None:
    c.setFillColor(BLUE)
    c.rect(x, y - h, w, h, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 8.8)
    c.drawString(x + 6, y - 11.5, f"{number}. {title.upper()}")


def _draw_table(
    c: canvas.Canvas,
    rows: list[list[Any]],
    x: float,
    y_top: float,
    w: float,
    row_h: float = 20,
    label_w: float | None = None,
    value_dot_rows: dict[int, Any] | None = None,
    font_size: float = 8.1,
) -> float:
    """Draw key-value table. Returns bottom y."""
    if label_w is None:
        label_w = w * 0.43
    value_dot_rows = value_dot_rows or {}

    table_h = row_h * len(rows)
    c.setStrokeColor(LIGHT_BORDER)
    c.setLineWidth(0.6)
    c.rect(x, y_top - table_h, w, table_h, stroke=1, fill=0)

    for idx, row in enumerate(rows):
        y = y_top - row_h * (idx + 1)
        if idx % 2 == 0:
            c.setFillColor(colors.HexColor("#FBFDFF"))
            c.rect(x, y, w, row_h, stroke=0, fill=1)

        c.setStrokeColor(LIGHT_BORDER)
        c.line(x, y, x + w, y)
        c.line(x + label_w, y, x + label_w, y + row_h)

        label = _safe(row[0], "")
        value = _safe(row[1], "")

        c.setFillColor(TEXT)
        c.setFont("Helvetica-Bold", font_size)
        c.drawString(x + 5, y + row_h - 13, label)

        c.setFont("Helvetica", font_size)
        c.setFillColor(TEXT)
        max_value_width = w - label_w - 24
        value_text = value
        while c.stringWidth(value_text, "Helvetica", font_size) > max_value_width and len(value_text) > 5:
            value_text = value_text[:-5].rstrip() + "..."
        c.drawString(x + label_w + 5, y + row_h - 13, value_text)

        if idx in value_dot_rows:
            c.setFillColor(value_dot_rows[idx])
            c.circle(x + w - 8, y + row_h / 2, 3.2, stroke=0, fill=1)

    return y_top - table_h


def _draw_image_box(
    c: canvas.Canvas,
    image_path: str | None,
    x: float,
    y: float,
    w: float,
    h: float,
    placeholder: str = "Image evidence not available",
) -> None:
    c.setStrokeColor(LIGHT_BORDER)
    c.setLineWidth(0.7)
    c.rect(x, y, w, h, stroke=1, fill=0)

    if not image_path:
        c.setFillColor(colors.HexColor("#F3F4F6"))
        c.rect(x + 1, y + 1, w - 2, h - 2, stroke=0, fill=1)
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(x + w / 2, y + h / 2 + 8, placeholder)
        c.setFont("Helvetica", 8)
        c.drawCentredString(x + w / 2, y + h / 2 - 6, "Processed preview will appear when local image path is available")
        return

    try:
        img = ImageReader(image_path)
        iw, ih = img.getSize()
        ratio = min(w / iw, h / ih)
        draw_w = iw * ratio
        draw_h = ih * ratio
        draw_x = x + (w - draw_w) / 2
        draw_y = y + (h - draw_h) / 2
        c.drawImage(img, draw_x, draw_y, draw_w, draw_h, preserveAspectRatio=True, mask="auto")
    except Exception:
        c.setFillColor(colors.HexColor("#F3F4F6"))
        c.rect(x + 1, y + 1, w - 2, h - 2, stroke=0, fill=1)
        c.setFillColor(MUTED)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(x + w / 2, y + h / 2, "Image could not be embedded")


def _draw_scale_marker(c: canvas.Canvas, x: float, y: float) -> None:
    c.setStrokeColor(colors.black)
    c.setLineWidth(1.2)
    c.line(x, y, x + 34, y)
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(colors.black)
    c.drawRightString(x + 34, y + 5, "200 um")


def _draw_bullet(c: canvas.Canvas, text: str, x: float, y: float, w: float) -> float:
    c.setFillColor(BLUE)
    c.circle(x + 3, y + 3, 2.1, stroke=0, fill=1)
    return _draw_wrapped_text(c, text, x + 11, y, w - 12, size=8.0, leading=10.2, max_lines=2)


def _draw_small_info_panel(c: canvas.Canvas, title: str, lines: list[str], x: float, y_top: float, w: float, h: float) -> None:
    c.setFillColor(SOFT_BLUE)
    c.setStrokeColor(LIGHT_BORDER)
    c.setLineWidth(0.6)
    c.rect(x, y_top - h, w, h, stroke=1, fill=1)
    c.setFillColor(DARK_BLUE)
    c.setFont("Helvetica-Bold", 8.2)
    c.drawString(x + 6, y_top - 12, title)
    y = y_top - 27
    for line in lines:
        y = _draw_bullet(c, line, x + 6, y, w - 12)
        y -= 1


def _particle_breakdown(sample) -> list[tuple[str, int, Any]]:
    """Create particle evidence legend from available particle features."""
    particles = list(getattr(sample, "particles", []) or [])
    counter = Counter()

    for particle in particles:
        category = (
            getattr(particle, "shape_category", None)
            or getattr(particle, "size_category", None)
            or getattr(particle, "candidate_type", None)
            or "Candidate"
        )
        counter[str(category)] += 1

    if not counter:
        accepted = getattr(sample, "accepted_detection_count", None)
        rejected = getattr(sample, "rejected_detection_count", None)
        raw = getattr(sample, "raw_detection_count", None)
        if accepted is not None:
            counter["Accepted candidates"] = int(accepted or 0)
        if rejected is not None:
            counter["Rejected candidates"] = int(rejected or 0)
        if raw is not None and not counter:
            counter["Raw detections"] = int(raw or 0)

    if not counter:
        detected = int(getattr(sample, "detected_particles", 0) or 0)
        counter["Detected candidates"] = detected

    palette = [
        colors.HexColor("#3B82F6"),
        colors.HexColor("#10B981"),
        colors.HexColor("#8B5CF6"),
        colors.HexColor("#F59E0B"),
        colors.HexColor("#EF4444"),
        colors.HexColor("#64748B"),
    ]

    return [(name, count, palette[i % len(palette)]) for i, (name, count) in enumerate(counter.most_common(5))]


# -----------------------------------------------------------------------------
# Main public function
# -----------------------------------------------------------------------------

def generate_sample_report(sample) -> Path:
    """
    Generate a full-page PDF report for a Sample SQLAlchemy object.

    Args:
        sample: SQLAlchemy Sample object.

    Returns:
        Path to generated PDF report.
    """
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = REPORTS_DIR / f"microsense_sample_{sample.id}_{timestamp}.pdf"

    c = canvas.Canvas(str(report_path), pagesize=A4)
    c.setTitle(f"MicroSense AI-Cam Sample Analysis Report - Sample {sample.id}")

    margin = 14 * mm
    content_x = margin
    content_w = PAGE_W - 2 * margin
    top_y = PAGE_H - 10 * mm
    bottom_y = 12 * mm

    # Outer page border
    c.setStrokeColor(colors.black)
    c.setLineWidth(1.1)
    c.rect(margin - 6, bottom_y - 4, content_w + 12, PAGE_H - bottom_y - 8, stroke=1, fill=0)

    # Header
    c.setFont("Helvetica-Bold", 18.5)
    c.setFillColor(DARK_BLUE)
    c.drawCentredString(PAGE_W / 2, top_y - 3, "MicroSense AI-Cam Sample Analysis Report")
    c.setStrokeColor(BLUE)
    c.setLineWidth(1.1)
    c.line(content_x, top_y - 14, content_x + content_w, top_y - 14)

    generated_at = datetime.now().strftime("%b %d, %Y %I:%M %p")
    c.setFont("Helvetica-Bold", 7.6)
    c.setFillColor(TEXT)
    c.drawRightString(content_x + content_w, top_y - 28, "Report Generated:")
    c.setFont("Helvetica", 7.6)
    c.drawRightString(content_x + content_w, top_y - 39, generated_at)

    # Layout columns
    gap = 10
    col_w = (content_w - gap) / 2
    left_x = content_x
    right_x = content_x + col_w + gap

    section_y = top_y - 53

    # 1. Sample Information
    _section_header(c, "1", "Sample Information", left_x, section_y, col_w)
    sample_rows = [
        ["Sample ID", f"MSC-{_safe(getattr(sample, 'id', None)).zfill(3)}"],
        ["Sample Source", _safe(getattr(sample, "sample_source", None))],
        ["Chamber Volume", f"{_num(getattr(sample, 'chamber_volume_ml', None), 1)} mL"],
        ["Analysis Date", _safe(getattr(sample, "created_at", None).strftime("%b %d, %Y %I:%M %p") if getattr(sample, "created_at", None) else generated_at)],
        ["Detection Model", "YOLO26n + Hybrid Filter"],
        ["File Type", _safe(getattr(sample, "file_type", None), "image")],
        ["Sample Notes", _safe(getattr(sample, "notes", None), "Routine screening sample")],
    ]
    sample_bottom = _draw_table(c, sample_rows, left_x, section_y - 17, col_w, row_h=22, label_w=92, font_size=8.0)

    # 2. Results Summary
    _section_header(c, "2", "Results Summary", right_x, section_y, col_w)

    risk_level = _safe(getattr(sample, "monitoring_risk_level", None))
    quality_status = _safe(getattr(sample, "image_quality_status", None), "Good")
    quality_warning = _safe(getattr(sample, "quality_warning", None), "None")
    recommendation = _recommendation_status(getattr(sample, "recommendation", None))

    detected = getattr(sample, "accepted_detection_count", None)
    if detected is None:
        detected = getattr(sample, "detected_particles", None)

    result_rows = [
        ["Detected Candidates", f"{_safe(detected)} particles"],
        ["Estimated Concentration", f"{_num(getattr(sample, 'estimated_particles_per_litre', None), 2)} particles/L"],
        ["MSMI Score", _score_1(getattr(sample, "msmi_score", None) if getattr(sample, "msmi_score", None) is not None else getattr(sample, "mpi_score", None))],
        ["Confidence Score", _score_1(getattr(sample, "confidence_score", None))],
        ["Hybrid Validation", _score_1(getattr(sample, "hybrid_filter_score", None))],
        ["Image Quality", quality_status],
        ["Quality Warning", quality_warning],
        ["Monitoring Risk", risk_level],
        ["Recommendation", recommendation],
    ]
    dot_rows = {
        2: GREEN,
        3: GREEN,
        4: GREEN,
        5: _quality_dot_color(quality_status),
        6: GREEN if str(quality_warning).lower() in ["", "none", "null"] else YELLOW,
        7: _risk_dot_color(risk_level),
        8: BLUE,
    }
    result_bottom = _draw_table(c, result_rows, right_x, section_y - 17, col_w, row_h=17.1, label_w=105, value_dot_rows=dot_rows, font_size=7.7)

    # 3. Processed Image Evidence
    evidence_y = min(sample_bottom, result_bottom) - 15
    _section_header(c, "3", "Processed Image Evidence", left_x, evidence_y, content_w)

    processed_image_path = _resolve_local_image_path(getattr(sample, "processed_file_path", None))
    original_image_path = _resolve_local_image_path(getattr(sample, "original_file_path", None))
    evidence_image_path = processed_image_path or original_image_path

    img_x = left_x
    img_y = evidence_y - 17 - 172
    img_w = col_w
    img_h = 172
    _draw_image_box(c, evidence_image_path, img_x, img_y, img_w, img_h)
    _draw_scale_marker(c, img_x + img_w - 52, img_y + 12)

    # Candidate legend / breakdown
    legend_x = right_x
    legend_top = evidence_y - 20
    c.setFont("Helvetica-Bold", 9.4)
    c.setFillColor(TEXT)
    c.drawString(legend_x, legend_top, f"Detected Candidate Particles: {_safe(detected, '0')}")

    y = legend_top - 18
    breakdown = _particle_breakdown(sample)
    for label, count, swatch in breakdown:
        c.setStrokeColor(swatch)
        c.setLineWidth(2.4)
        c.line(legend_x, y + 5, legend_x + 18, y + 5)
        c.setFillColor(TEXT)
        c.setFont("Helvetica", 8.4)
        label_text = label if len(label) <= 28 else label[:25] + "..."
        c.drawString(legend_x + 24, y + 1, label_text)
        c.drawRightString(legend_x + col_w - 4, y + 1, f"({count})")
        y -= 15

    # Additional content block to fill page professionally
    panel_y_top = img_y + 62
    _draw_small_info_panel(
        c,
        "AI Screening Method",
        [
            "YOLO26n detection identifies visible candidate particles from the optical image.",
            "Hybrid validation checks shape, contrast, edge clarity, brightness, and particle size consistency.",
            "MSMI and risk level provide a preliminary monitoring interpretation for the sample.",
        ],
        legend_x,
        panel_y_top,
        col_w,
        92,
    )

    # 4. Interpretation and Limitation
    # Placed lower to avoid crowding the evidence panel and to use the full page height.
    interpretation_y = img_y - 55
    _section_header(c, "4", "Interpretation and Limitation", left_x, interpretation_y, content_w)

    interpretation_text = (
        "The uploaded water sample contains visually detected microplastic-like particle candidates. "
        "The result is calculated from optical image evidence, accepted detections, estimated concentration, "
        "image quality, and hybrid validation. This report can support rapid preliminary screening, sample "
        "comparison, and routine monitoring decisions."
    )
    y = _draw_wrapped_text(c, interpretation_text, left_x + 5, interpretation_y - 30, content_w - 10, size=8.7, leading=11.2, max_lines=4)

    disclaimer_text = (
        "Disclaimer: MicroSense AI-Cam does not perform chemical polymer identification and does not replace "
        "FTIR spectroscopy, Raman spectroscopy, or certified laboratory analysis. Confirmatory testing by an "
        "accredited laboratory is required for material identification, official reporting, or regulatory compliance."
    )
    y = _draw_wrapped_text(c, disclaimer_text, left_x + 5, y - 3, content_w - 10, size=8.3, leading=10.8, max_lines=4)

    # 5. Monitoring Notes
    notes_y = y - 10
    _section_header(c, "5", "Monitoring Notes", left_x, notes_y, content_w)
    notes_text = (
        "Recommended use: compare repeated samples from the same source, track changes in accepted candidate "
        "counts, review MSMI trends, and preserve the generated PDF as supporting screening documentation. "
        "For high-risk or unusual readings, repeat imaging under consistent lighting and proceed with confirmatory analysis."
    )
    notes_bottom = _draw_wrapped_text(c, notes_text, left_x + 5, notes_y - 30, content_w - 10, size=8.4, leading=10.8, max_lines=4)

    # 6. Output Checklist
    checklist_y = notes_bottom - 8
    _section_header(c, "6", "Output Checklist", left_x, checklist_y, content_w)
    box_gap = 8
    box_w = (content_w - 2 * box_gap) / 3
    box_h = 47
    checklist_items = [
        ("Screening Completed", "AI-assisted optical analysis completed for the uploaded sample."),
        ("Report Archived", "PDF can be stored with sample history for later review."),
        ("Further Action", "Repeat imaging or confirm through laboratory analysis when required."),
    ]
    for i, (title, body) in enumerate(checklist_items):
        bx = left_x + i * (box_w + box_gap)
        by_top = checklist_y - 20
        c.setFillColor(SOFT_BG)
        c.setStrokeColor(LIGHT_BORDER)
        c.rect(bx, by_top - box_h, box_w, box_h, stroke=1, fill=1)
        c.setFillColor(BLUE)
        c.circle(bx + 9, by_top - 13, 3, stroke=0, fill=1)
        c.setFont("Helvetica-Bold", 7.8)
        c.setFillColor(TEXT)
        c.drawString(bx + 17, by_top - 16, title)
        _draw_wrapped_text(c, body, bx + 8, by_top - 31, box_w - 16, size=7.3, leading=9.2, max_lines=2)

    # Footer
    c.setStrokeColor(BLUE)
    c.setLineWidth(0.8)
    c.line(content_x, bottom_y + 14, content_x + content_w, bottom_y + 14)
    c.setFont("Helvetica-Bold", 7.2)
    c.setFillColor(BLUE)
    c.drawString(content_x, bottom_y + 3, "MicroSense AI-Cam | AI-assisted optical monitoring report")
    c.drawRightString(content_x + content_w, bottom_y + 3, "Page 1 of 1")

    c.showPage()
    c.save()

    return report_path
