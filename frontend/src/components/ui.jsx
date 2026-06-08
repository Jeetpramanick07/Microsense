import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDot,
  Cpu,
  Database,
  Download,
  FileText,
  Gauge,
  History,
  Home,
  Image as ImageIcon,
  Microscope,
  Search,
  Settings,
  ShieldCheck,
  UploadCloud,
  Waves,
  Zap,
} from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { formatNumber, getRiskTone } from '../api';

export const icons = {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  CircleDot,
  Cpu,
  Database,
  Download,
  FileText,
  Gauge,
  History,
  Home,
  ImageIcon,
  Microscope,
  Search,
  Settings,
  ShieldCheck,
  UploadCloud,
  Waves,
  Zap,
};

export function RiskBadge({ monitoring_risk_level }) {
  const tone = getRiskTone(monitoring_risk_level);
  const classes = {
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-red-50 text-red-700 border-red-200',
    unknown: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${classes[tone]}`}>{monitoring_risk_level || 'Unknown'}</span>;
}

export function StatusChip({ backendOnline, backendChecking }) {
  if (backendChecking) {
    return <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"><span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />Checking</span>;
  }
  if (backendOnline) {
    return <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />Connected</span>;
  }
  return <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700"><span className="h-2 w-2 rounded-full bg-red-500" />Offline</span>;
}

export function StatCard({ label, value, helper, icon: Icon = Activity, tone = 'primary' }) {
  const toneClass = tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : tone === 'green' ? 'text-emerald-600' : 'text-primary';
  return (
    <div className="stitch-card p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <span className="text-[11px] font-extrabold uppercase tracking-wide text-on-surface-variant">{label}</span>
        <Icon className={`h-5 w-5 ${toneClass} opacity-70`} />
      </div>
      <div className="font-display text-4xl font-bold tracking-tight text-on-surface">{formatNumber(value)}</div>
      <p className="mt-2 text-xs font-medium text-on-surface-variant">{helper}</p>
    </div>
  );
}

export function MetricTile({ label, value, suffix = '', icon: Icon = Activity, highlight = false }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-blue-200 bg-blue-50' : 'border-outline-variant bg-white'}`}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-low text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-on-surface">{formatNumber(value)}{value !== null && value !== undefined && value !== '' ? suffix : ''}</p>
    </div>
  );
}

export function EmptyState({ title, text, icon: Icon = ImageIcon }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-white text-primary shadow-sm"><Icon className="h-8 w-8" /></div>
      <h3 className="font-display text-xl font-bold text-on-surface">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-on-surface-variant">{text}</p>
    </div>
  );
}

export function AppShell({ children, title, backendOnline, backendChecking }) {
  const nav = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/analyze', label: 'Analyze Sample', icon: Microscope },
    { to: '/results', label: 'Results', icon: BarChart3 },
    { to: '/history', label: 'History', icon: History },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/status', label: 'System Status', icon: Settings },
  ];
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col border-r border-outline-variant bg-surface shadow-sm md:flex">
        <div className="p-6">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">MicroSense AI-Cam</h1>
          <p className="mt-1 text-sm font-medium text-on-surface-variant">Precision Lab System</p>
        </div>
        <nav className="mt-2 flex-1 px-4">
          <ul className="space-y-1">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold transition ${isActive ? 'border-r-4 border-primary bg-surface-container-high text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-outline-variant p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-highest text-primary"><Microscope className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-extrabold">AI Detection Engine</p>
              <p className="text-xs font-medium text-on-surface-variant">YOLO26n Active</p>
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-4 md:ml-[260px] md:px-6">
        <div className="flex items-center gap-3">
          <div className="md:hidden flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-white"><CircleDot className="h-5 w-5" /></div>
          <h2 className="font-display text-xl font-bold">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5 md:flex">
            <Search className="h-4 w-4 text-primary" />
            <input className="w-44 border-none bg-transparent p-0 text-sm outline-none" placeholder="Search samples..." />
          </div>
          <StatusChip backendOnline={backendOnline} backendChecking={backendChecking} />
        </div>
      </header>

      <main className="p-4 pb-28 md:ml-[260px] md:p-6 md:pb-8">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-outline-variant bg-white md:hidden">
        <div className="grid grid-cols-6">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `flex flex-col items-center gap-1 px-1 py-3 text-[10px] font-bold ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
              <item.icon className="h-5 w-5" />
              <span className="truncate">{item.label.split(' ')[0]}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function PageHero({ eyebrow, title, text, primaryTo, primaryLabel, secondaryTo, secondaryLabel }) {
  return (
    <section className="relative mb-8 overflow-hidden rounded-xl border border-outline-variant bg-white p-6 shadow-[0_4px_12px_rgba(15,23,42,0.05)] md:p-8">
      <div className="scanline pointer-events-none absolute right-0 top-0 h-full w-1/3 opacity-70" />
      <div className="relative z-10 max-w-4xl">
        <span className="mb-3 block text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">{eyebrow}</span>
        <h3 className="font-display text-3xl font-bold tracking-tight md:text-5xl">{title}</h3>
        <p className="mt-4 max-w-3xl text-base leading-7 text-on-surface-variant">{text}</p>
        {(primaryTo || secondaryTo) && (
          <div className="mt-7 flex flex-wrap gap-4">
            {primaryTo && <Link to={primaryTo} className="btn-primary"><Microscope className="h-4 w-4" />{primaryLabel}</Link>}
            {secondaryTo && <Link to={secondaryTo} className="btn-secondary"><FileText className="h-4 w-4" />{secondaryLabel}</Link>}
          </div>
        )}
      </div>
    </section>
  );
}
