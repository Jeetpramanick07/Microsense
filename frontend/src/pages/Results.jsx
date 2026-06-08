import { useEffect, useState } from 'react';
import { downloadSampleReport, getDetectorLabel, getLatestSample, getMediaUrl, formatNumber } from '../api';
import { EmptyState, icons, MetricTile, RiskBadge } from '../components/ui';

const { Activity, BarChart3, CheckCircle2, Download, Gauge, ImageIcon, Microscope, ShieldCheck, Waves, Zap } = icons;

export default function Results({ latestResult }) {
  const [sample, setSample] = useState(latestResult || null);
  const [loading, setLoading] = useState(!latestResult);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (latestResult) {
        setSample(latestResult);
        setLoading(false);
        return;
      }
      setLoading(true);
      const data = await getLatestSample();
      if (mounted) {
        setSample(data);
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [latestResult]);

  const sample_id = sample?.id || sample?.sample_id;

  const handleDownload = async () => {
    if (!sample_id) return;
    setDownloading(true);
    try { await downloadSampleReport(sample_id); } finally { setDownloading(false); }
  };

  if (loading) return <div className="stitch-card p-8 text-center font-bold text-on-surface-variant">Loading latest result...</div>;
  if (!sample) return <EmptyState title="No result available" text="Upload a water sample image to generate the first result page." icon={Microscope} />;

  return (
    <div>
      <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Analysis Results</span>
          <h1 className="font-display text-3xl font-bold md:text-4xl">Sample #{sample_id || '—'} Detection Summary</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">Detection model: {getDetectorLabel(sample)}</p>
        </div>
        <button onClick={handleDownload} disabled={!sample_id || downloading} className="btn-primary disabled:opacity-60"><Download className="h-4 w-4" />{downloading ? 'Preparing PDF...' : 'Download Report'}</button>
      </section>

      <div className="mb-6 stitch-card p-5">
        <div className="grid gap-4 md:grid-cols-5">
          <Summary label="sample_source" value={sample.sample_source} />
          <Summary label="chamber_volume_ml" value={sample.chamber_volume_ml} suffix=" ml" />
          <Summary label="processing_time" value={sample.processing_time_seconds ?? sample.processing_time} suffix=" s" />
          <Summary label="confidence_score" value={sample.confidence_score} suffix="%" />
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-on-surface-variant">monitoring_risk_level</p>
            <div className="mt-2"><RiskBadge monitoring_risk_level={sample.monitoring_risk_level} /></div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <section className="stitch-card overflow-hidden">
          <div className="border-b border-outline-variant px-5 py-4">
            <h2 className="font-display text-xl font-bold">Visual Detection Analysis</h2>
            <p className="text-sm text-on-surface-variant">Original and processed optical images.</p>
          </div>
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <ImageCard title="Original Sample Image" url={getMediaUrl(sample.original_image_url)} icon={ImageIcon} />
            <ImageCard title="Processed Detection Image" url={getMediaUrl(sample.processed_image_url)} icon={Microscope} />
          </div>
        </section>

        <aside className="stitch-card p-5">
          <h2 className="font-display text-xl font-bold">Preliminary Interpretation</h2>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">The uploaded sample contains visually detected microplastic-like particle candidates based on optical features such as size, contrast, shape, edge clarity, and brightness. This result is intended for preliminary screening and monitoring.</p>
          {sample.recommendation && <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold leading-6 text-blue-900">{sample.recommendation}</div>}
        </aside>
      </div>

      <section className="mt-6 stitch-card p-5">
        <h2 className="font-display text-xl font-bold">Backend Metrics</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricTile label="raw_detection_count" value={sample.raw_detection_count} icon={Zap} />
          <MetricTile label="accepted_detection_count" value={sample.accepted_detection_count ?? sample.detected_particles} icon={CheckCircle2} highlight />
          <MetricTile label="rejected_detection_count" value={sample.rejected_detection_count} icon={Activity} />
          <MetricTile label="estimated_particles_per_litre" value={sample.estimated_particles_per_litre} icon={Waves} />
          <MetricTile label="msmi_score" value={sample.msmi_score ?? sample.mpi_score} icon={BarChart3} />
          <MetricTile label="hybrid_filter_score" value={sample.hybrid_filter_score} icon={ShieldCheck} />
          <MetricTile label="image_quality_score" value={sample.image_quality_score} icon={Gauge} />
          <MetricTile label="focus_score" value={sample.focus_score} icon={Microscope} />
          <MetricTile label="brightness_score" value={sample.brightness_score} icon={ImageIcon} />
          <MetricTile label="contrast_score" value={sample.contrast_score} icon={Activity} />
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value, suffix = '' }) {
  return <div><p className="text-[11px] font-extrabold uppercase tracking-wide text-on-surface-variant">{label}</p><p className="mt-1 font-display text-xl font-bold text-on-surface">{formatNumber(value)}{value !== null && value !== undefined && value !== '' ? suffix : ''}</p></div>;
}

function ImageCard({ title, url, icon: Icon }) {
  return <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low"><div className="flex items-center gap-2 border-b border-outline-variant bg-white px-4 py-3 text-sm font-extrabold"><Icon className="h-4 w-4 text-primary" />{title}</div><div className="flex min-h-[340px] items-center justify-center p-4">{url ? <img src={url} alt={title} className="max-h-[380px] rounded-lg object-contain shadow-sm" /> : <span className="text-sm text-on-surface-variant">Image not available</span>}</div></div>;
}
