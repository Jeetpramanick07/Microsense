import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { History, Search, Filter, RefreshCw, Loader2, AlertCircle, Upload, Eye, Trash2, FlaskConical, TrendingUp, ShieldCheck, ShieldAlert, ShieldX, Database, Cpu, Calendar, Gauge, Droplets, X, Image as ImageIcon } from "lucide-react";
import { getSamples, deleteSample, getMediaUrl, getDetectorLabel } from "../api.js";
import RiskBadge from "./RiskBadge.jsx";

const RISK_LEVELS = ["All", "Low", "Moderate", "High", "Critical"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "msmi_desc", label: "Highest MSMI" },
  { value: "particles_desc", label: "Highest Candidate Count" },
];

export default function HistoryPage() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);
  const [searchSource, setSearchSource] = useState("");
  const [filterRisk, setFilterRisk] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [deleting, setDeleting] = useState(null);

  const fetchSamples = async () => {
    setLoading(true); setError(null);
    try {
      const data = await getSamples({ limit: 200 });
      setSamples(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to fetch history");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSamples(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete sample #${id}? This cannot be undone.`)) return;
    try { setDeleting(id); await deleteSample(id); setSamples((prev)=>prev.filter((s)=>s.id!==id)); if (selectedSample?.id===id) setSelectedSample(null); }
    finally { setDeleting(null); }
  };

  const stats = useMemo(() => {
    const total = samples.length;
    const totalParticles = samples.reduce((sum,s)=>sum+(s.detected_particles||0),0);
    const maxMsmi = samples.reduce((m,s)=>Math.max(m, Number(s.msmi_score ?? s.mpi_score ?? 0)),0);
    const yolo26 = samples.filter((s)=>getDetectorLabel(s).includes("YOLO26n")).length;
    const latest = [...samples].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
    return { total, avgParticles: total ? Math.round(totalParticles/total) : 0, maxMsmi, yolo26, latestRisk: latest?.monitoring_risk_level || "—" };
  }, [samples]);

  const filtered = useMemo(() => {
    let arr = [...samples];
    if (searchSource.trim()) arr = arr.filter((s)=>s.sample_source?.toLowerCase().includes(searchSource.trim().toLowerCase()));
    if (filterRisk !== "All") arr = arr.filter((s)=>s.monitoring_risk_level === filterRisk);
    if (sortBy === "newest") arr.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    if (sortBy === "oldest") arr.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    if (sortBy === "msmi_desc") arr.sort((a,b)=>(b.msmi_score ?? b.mpi_score ?? 0)-(a.msmi_score ?? a.mpi_score ?? 0));
    if (sortBy === "particles_desc") arr.sort((a,b)=>(b.detected_particles ?? 0)-(a.detected_particles ?? 0));
    return arr;
  }, [samples, searchSource, filterRisk, sortBy]);

  return (
    <div className="relative mx-auto max-w-7xl space-y-6 px-3 py-5 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
      <div className="pointer-events-none absolute -left-20 top-24 h-80 w-80 rounded-full bg-cyan-200/25 blur-3xl float-slow" />
      <section className="rounded-3xl border border-cyan-100 bg-white/80 p-4 shadow-2xl shadow-cyan-100/60 backdrop-blur-2xl sm:rounded-[2rem] sm:p-8 soft-grid">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-700"><Database className="h-4 w-4"/> Database Records</div>
            <h1 className="text-[2rem] font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">Sample intelligence history</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">Browse YOLO26n main detector outputs, baseline comparisons, hybrid validation and MSMI monitoring records.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/upload" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-cyan-200 transition hover:-translate-y-0.5"><Upload className="h-4 w-4"/> Analyze</Link>
            <button onClick={fetchSamples} disabled={loading} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-cyan-700"><RefreshCw className={`h-4 w-4 ${loading?'animate-spin':''}`}/> Refresh</button>
          </div>
        </div>
      </section>

      {!loading && !error && samples.length > 0 && <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5"><Summary icon={FlaskConical} label="Total Tests" value={stats.total}/><Summary icon={TrendingUp} label="Avg Candidates" value={stats.avgParticles}/><Summary icon={Gauge} label="Highest MSMI" value={stats.maxMsmi}/><Summary icon={Cpu} label="YOLO26n Runs" value={stats.yolo26}/><Summary icon={ShieldCheck} label="Latest Risk" value={stats.latestRisk}/></section>}

      <section className="glass-card rounded-3xl p-4 sm:rounded-[2rem] sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={searchSource} onChange={(e)=>setSearchSource(e.target.value)} placeholder="Search by sample source..." className="input-dynamic pl-11"/></div>
          <div className="relative"><Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><select value={filterRisk} onChange={(e)=>setFilterRisk(e.target.value)} className="input-dynamic w-full min-w-0 pl-11 lg:min-w-[180px]">{RISK_LEVELS.map((r)=><option key={r} value={r}>{r === 'All' ? 'All Risk Levels' : r}</option>)}</select></div>
          <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="input-dynamic w-full min-w-0 lg:min-w-[190px]">{SORT_OPTIONS.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
      </section>

      {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={fetchSamples} /> : filtered.length === 0 ? <EmptyState /> : <div className="grid gap-4 lg:grid-cols-2">{filtered.map((sample, index)=><SampleCard key={sample.id} sample={sample} index={index} onView={()=>setSelectedSample(sample)} onDelete={()=>handleDelete(sample.id)} deleting={deleting===sample.id}/>)}</div>}
      {selectedSample && <DetailsModal sample={selectedSample} onClose={()=>setSelectedSample(null)} onDelete={()=>handleDelete(selectedSample.id)} deleting={deleting===selectedSample.id} />}
    </div>
  );
}

function Summary({icon:Icon,label,value}){ return <div className="premium-card lift-card rounded-3xl p-4 sm:p-5"><Icon className="mb-4 h-6 w-6 text-cyan-700"/><p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{value ?? '—'}</p></div>; }
function SampleCard({sample,index,onView,onDelete,deleting}){ const detector=getDetectorLabel(sample); return <div className="premium-card lift-card animate-slide-up overflow-hidden rounded-[2rem]" style={{animationDelay:`${index*55}ms`}}><div className="grid sm:grid-cols-[170px_1fr]"><div className="relative min-h-48 bg-cyan-50 scan-line">{sample.processed_image_url?<img src={getMediaUrl(sample.processed_image_url)} alt="Processed" className="h-full min-h-48 w-full object-cover"/>:<div className="flex h-full min-h-48 items-center justify-center text-cyan-700"><ImageIcon className="h-10 w-10"/></div>}<div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">#{sample.id}</div></div><div className="p-5"><div className="mb-3 flex items-start justify-between gap-3"><div><h3 className="text-xl font-black text-slate-950">{sample.sample_source}</h3><p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-500"><Calendar className="h-3.5 w-3.5"/>{formatDate(sample.created_at)}</p></div><RiskBadge level={sample.monitoring_risk_level}/></div><div className="mb-4 inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700"><Cpu className="h-3.5 w-3.5"/>{detector}</div><div className="grid grid-cols-3 gap-2"><Tiny label="Candidates" value={sample.detected_particles}/><Tiny label="MSMI" value={sample.msmi_score ?? sample.mpi_score}/><Tiny label="Hybrid" value={sample.hybrid_filter_score}/></div><div className="mt-4 flex gap-2"><button onClick={onView} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-600 px-3 py-2.5 text-xs font-black text-white shadow-md transition hover:-translate-y-0.5"><Eye className="h-4 w-4"/> Details</button><button onClick={onDelete} disabled={deleting} className="inline-flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-rose-700 transition hover:-translate-y-0.5"><Trash2 className="h-4 w-4"/></button></div></div></div></div>; }
function DetailsModal({sample,onClose,onDelete,deleting}){ return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-2 backdrop-blur-sm sm:items-center sm:p-4"><div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl animate-scale-in sm:max-h-[90vh] sm:rounded-[2rem] sm:p-5"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-700">Sample #{sample.id}</p><h2 className="text-2xl font-black text-slate-950 sm:text-3xl">{sample.sample_source}</h2><p className="mt-1 text-sm text-slate-500">{formatDate(sample.created_at)} · {getDetectorLabel(sample)}</p></div><button onClick={onClose} className="rounded-2xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X className="h-5 w-5"/></button></div><div className="grid gap-4 lg:grid-cols-2"><ImagePanel title="Original Image" url={sample.original_image_url}/><ImagePanel title="Processed Image" url={sample.processed_image_url}/></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><TinyBig label="Detected" value={sample.detected_particles}/><TinyBig label="MSMI" value={sample.msmi_score ?? sample.mpi_score}/><TinyBig label="Hybrid Score" value={sample.hybrid_filter_score}/><TinyBig label="Image Quality" value={sample.image_quality_status}/></div><div className="mt-5 grid gap-4 lg:grid-cols-2"><InfoPanel title="Hybrid AI Validation" rows={[['Raw Candidates',sample.raw_detection_count],['Accepted',sample.accepted_detection_count],['Rejected',sample.rejected_detection_count],['Summary',sample.filter_summary]]}/><InfoPanel title="Image Quality" rows={[['Score',sample.image_quality_score],['Focus',sample.focus_score],['Brightness',sample.brightness_score],['Contrast',sample.contrast_score],['Warning',sample.quality_warning]]}/><InfoPanel title="Source-Aware MSMI" rows={[['Risk',sample.monitoring_risk_level],['Concentration Risk',sample.concentration_only_risk_level],['Source Factor',sample.source_risk_factor],['Recommendation',sample.recommendation]]}/><InfoPanel title="Particle Details" rows={[['Particles / Litre',sample.estimated_particles_per_litre],['Average Area',sample.average_particle_area],['Average Brightness',sample.average_brightness],['Size Category',sample.size_category]]}/></div><div className="mt-5 flex justify-end gap-2"><button onClick={onDelete} disabled={deleting} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-black text-rose-700">{deleting?'Deleting...':'Delete Record'}</button><button onClick={onClose} className="rounded-2xl bg-cyan-600 px-4 py-2 text-sm font-black text-white">Close</button></div></div></div>; }
function ImagePanel({title,url}){ return <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3"><p className="mb-2 text-sm font-black text-slate-900">{title}</p>{url?<img src={getMediaUrl(url)} alt={title} className="max-h-60 w-full rounded-2xl object-contain sm:max-h-80"/>:<div className="flex h-56 items-center justify-center text-slate-400">No image</div>}</div>; }
function InfoPanel({title,rows}){ return <div className="rounded-3xl border border-slate-200 bg-white p-4"><h3 className="mb-3 text-sm font-black text-slate-950">{title}</h3>{rows.map(([k,v])=><div key={k} className="mb-3"><p className="text-xs font-black uppercase tracking-wide text-slate-400">{k}</p><p className="mt-1 text-sm font-bold leading-6 text-slate-800">{v ?? '—'}</p></div>)}</div>; }
function Tiny({label,value}){ return <div className="rounded-2xl bg-slate-50 p-2 text-center"><p className="text-[10px] font-black uppercase text-slate-400">{label}</p><p className="mt-1 text-lg font-black text-slate-950">{value??'—'}</p></div>; }
function TinyBig({label,value}){ return <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-cyan-700">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value??'—'}</p></div>; }
function LoadingState(){ return <div className="flex flex-col items-center justify-center rounded-[2rem] border border-cyan-100 bg-white/80 py-20 shadow-sm"><Loader2 className="h-10 w-10 animate-spin text-cyan-600"/><p className="mt-4 text-sm font-bold text-slate-500">Loading sample intelligence...</p></div>; }
function ErrorState({error,onRetry}){ return <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-800"><div className="flex gap-3"><AlertCircle/><div><p className="font-black">Unable to load history</p><p className="mt-1 text-sm">{error}</p><button onClick={onRetry} className="mt-4 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-black text-white">Retry</button></div></div></div>; }
function EmptyState(){ return <div className="rounded-[2rem] border border-dashed border-cyan-200 bg-cyan-50/60 p-12 text-center"><History className="mx-auto h-12 w-12 text-cyan-700"/><h3 className="mt-4 text-2xl font-black text-slate-950">No sample records yet</h3><p className="mt-2 text-slate-500">Analyze your first water sample to populate history.</p><Link to="/upload" className="mt-5 inline-flex rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-black text-white">Analyze Sample</Link></div>; }
function formatDate(dt){ if(!dt) return '—'; return new Date(dt).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
