import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeSample, getMediaUrl } from '../api';
import { EmptyState, icons, MetricTile, RiskBadge } from '../components/ui';

const { AlertTriangle, BarChart3, CheckCircle2, FileText, ImageIcon, Microscope, ShieldCheck, UploadCloud, Waves, Zap } = icons;

export default function Analyze({ setLatestResult }) {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [form, setForm] = useState({
    sample_source: 'Tap Water',
    chamber_volume_ml: 50,
    notes: '',
    detector_model: 'yolo26',
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleFile = (selected) => {
    setError('');
    setResult(null);
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      setError('Please select a valid JPG or PNG image file.');
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!file) return setError('Please upload a sample image first.');
    if (!form.sample_source.trim()) return setError('sample_source is required.');
    if (!Number(form.chamber_volume_ml) || Number(form.chamber_volume_ml) <= 0) return setError('chamber_volume_ml must be greater than 0.');

    try {
      setIsAnalyzing(true);
      setError('');
      const data = await analyzeSample({ file, ...form });
      setResult(data);
      setLatestResult(data);
    } catch (err) {
      setError(err?.message || 'Analysis failed. Check whether the FastAPI backend is running.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div>
      <section className="mb-6">
        <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Analyze Sample</span>
        <h1 className="font-display text-3xl font-bold md:text-4xl">Sample Image Workspace</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">Upload an optical sample image and run YOLO26n detection with hybrid validation using backend variable names directly.</p>
      </section>

      {error && <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertTriangle className="mt-0.5 h-5 w-5" />{error}</div>}

      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <section className="stitch-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">Sample Image</h2>
              <p className="text-sm text-on-surface-variant">Supported formats: JPG, PNG</p>
            </div>
            <UploadCloud className="h-6 w-6 text-primary" />
          </div>
          <label
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
            className={`flex min-h-[380px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-5 text-center transition ${isDragging ? 'border-primary bg-blue-50' : 'border-outline-variant bg-surface-container-low hover:bg-white'}`}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Selected sample preview" className="max-h-[340px] rounded-lg object-contain shadow-sm" />
            ) : (
              <>
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-white text-primary shadow-sm"><ImageIcon className="h-8 w-8" /></div>
                <h3 className="font-display text-xl font-bold">Drag and drop sample image</h3>
                <p className="mt-2 text-sm text-on-surface-variant">or click to select from your device</p>
              </>
            )}
            <input className="hidden" type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
        </section>

        <aside className="space-y-6">
          <section className="stitch-card p-5">
            <h2 className="font-display text-xl font-bold">Sample Metadata</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Fields are aligned with your FastAPI backend schema.</p>
            <div className="mt-5 space-y-4">
              <Field label="sample_source">
                <select className="input-stitch" value={form.sample_source} onChange={(e) => update('sample_source', e.target.value)}>
                  <option>Tap Water</option>
                  <option>Lake Water</option>
                  <option>River Water</option>
                  <option>Bottled Water</option>
                  <option>Unknown</option>
                </select>
              </Field>
              <Field label="chamber_volume_ml">
                <input className="input-stitch" type="number" min="1" value={form.chamber_volume_ml} onChange={(e) => update('chamber_volume_ml', e.target.value)} />
              </Field>
              <Field label="detector_model">
                <select className="input-stitch" value={form.detector_model} onChange={(e) => update('detector_model', e.target.value)}>
                  <option value="yolo26">YOLO26n + Hybrid Filter</option>
                  <option value="yolov5">YOLOv5 Baseline</option>
                </select>
              </Field>
              <Field label="notes">
                <textarea className="input-stitch min-h-[90px] resize-none" value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Optional observations or location notes" />
              </Field>
            </div>
            <button disabled={isAnalyzing} className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60" type="submit">
              {isAnalyzing ? 'Analyzing Sample...' : 'Run AI Screening'}
            </button>
          </section>

          <section className="stitch-card p-5">
            <h2 className="font-display text-xl font-bold">Processing Pipeline</h2>
            <div className="mt-4 space-y-3">
              {['Checking image quality', 'Running YOLO26n detection', 'Applying hybrid validation', 'Estimating concentration', 'Generating PDF report'].map((step, idx) => (
                <div key={step} className="flex items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${isAnalyzing ? 'bg-primary text-white' : 'bg-white text-primary'}`}>{idx + 1}</span>
                  <span className="text-sm font-semibold text-on-surface-variant">{step}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </form>

      <section className="mt-6 stitch-card p-5">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">Analysis Result</h2>
            <p className="text-sm text-on-surface-variant">Live result returned by your backend.</p>
          </div>
          {result && <button className="btn-secondary" onClick={() => navigate('/results')}><FileText className="h-4 w-4" />Open Results Page</button>}
        </div>
        {result ? <InlineResult result={result} /> : <EmptyState title="Result intelligence panel" text="Upload a sample image to reveal processed overlays, MSMI score, hybrid validation and quality warnings." />}
      </section>
    </div>
  );
}

function InlineResult({ result }) {
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <RiskBadge monitoring_risk_level={result.monitoring_risk_level} />
        <span className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-xs font-bold text-on-surface-variant">Sample #{result.id || result.sample_id || '—'}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <MetricTile label="Raw Detections" value={result.raw_detection_count} icon={Zap} />
        <MetricTile label="Accepted" value={result.accepted_detection_count ?? result.detected_particles} icon={CheckCircle2} highlight />
        <MetricTile label="Particles / L" value={result.estimated_particles_per_litre} icon={Waves} />
        <MetricTile label="MSMI Score" value={result.msmi_score ?? result.mpi_score} icon={BarChart3} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ImageCard title="Original Sample Image" url={getMediaUrl(result.original_image_url)} />
        <ImageCard title="Processed Detection Image" url={getMediaUrl(result.processed_image_url)} />
      </div>
    </div>
  );
}

function ImageCard({ title, url }) {
  return <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low"><div className="border-b border-outline-variant bg-white px-4 py-3 text-sm font-extrabold">{title}</div><div className="flex min-h-[250px] items-center justify-center p-4">{url ? <img src={url} alt={title} className="max-h-[300px] rounded-lg object-contain" /> : <span className="text-sm text-on-surface-variant">Image not available</span>}</div></div>;
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-on-surface-variant">{label}</span>{children}</label>;
}
