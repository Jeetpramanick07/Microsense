import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLatestSample, getSamples, formatNumber } from '../api';
import { icons, PageHero, RiskBadge, StatCard } from '../components/ui';

const { Activity, BarChart3, Database, Gauge, ImageIcon, Microscope, ShieldCheck, Waves, Zap } = icons;

export default function Dashboard({ backendOnline }) {
  const [latestSample, setLatestSample] = useState(null);
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const [latest, list] = await Promise.all([getLatestSample(), getSamples({ limit: 8 })]);
      if (mounted) {
        setLatestSample(latest);
        setSamples(Array.isArray(list) ? list : []);
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const totalSamples = samples.length || latestSample?.id || latestSample?.sample_id || 0;
  const latestAccepted = latestSample?.accepted_detection_count ?? latestSample?.detected_particles ?? 0;
  const msmi = latestSample?.msmi_score ?? latestSample?.mpi_score ?? '—';
  const risk = latestSample?.monitoring_risk_level || 'No data';

  return (
    <>
      <PageHero
        eyebrow="System Overview"
        title="Precision Optical Intelligence"
        text="MicroSense AI-Cam is an AI-assisted optical monitoring system designed for preliminary screening of microplastic-like particle candidates in water samples. It combines YOLO26n detection, hybrid visual validation, image quality scoring, and automated PDF reporting."
        primaryTo="/analyze"
        primaryLabel="Analyze New Sample"
        secondaryTo="/reports"
        secondaryLabel="View Latest Report"
      />

      <div className="bento-grid mb-8">
        <div className="col-span-4 md:col-span-3"><StatCard label="Total Samples" value={totalSamples} helper={loading ? 'Syncing database' : 'Samples available'} icon={Database} /></div>
        <div className="col-span-4 md:col-span-3"><StatCard label="Latest Detections" value={latestAccepted} helper="Accepted candidates" icon={Zap} /></div>
        <div className="col-span-4 md:col-span-3"><StatCard label="MSMI Score" value={msmi} helper="Monitoring index" icon={Gauge} tone="green" /></div>
        <div className="col-span-4 md:col-span-3 stitch-card p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wide text-on-surface-variant">Current Risk</span>
            <ShieldCheck className="h-5 w-5 text-primary opacity-70" />
          </div>
          <div className="font-display text-3xl font-bold tracking-tight text-on-surface">{risk}</div>
          <div className="mt-3"><RiskBadge monitoring_risk_level={risk} /></div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <section className="stitch-card overflow-hidden">
          <div className="border-b border-outline-variant px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xl font-bold">Latest Detection Overview</h3>
                <p className="mt-1 text-sm text-on-surface-variant">Original sample preview and processed detection output.</p>
              </div>
              <Link to="/results" className="btn-secondary hidden sm:inline-flex">Open Results</Link>
            </div>
          </div>
          {latestSample ? (
            <div className="grid gap-4 p-5 lg:grid-cols-2">
              <ImagePanel title="Original Sample" url={latestSample.original_image_url} icon={ImageIcon} />
              <ImagePanel title="Processed Output" url={latestSample.processed_image_url} icon={Microscope} />
            </div>
          ) : (
            <div className="p-5">
              <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center">
                <Microscope className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h4 className="font-display text-xl font-bold">No samples analyzed yet</h4>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-on-surface-variant">Upload a water sample image to begin AI-assisted screening.</p>
                <Link to="/analyze" className="btn-primary mt-5">Start Analysis</Link>
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="stitch-card p-5">
            <h3 className="font-display text-lg font-bold">Detection Engine</h3>
            <div className="mt-4 space-y-3">
              <StatusRow label="Backend API" value={backendOnline ? 'Connected' : 'Offline'} ok={backendOnline} />
              <StatusRow label="AI Model" value="YOLO26n" ok />
              <StatusRow label="Hybrid Validation" value="Enabled" ok />
              <StatusRow label="PDF Reports" value="Available" ok />
            </div>
          </div>
          <div className="stitch-card p-5">
            <h3 className="font-display text-lg font-bold">Preliminary Screening Note</h3>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">Results indicate visually detected microplastic-like particle candidates based on optical features such as size, contrast, shape, edge clarity, and brightness.</p>
          </div>
        </aside>
      </div>
    </>
  );
}

function ImagePanel({ title, url, icon: Icon }) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low">
      <div className="flex items-center gap-2 border-b border-outline-variant bg-white px-4 py-3">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-extrabold">{title}</span>
      </div>
      <div className="flex min-h-[280px] items-center justify-center p-4">
        {url ? <img src={url} alt={title} className="max-h-[320px] rounded-lg object-contain shadow-sm" /> : <span className="text-sm text-on-surface-variant">Image not available</span>}
      </div>
    </div>
  );
}

function StatusRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2">
      <span className="text-sm font-semibold text-on-surface-variant">{label}</span>
      <span className={`text-sm font-extrabold ${ok ? 'text-emerald-700' : 'text-red-700'}`}>{value}</span>
    </div>
  );
}
