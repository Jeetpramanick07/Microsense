import { useEffect, useState } from 'react';
import { downloadSampleReport, getSamples } from '../api';
import { EmptyState, icons, RiskBadge } from '../components/ui';

const { Download, FileText } = icons;

export default function Reports() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const data = await getSamples({ limit: 60 });
      if (mounted) {
        setSamples(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <section className="mb-6">
        <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Reports Archive</span>
        <h1 className="font-display text-3xl font-bold md:text-4xl">Document Archive</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">Access generated PDF reports for previous preliminary screening records.</p>
      </section>

      {loading ? <div className="stitch-card p-8 text-center font-bold text-on-surface-variant">Loading reports...</div> : samples.length === 0 ? <EmptyState title="No reports available" text="Analyze a sample to generate the first MicroSense PDF report." icon={FileText} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {samples.map((sample) => <ReportCard key={sample.id || sample.sample_id} sample={sample} />)}
        </div>
      )}
    </div>
  );
}

function ReportCard({ sample }) {
  const sample_id = sample.id || sample.sample_id;
  return (
    <article className="stitch-card p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><FileText className="h-5 w-5" /></div>
          <div>
            <h3 className="font-display text-lg font-bold">MicroSense Report</h3>
            <p className="text-sm text-on-surface-variant">Sample ID: {sample_id || '—'}</p>
          </div>
        </div>
        <RiskBadge monitoring_risk_level={sample.monitoring_risk_level} />
      </div>
      <div className="space-y-2 rounded-xl border border-outline-variant bg-surface-container-low p-4 text-sm">
        <Info label="Generated" value={formatDate(sample.created_at || sample.timestamp || sample.analysis_date)} />
        <Info label="sample_source" value={sample.sample_source} />
        <Info label="accepted_detection_count" value={sample.accepted_detection_count ?? sample.detected_particles} />
        <Info label="msmi_score" value={sample.msmi_score ?? sample.mpi_score} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button onClick={() => downloadSampleReport(sample_id)} className="btn-primary"><Download className="h-4 w-4" />Download</button>
        <button onClick={() => downloadSampleReport(sample_id)} className="btn-secondary">View PDF</button>
      </div>
    </article>
  );
}

function Info({ label, value }) { return <div className="flex items-center justify-between gap-3"><span className="font-bold text-on-surface-variant">{label}</span><span className="font-extrabold text-on-surface">{value ?? '—'}</span></div>; }
function formatDate(value) { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(); }
