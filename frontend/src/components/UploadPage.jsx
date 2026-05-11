import { useState } from "react";
import {
  Upload,
  Image as ImageIcon,
  ArrowLeft,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  BarChart3,
  Activity,
  Droplets,
  ShieldCheck,
  Eye,
  Microscope,
  Gauge,
  Sparkles,
  AlertTriangle,
  Waves,
} from "lucide-react";
import { Link } from "react-router-dom";
import { analyzeSample, getMediaUrl } from "../api";

const formatValue = (value, suffix = "") => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    const formatted = Number.isInteger(value) ? value : value.toFixed(2);
    return `${formatted}${suffix}`;
  }
  return `${value}${suffix}`;
};

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sampleSource, setSampleSource] = useState("Tap Water");
  const [chamberVolumeMl, setChamberVolumeMl] = useState(50);
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const formatDate = (dt) => {
    if (!dt) return "—";

    return new Date(dt).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRiskStyle = (risk) => {
    const value = String(risk || "").toLowerCase();

    if (value.includes("low")) {
      return {
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        card: "border-emerald-200 bg-emerald-50",
        dot: "bg-emerald-500",
      };
    }

    if (value.includes("moderate")) {
      return {
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        card: "border-amber-200 bg-amber-50",
        dot: "bg-amber-500",
      };
    }

    if (value.includes("high")) {
      return {
        badge: "bg-red-50 text-red-700 border-red-200",
        card: "border-red-200 bg-red-50",
        dot: "bg-red-500",
      };
    }

    if (value.includes("critical")) {
      return {
        badge: "bg-purple-50 text-purple-700 border-purple-200",
        card: "border-purple-200 bg-purple-50",
        dot: "bg-purple-500",
      };
    }

    return {
      badge: "bg-slate-50 text-slate-700 border-slate-200",
      card: "border-slate-200 bg-slate-50",
      dot: "bg-slate-400",
    };
  };

  const getQualityStyle = (status) => {
    const value = String(status || "").toLowerCase();

    if (value.includes("good")) {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (value.includes("acceptable")) {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (value.includes("poor")) {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-slate-200 bg-slate-50 text-slate-700";
  };

  const resetForm = () => {
    setFile(null);
    setPreviewUrl("");
    setResult(null);
    setError("");
    setSuccessMessage("");
    setNotes("");
    setSampleSource("Tap Water");
    setChamberVolumeMl(50);
  };

  const handleFile = (selectedFile) => {
    setError("");
    setSuccessMessage("");
    setResult(null);

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleFileInput = (event) => {
    const selectedFile = event.target.files?.[0];
    handleFile(selectedFile);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const selectedFile = event.dataTransfer.files?.[0];
    handleFile(selectedFile);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateForm = () => {
    if (!file) return "Please select or drop a sample image.";
    if (!sampleSource.trim()) return "Sample source is required.";

    const volume = Number(chamberVolumeMl);
    if (!volume || volume <= 0) return "Chamber volume must be greater than 0.";

    return "";
  };

  const handleAnalyze = async (event) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsAnalyzing(true);
      setError("");
      setSuccessMessage("");
      setResult(null);

      const data = await analyzeSample({
        file,
        sampleSource,
        chamberVolumeMl,
        notes,
      });

      setResult(data);
      setSuccessMessage("Analysis completed and stored in database.");
    } catch (err) {
      setError(err?.message || "Failed to analyze image. Make sure the FastAPI backend is reachable.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const riskStyle = getRiskStyle(result?.monitoring_risk_level);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-teal-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-sm">
              <Droplets className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-950">Manual Sample Upload</h1>
              <p className="text-sm text-slate-500">
                AI detection, MSMI scoring, source weighting and image-quality validation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:text-cyan-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>

            <Link
              to="/history"
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-700"
            >
              <Database className="h-4 w-4" />
              View History
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-3xl border border-cyan-100 bg-white/90 p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                <Sparkles className="h-4 w-4" />
                Phase 1A Research Mode
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                Analyze a water sample image manually
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                The backend now combines YOLOv5 detection, MicroSense Monitoring Index,
                source-based risk weighting and image quality validation. The score is a
                prototype monitoring index, not a certified health safety result.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <FeaturePill icon={<Database className="h-5 w-5" />} title="Database enabled" text="Every result is stored and available in History." />
              <FeaturePill icon={<Microscope className="h-5 w-5" />} title="Quality-aware AI" text="Poor focus, darkness and exposure are now reported." />
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Analysis error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Success</p>
              <p className="text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={handleAnalyze} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-950">Upload sample image</h3>
              <p className="mt-1 text-sm text-slate-500">Select a microscope/camera image of the water sample.</p>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-6 text-center transition ${
                isDragging
                  ? "border-cyan-400 bg-cyan-50"
                  : "border-slate-200 bg-slate-50 hover:border-cyan-300 hover:bg-cyan-50/50"
              }`}
            >
              <input type="file" accept="image/*" onChange={handleFileInput} className="absolute inset-0 cursor-pointer opacity-0" />

              {previewUrl ? (
                <div className="w-full">
                  <img src={previewUrl} alt="Selected sample preview" className="mx-auto max-h-72 rounded-2xl border border-slate-200 object-contain shadow-sm" />
                  <p className="mt-4 text-sm font-medium text-slate-700">{file?.name}</p>
                  <p className="mt-1 text-xs text-slate-500">Click or drop another image to replace this sample.</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-100 text-cyan-700">
                    <Upload className="h-8 w-8" />
                  </div>
                  <p className="text-base font-semibold text-slate-900">Drop image here or click to browse</p>
                  <p className="mt-2 text-sm text-slate-500">Supports JPG, PNG, JPEG and other browser-supported image formats.</p>
                </>
              )}
            </div>

            <div className="mt-6 grid gap-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Sample Source</label>
                <input
                  value={sampleSource}
                  onChange={(event) => setSampleSource(event.target.value)}
                  placeholder="Example: Tap Water, Lake Water"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Chamber Volume (mL)</label>
                <input
                  type="number"
                  min="1"
                  value={chamberVolumeMl}
                  onChange={(event) => setChamberVolumeMl(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional notes about the sample..."
                  rows="4"
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isAnalyzing}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Analyzing with YOLO...
                  </>
                ) : (
                  <>
                    <Activity className="h-5 w-5" />
                    Analyze with YOLO
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={isAnalyzing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RotateCcw className="h-5 w-5" />
                Reset
              </button>
            </div>
          </form>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {!result ? (
              <div className="flex min-h-full flex-col items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-slate-500 shadow-sm">
                  <ImageIcon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-950">Result preview</h3>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  After analysis, the original image, processed image, MSMI score, source risk and image quality metrics will appear here.
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-950">Analysis Result</h3>
                    <p className="mt-1 text-sm text-slate-500">Stored in database on {formatDate(result.created_at)}</p>
                  </div>

                  <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${riskStyle.badge}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${riskStyle.dot}`} />
                    {result.monitoring_risk_level || "Unknown"}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ImageCard title="Original Image" imageUrl={getMediaUrl(result.original_image_url)} />
                  <ImageCard title="Processed Image" imageUrl={getMediaUrl(result.processed_image_url)} />
                </div>

                <div className="mt-6 rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-cyan-700">MicroSense Monitoring Index</p>
                      <h4 className="mt-1 text-xl font-black text-slate-950">MSMI: {formatValue(result.msmi_score ?? result.mpi_score)}</h4>
                    </div>
                    <Gauge className="h-9 w-9 text-cyan-700" />
                  </div>
                  <p className="text-sm leading-6 text-slate-700">
                    {result.risk_explanation || "MSMI combines particle concentration, particle count, particle area, confidence, image quality and source risk weighting."}
                  </p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <MetricCard icon={<Gauge className="h-5 w-5" />} label="MSMI Score" value={result.msmi_score ?? result.mpi_score} highlight />
                  <MetricCard icon={<Activity className="h-5 w-5" />} label="Detected Particles" value={result.detected_particles} />
                  <MetricCard icon={<Droplets className="h-5 w-5" />} label="Particles / Litre" value={result.estimated_particles_per_litre} />
                  <MetricCard icon={<BarChart3 className="h-5 w-5" />} label="MPI Score" value={result.mpi_score} />
                  <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Confidence" value={formatValue(result.confidence_score, "%")} />
                  <MetricCard icon={<Waves className="h-5 w-5" />} label="Source Factor" value={result.source_risk_factor} />
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <Panel title="Image Quality Validation" icon={<Microscope className="h-5 w-5" />}>
                    <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-bold ${getQualityStyle(result.image_quality_status)}`}>
                      Status: {result.image_quality_status || "Unknown"} · Score: {formatValue(result.image_quality_score)}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoRow label="Focus Score" value={formatValue(result.focus_score)} />
                      <InfoRow label="Brightness Score" value={formatValue(result.brightness_score)} />
                      <InfoRow label="Contrast Score" value={formatValue(result.contrast_score)} />
                      <InfoRow label="Underexposed" value={formatValue(result.underexposed_percent, "%")} />
                      <InfoRow label="Overexposed" value={formatValue(result.overexposed_percent, "%")} />
                      <InfoRow label="Avg Brightness" value={formatValue(result.average_brightness)} />
                    </div>
                    {result.quality_warning && (
                      <div className="mt-4 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>{result.quality_warning}</p>
                      </div>
                    )}
                  </Panel>

                  <Panel title="Source-Aware Risk" icon={<ShieldCheck className="h-5 w-5" />}>
                    <div className="grid gap-3">
                      <InfoRow label="Sample Source" value={result.sample_source} />
                      <InfoRow label="Source Risk Factor" value={result.source_risk_factor} />
                      <InfoRow label="Concentration-only Risk" value={result.concentration_only_risk_level} />
                      <InfoRow label="Final MSMI Risk" value={result.monitoring_risk_level} />
                      <InfoRow label="Concentration Score" value={result.concentration_score} />
                      <InfoRow label="Size Score" value={result.size_score} />
                    </div>
                  </Panel>
                </div>

                <div className={`mt-6 rounded-3xl border p-5 ${riskStyle.card}`}>
                  <p className="text-sm font-bold text-slate-900">Recommendation</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{result.recommendation || "No recommendation available."}</p>
                </div>

                <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="grid gap-4 text-sm sm:grid-cols-2">
                    <InfoRow label="Sample ID" value={result.id} />
                    <InfoRow label="Chamber Volume" value={`${result.chamber_volume_ml} mL`} />
                    <InfoRow label="Size Category" value={result.size_category} />
                    <InfoRow label="Avg. Area" value={formatValue(result.average_particle_area, " px²")} />
                    <InfoRow label="File Type" value={result.file_type} />
                    <InfoRow label="Notes" value={result.notes || "—"} />
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link to="/history" className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-700">
                    <Database className="h-5 w-5" />
                    View in History
                  </Link>

                  <button type="button" onClick={resetForm} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:text-cyan-700">
                    <RotateCcw className="h-5 w-5" />
                    Analyze Another Sample
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function FeaturePill({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white p-2 text-cyan-700 shadow-sm">{icon}</div>
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{text}</p>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-xl bg-cyan-50 p-2 text-cyan-700">{icon}</div>
        <p className="text-sm font-bold text-slate-950">{title}</p>
      </div>
      {children}
    </div>
  );
}

function MetricCard({ icon, label, value, highlight = false }) {
  return (
    <div className={`rounded-3xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${highlight ? "border-cyan-200 bg-cyan-50" : "border-slate-200 bg-white"}`}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-cyan-700 shadow-sm">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{value ?? "—"}</p>
    </div>
  );
}

function ImageCard({ title, imageUrl }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <p className="text-sm font-bold text-slate-900">{title}</p>
      </div>

      <div className="flex min-h-56 items-center justify-center p-3">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="max-h-72 rounded-2xl object-contain" />
        ) : (
          <p className="text-sm text-slate-500">Image not available</p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value ?? "—"}</p>
    </div>
  );
}
