import { useEffect, useMemo, useState } from 'react';
import { getSamples, downloadSampleReport } from '../api';
import { EmptyState, icons, RiskBadge } from '../components/ui';

const { Database, Download, FileText, Search } = icons;

export default function History() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('');
  const [risk, setRisk] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const data = await getSamples({ limit: 100 });
      if (mounted) {
        setSamples(Array.isArray(data) ? data : []);
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => samples.filter((sample) => {
    const matchesSource = !source || String(sample.sample_source || '').toLowerCase().includes(source.toLowerCase());
    const matchesRisk = !risk || String(sample.monitoring_risk_level || '').toLowerCase().includes(risk.toLowerCase());
    const sample_id = sample.id || sample.sample_id || '';
    const matchesQuery = !query || String(sample_id).includes(query) || String(sample.sample_source || '').toLowerCase().includes(query.toLowerCase());
    return matchesSource && matchesRisk && matchesQuery;
  }), [samples, source, risk, query]);

  return (
    <div>
      <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Sample History</span>
          <h1 className="font-display text-3xl font-bold md:text-4xl">Screening Records</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">Review previous water sample analysis records returned from the backend.</p>
        </div>
      </section>

      <section className="stitch-card mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" /><input className="input-stitch pl-9" placeholder="Search by sample ID or source" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <select className="input-stitch" value={source} onChange={(e) => setSource(e.target.value)}><option value="">All sources</option><option>Tap Water</option><option>Lake Water</option><option>River Water</option><option>Bottled Water</option><option>Unknown</option></select>
          <select className="input-stitch" value={risk} onChange={(e) => setRisk(e.target.value)}><option value="">All risks</option><option>Low</option><option>Moderate</option><option>High</option></select>
        </div>
      </section>

      <section className="stitch-card overflow-hidden">
        <div className="border-b border-outline-variant px-5 py-4"><h2 className="font-display text-xl font-bold">Analysis Table</h2></div>
        {loading ? <div className="p-8 text-center font-bold text-on-surface-variant">Loading samples...</div> : filtered.length === 0 ? <div className="p-5"><EmptyState title="No matching samples" text="Try clearing filters or upload a new water sample image." icon={Database} /></div> : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-surface-container-low text-[11px] uppercase tracking-wide text-on-surface-variant">
                  <tr><th className="px-5 py-3">Sample ID</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Accepted</th><th className="px-5 py-3">Estimated / L</th><th className="px-5 py-3">MSMI</th><th className="px-5 py-3">Risk</th><th className="px-5 py-3">Report</th></tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filtered.map((sample) => <HistoryRow key={sample.id || sample.sample_id} sample={sample} />)}
                </tbody>
              </table>
            </div>
            <div className="grid gap-4 p-4 md:hidden">
              {filtered.map((sample) => <HistoryCard key={sample.id || sample.sample_id} sample={sample} />)}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function HistoryRow({ sample }) {
  const sample_id = sample.id || sample.sample_id;
  return <tr className="bg-white"><td className="px-5 py-4 font-extrabold text-primary">#{sample_id}</td><td className="px-5 py-4 font-semibold">{sample.sample_source || '—'}</td><td className="px-5 py-4 text-on-surface-variant">{formatDate(sample.created_at || sample.timestamp || sample.analysis_date)}</td><td className="px-5 py-4 font-bold">{sample.accepted_detection_count ?? sample.detected_particles ?? '—'}</td><td className="px-5 py-4 font-bold">{sample.estimated_particles_per_litre ?? '—'}</td><td className="px-5 py-4 font-bold">{sample.msmi_score ?? sample.mpi_score ?? '—'}</td><td className="px-5 py-4"><RiskBadge monitoring_risk_level={sample.monitoring_risk_level} /></td><td className="px-5 py-4"><button onClick={() => downloadSampleReport(sample_id)} className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-bold hover:bg-surface-container-low"><Download className="h-3.5 w-3.5" />PDF</button></td></tr>;
}

function HistoryCard({ sample }) {
  const sample_id = sample.id || sample.sample_id;
  return <div className="rounded-xl border border-outline-variant bg-white p-4"><div className="mb-3 flex items-center justify-between"><p className="font-display text-xl font-bold text-primary">Sample #{sample_id}</p><RiskBadge monitoring_risk_level={sample.monitoring_risk_level} /></div><div className="grid grid-cols-2 gap-3 text-sm"><Info label="Source" value={sample.sample_source} /><Info label="Accepted" value={sample.accepted_detection_count ?? sample.detected_particles} /><Info label="Estimated / L" value={sample.estimated_particles_per_litre} /><Info label="MSMI" value={sample.msmi_score ?? sample.mpi_score} /></div><button onClick={() => downloadSampleReport(sample_id)} className="btn-secondary mt-4 w-full"><FileText className="h-4 w-4" />Download Report</button></div>;
}
function Info({ label, value }) { return <div><p className="text-[11px] font-extrabold uppercase text-on-surface-variant">{label}</p><p className="mt-1 font-bold">{value ?? '—'}</p></div>; }
function formatDate(value) { if (!value) return '—'; const d = new Date(value); return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleString(); }
