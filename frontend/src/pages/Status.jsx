import { API_BASE_URL } from '../api';
import { icons, StatusChip } from '../components/ui';

const { Activity, CheckCircle2, Cpu, FileText, Settings, ShieldCheck, Zap } = icons;

export default function Status({ backendOnline, backendChecking, refreshBackend }) {
  return (
    <div>
      <section className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <span className="mb-2 block text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">System Status</span>
          <h1 className="font-display text-3xl font-bold md:text-4xl">Global Connectivity</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">Live frontend status panel for Render backend, YOLO26n detection and report services.</p>
        </div>
        <button onClick={refreshBackend} className="btn-secondary">Refresh Status</button>
      </section>

      <div className="mb-6 stitch-card p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-xl font-bold">Backend API</h2>
            <p className="mt-1 break-all text-sm text-on-surface-variant">{API_BASE_URL}</p>
          </div>
          <StatusChip backendOnline={backendOnline} backendChecking={backendChecking} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatusCard title="Backend API" value={backendChecking ? 'Checking' : backendOnline ? 'Connected' : 'Offline'} ok={backendOnline} icon={Activity} />
        <StatusCard title="Detection Engine" value="YOLO26n Active" ok icon={Cpu} />
        <StatusCard title="Hybrid Filter" value="Enabled" ok icon={ShieldCheck} />
        <StatusCard title="Report Generator" value="Available" ok icon={FileText} />
        <StatusCard title="Frontend" value="Vercel Deployment" ok icon={Zap} />
        <StatusCard title="Dashboard UI" value="Stitch Matched Theme" ok icon={Settings} />
      </div>
    </div>
  );
}

function StatusCard({ title, value, ok, icon: Icon }) {
  return <article className="stitch-card p-5"><div className="mb-5 flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-primary"><Icon className="h-5 w-5" /></div><CheckCircle2 className={`h-5 w-5 ${ok ? 'text-emerald-600' : 'text-red-600'}`} /></div><p className="text-[11px] font-extrabold uppercase tracking-wide text-on-surface-variant">{title}</p><h3 className="mt-2 font-display text-2xl font-bold">{value}</h3></article>;
}
