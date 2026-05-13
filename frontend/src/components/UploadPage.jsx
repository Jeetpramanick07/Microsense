import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Upload, Image as ImageIcon, ArrowLeft, Database, CheckCircle2, AlertCircle, Loader2,
  RotateCcw, BarChart3, Activity, Droplets, ShieldCheck, Microscope, Gauge, Sparkles,
  AlertTriangle, Waves, Cpu, CheckCircle, XCircle, Camera, ScanLine, Eye, Zap
} from "lucide-react";
import { analyzeSample, getMediaUrl, getDetectorLabel } from "../api";

const formatValue = (value, suffix = "") => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return `${Number.isInteger(value) ? value : value.toFixed(2)}${suffix}`;
  return `${value}${suffix}`;
};

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [sampleSource, setSampleSource] = useState("Tap Water");
  const [chamberVolumeMl, setChamberVolumeMl] = useState(50);
  const [notes, setNotes] = useState("");
  const [detectorModel, setDetectorModel] = useState("yolo26");
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const resetForm = () => {
    setFile(null); setPreviewUrl(""); setResult(null); setError(""); setSuccessMessage("");
    setNotes(""); setSampleSource("Tap Water"); setChamberVolumeMl(50); setDetectorModel("yolo26");
  };

  const handleFile = (selectedFile) => {
    setError(""); setSuccessMessage(""); setResult(null);
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) { setError("Please select a valid image file."); return; }
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleAnalyze = async (event) => {
    event.preventDefault();
    if (!file) return setError("Please select or drop a sample image.");
    if (!sampleSource.trim()) return setError("Sample source is required.");
    if (!Number(chamberVolumeMl) || Number(chamberVolumeMl) <= 0) return setError("Chamber volume must be greater than 0.");
    try {
      setIsAnalyzing(true); setError(""); setSuccessMessage(""); setResult(null);
      const data = await analyzeSample({ file, sampleSource, chamberVolumeMl, notes, detectorModel });
      setResult(data);
      setSuccessMessage(detectorModel === "yolo26" ? "Analysis completed with YOLO26n Main Detector." : "Baseline analysis completed with YOLOv5.");
    } catch (err) {
      setError(err?.message || "Failed to analyze image. Make sure the FastAPI backend is reachable.");
    } finally { setIsAnalyzing(false); }
  };

  const detectorLabel = result ? getDetectorLabel(result) : (detectorModel === "yolo26" ? "YOLO26n Main Detector" : "YOLOv5 Baseline");

  return (
    <div className="relative min-h-screen overflow-hidden text-slate-900">
      <div className="pointer-events-none absolute left-[-6rem] top-20 hidden h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl float-slow sm:block" />
      <div className="pointer-events-none absolute right-[-4rem] top-72 hidden h-96 w-96 rounded-full bg-teal-200/30 blur-3xl float-delayed sm:block" />

      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <section className="mb-8 overflow-hidden rounded-3xl border border-cyan-100 bg-white/80 p-4 shadow-2xl shadow-cyan-100/60 backdrop-blur-2xl sm:rounded-[2rem] sm:p-8 soft-grid">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
            <div className="animate-slide-up">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-700">
                <Sparkles className="h-4 w-4" /> Live Analysis Workspace
              </div>
              <h1 className="text-[2rem] font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">Upload a water sample image</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                Run YOLO26n main detection, hybrid AI validation, image-quality checks and source-aware MSMI scoring in one smooth workflow.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-cyan-700"><ArrowLeft className="h-4 w-4"/> Dashboard</Link>
                <Link to="/history" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-cyan-200 transition hover:-translate-y-0.5"><Database className="h-4 w-4"/> History</Link>
              </div>
            </div>
            <div className="glass-card rounded-[2rem] p-5 scan-line animate-scale-in stagger-2">
              <div className="grid grid-cols-3 gap-3">
                <PulseMetric icon={Cpu} label="Detector" value="YOLO26n" />
                <PulseMetric icon={ShieldCheck} label="Hybrid" value="Active" />
                <PulseMetric icon={Gauge} label="MSMI" value="Ready" />
              </div>
              <div className="mt-4 rounded-3xl border border-cyan-100 bg-cyan-50/70 p-4 text-sm leading-7 text-slate-600">
                Detections are microplastic-like particle candidates for prototype monitoring, not certified polymer identification.
              </div>
            </div>
          </div>
        </section>

        {error && <AlertBox type="error" title="Analysis error" message={error} />}
        {successMessage && <AlertBox type="success" title="Success" message={successMessage} />}

        <div className="grid gap-8 lg:grid-cols-[.92fr_1.08fr]">
          <form onSubmit={handleAnalyze} className="glass-card rounded-3xl p-4 sm:rounded-[2rem] sm:p-6">
            <div className="mb-6 flex items-center gap-3"><div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700"><Camera className="h-6 w-6"/></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Input Chamber</p><h2 className="text-2xl font-black text-slate-950">Sample setup</h2></div></div>

            <div onDrop={(e)=>{e.preventDefault();setIsDragging(false);handleFile(e.dataTransfer.files?.[0]);}} onDragOver={(e)=>{e.preventDefault();setIsDragging(true);}} onDragLeave={()=>setIsDragging(false)} className={`relative flex min-h-56 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed p-4 text-center transition sm:min-h-72 sm:rounded-[2rem] sm:p-6 ${isDragging ? "border-cyan-400 bg-cyan-50" : "border-cyan-100 bg-white/70 hover:border-cyan-300 hover:bg-cyan-50/50"}`}>
              <input type="file" accept="image/*" onChange={(e)=>handleFile(e.target.files?.[0])} className="absolute inset-0 cursor-pointer opacity-0" />
              {previewUrl ? <div className="w-full animate-scale-in"><img src={previewUrl} alt="Selected sample" className="mx-auto max-h-56 rounded-2xl border border-slate-200 object-contain shadow-xl sm:max-h-80 sm:rounded-3xl"/><p className="mt-4 text-sm font-black text-slate-800">{file?.name}</p><p className="mt-1 text-xs text-slate-500">Drop or click to replace this image.</p></div> : <><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-xl shadow-cyan-200 sm:h-20 sm:w-20 sm:rounded-[2rem]"><Upload className="h-9 w-9"/></div><p className="text-base font-black text-slate-950 sm:text-lg">Drop sample image here</p><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">or click to browse JPG, PNG or JPEG optical sample images.</p></>}
            </div>

            <div className="mt-6">
              <label className="mb-3 block text-sm font-black text-slate-800">Detection Engine</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <EngineButton active={detectorModel === "yolo26"} onClick={()=>setDetectorModel("yolo26")} icon={Cpu} title="YOLO26n Main Detector" text="Default cleaner detection pipeline" />
                <EngineButton active={detectorModel === "yolov5"} onClick={()=>setDetectorModel("yolov5")} icon={BarChart3} title="YOLOv5 Baseline" text="Legacy route for comparison" muted />
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              <Field label="Sample Source"><input value={sampleSource} onChange={(e)=>setSampleSource(e.target.value)} className="input-dynamic" placeholder="Tap Water, Lake Water..." /></Field>
              <Field label="Chamber Volume (mL)"><input type="number" min="1" value={chamberVolumeMl} onChange={(e)=>setChamberVolumeMl(e.target.value)} className="input-dynamic" /></Field>
              <Field label="Notes"><textarea value={notes} onChange={(e)=>setNotes(e.target.value)} rows="4" className="input-dynamic resize-none" placeholder="Optional sample notes..." /></Field>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={isAnalyzing} className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 px-5 py-3.5 text-sm font-black text-white shadow-xl shadow-cyan-200 transition hover:-translate-y-1 disabled:opacity-70">
                {isAnalyzing ? <><Loader2 className="h-5 w-5 animate-spin"/> {detectorModel === "yolo26" ? "Analyzing with YOLO26n..." : "Analyzing with YOLOv5..."}</> : <><Activity className="h-5 w-5"/> {detectorModel === "yolo26" ? "Analyze with YOLO26n" : "Analyze with YOLOv5"}</>}
              </button>
              <button type="button" onClick={resetForm} disabled={isAnalyzing} className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-1 hover:text-cyan-700"><RotateCcw className="h-5 w-5"/> Reset</button>
            </div>
          </form>

          <section className="glass-card rounded-3xl p-4 sm:rounded-[2rem] sm:p-6">
            {!result ? <EmptyResult /> : <ResultView result={result} detectorLabel={detectorLabel} />}
          </section>
        </div>
      </main>
    </div>
  );
}

function ResultView({ result, detectorLabel }) {
  return <div className="animate-slide-up">
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">Analysis Result</p><h3 className="mt-1 text-2xl font-black text-slate-950">Prototype monitoring output</h3></div><RiskPill risk={result.monitoring_risk_level}/></div>
    <div className="mb-6 rounded-[2rem] border border-cyan-100 bg-cyan-50/70 p-5"><div className="flex items-start gap-3"><div className="rounded-2xl bg-white p-3 text-cyan-700 shadow-sm"><Cpu className="h-6 w-6"/></div><div><p className="text-xs font-black uppercase tracking-widest text-cyan-700">Detection Engine</p><h4 className="mt-1 text-xl font-black text-slate-950">{detectorLabel}</h4><p className="mt-2 text-sm leading-6 text-slate-600">YOLO26n is the main detector. YOLOv5 is retained as a baseline comparison route.</p></div></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><ImageCard title="Original Image" imageUrl={getMediaUrl(result.original_image_url)} /><ImageCard title="Processed Image" imageUrl={getMediaUrl(result.processed_image_url)} /></div>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><MetricCard icon={Gauge} label="MSMI Score" value={result.msmi_score ?? result.mpi_score} highlight/><MetricCard icon={Activity} label="Detected Candidates" value={result.detected_particles}/><MetricCard icon={Droplets} label="Particles / Litre" value={result.estimated_particles_per_litre}/><MetricCard icon={BarChart3} label="MPI Score" value={result.mpi_score}/><MetricCard icon={ShieldCheck} label="Confidence" value={formatValue(result.confidence_score, "%")}/><MetricCard icon={Waves} label="Source Factor" value={result.source_risk_factor}/></div>
    <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white/80 p-5"><div className="mb-4 flex items-center gap-2"><div className="rounded-xl bg-cyan-50 p-2 text-cyan-700"><ShieldCheck className="h-5 w-5"/></div><p className="text-sm font-black text-slate-950">Hybrid AI Validation</p></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><ValidationBox label="Raw" value={result.raw_detection_count}/><ValidationBox label="Accepted" value={result.accepted_detection_count} tone="emerald" icon={<CheckCircle className="h-4 w-4"/>}/><ValidationBox label="Rejected" value={result.rejected_detection_count} tone="rose" icon={<XCircle className="h-4 w-4"/>}/><ValidationBox label="Hybrid" value={result.hybrid_filter_score} tone="cyan"/></div>{result.filter_summary && <p className="mt-4 rounded-2xl bg-cyan-50 p-3 text-sm leading-6 text-cyan-900">{result.filter_summary}</p>}<p className="mt-3 text-xs leading-5 text-slate-500">Hybrid validation checks whether detected objects are visually particle-like using contrast, edge boundary, compactness and area. It does not chemically confirm polymer composition.</p></div>
    <div className="mt-6 grid gap-4 lg:grid-cols-2"><Panel title="Image Quality Validation" icon={<Microscope className="h-5 w-5"/>}><InfoRow label="Status" value={`${result.image_quality_status || "Unknown"} · ${formatValue(result.image_quality_score)}`}/><InfoRow label="Focus" value={formatValue(result.focus_score)}/><InfoRow label="Brightness" value={formatValue(result.brightness_score)}/><InfoRow label="Contrast" value={formatValue(result.contrast_score)}/><InfoRow label="Underexposed" value={formatValue(result.underexposed_percent, "%")}/><InfoRow label="Overexposed" value={formatValue(result.overexposed_percent, "%")}/>{result.quality_warning && <div className="mt-4 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><p>{result.quality_warning}</p></div>}</Panel><Panel title="Source-Aware Risk" icon={<Waves className="h-5 w-5"/>}><InfoRow label="Sample Source" value={result.sample_source}/><InfoRow label="Source Risk Factor" value={result.source_risk_factor}/><InfoRow label="Concentration-only Risk" value={result.concentration_only_risk_level}/><InfoRow label="Final MSMI Risk" value={result.monitoring_risk_level}/><InfoRow label="Recommendation" value={result.recommendation}/></Panel></div>
  </div>;
}

function EmptyResult(){ return <div className="flex min-h-[520px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-cyan-200 bg-cyan-50/40 p-8 text-center scan-line"><div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white text-cyan-700 shadow-xl"><ImageIcon className="h-10 w-10"/></div><h3 className="text-2xl font-black text-slate-950">Result intelligence panel</h3><p className="mt-3 max-w-md text-sm leading-7 text-slate-600">Upload a sample image to reveal processed overlays, MSMI score, hybrid validation and quality warnings in real time.</p></div>; }
function AlertBox({ type, title, message }) { const ok=type==='success'; return <div className={`mb-6 flex items-start gap-3 rounded-3xl border p-4 ${ok?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-rose-200 bg-rose-50 text-rose-800'}`}>{ok?<CheckCircle2 className="mt-0.5 h-5 w-5"/>:<AlertCircle className="mt-0.5 h-5 w-5"/>}<div><p className="font-black">{title}</p><p className="text-sm">{message}</p></div></div>; }
function PulseMetric({ icon:Icon,label,value }){ return <div className="rounded-3xl border border-slate-100 bg-white/80 p-4"><Icon className="mb-3 h-5 w-5 text-cyan-700"/><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-1 text-lg font-black text-slate-950">{value}</p></div>; }
function EngineButton({active,onClick,icon:Icon,title,text,muted}){ return <button type="button" onClick={onClick} className={`rounded-3xl border p-4 text-left transition-all ${active?'border-cyan-400 bg-cyan-50 shadow-xl shadow-cyan-100 ring-4 ring-cyan-100':'border-slate-200 bg-white hover:-translate-y-0.5 hover:bg-slate-50'}`}><div className="flex items-center gap-2"><Icon className={`h-5 w-5 ${muted?'text-slate-600':'text-cyan-700'}`}/><p className="font-black text-slate-950">{title}</p></div><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></button>; }
function Field({label,children}){ return <div><label className="mb-2 block text-sm font-black text-slate-800">{label}</label>{children}</div>; }
function RiskPill({risk}){ const r=String(risk||'Unknown').toLowerCase(); const cls=r.includes('low')?'border-emerald-200 bg-emerald-50 text-emerald-700':r.includes('moderate')?'border-amber-200 bg-amber-50 text-amber-700':r.includes('high')?'border-rose-200 bg-rose-50 text-rose-700':'border-slate-200 bg-slate-50 text-slate-700'; return <span className={`inline-flex w-fit rounded-full border px-4 py-2 text-sm font-black ${cls}`}>{risk||'Unknown'}</span>; }
function ImageCard({title,imageUrl}){ return <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50"><div className="border-b border-slate-200 bg-white px-4 py-3"><p className="text-sm font-black text-slate-900">{title}</p></div><div className="flex min-h-60 items-center justify-center p-3">{imageUrl?<img src={imageUrl} alt={title} className="max-h-80 rounded-3xl object-contain shadow-sm"/>:<p className="text-sm text-slate-500">Image not available</p>}</div></div>; }
function MetricCard({icon:Icon,label,value,highlight}){ return <div className={`lift-card rounded-3xl border p-4 shadow-sm ${highlight?'border-cyan-200 bg-cyan-50':'border-slate-200 bg-white'}`}><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-cyan-700 shadow-sm"><Icon className="h-5 w-5"/></div><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value??'—'}</p></div>; }
function ValidationBox({label,value,tone='slate',icon=null}){ const styles={slate:'bg-slate-50 border-slate-200 text-slate-900',emerald:'bg-emerald-50 border-emerald-200 text-emerald-700',rose:'bg-rose-50 border-rose-200 text-rose-700',cyan:'bg-cyan-50 border-cyan-200 text-cyan-700'}; return <div className={`rounded-2xl border p-3 ${styles[tone]}`}><div className="flex items-center justify-between"><p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>{icon}</div><p className="mt-2 text-2xl font-black">{value??'—'}</p></div>; }
function Panel({title,icon,children}){ return <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-5"><div className="mb-4 flex items-center gap-2"><div className="rounded-xl bg-cyan-50 p-2 text-cyan-700">{icon}</div><p className="text-sm font-black text-slate-950">{title}</p></div>{children}</div>; }
function InfoRow({label,value}){ return <div className="mb-3"><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{value??'—'}</p></div>; }
