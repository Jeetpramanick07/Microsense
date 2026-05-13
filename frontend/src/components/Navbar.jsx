import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Microscope, LayoutDashboard, Upload, History, Wifi, WifiOff, RefreshCw, Sparkles } from "lucide-react";

export default function Navbar({ backendConnected, checking, onRefresh }) {
  const location = useLocation();
  const navLinks = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/upload", label: "Analyze", icon: Upload },
    { to: "/history", label: "History", icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-cyan-100/70 bg-white/72 backdrop-blur-2xl shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[64px] items-center justify-between py-2.5 sm:min-h-[72px] sm:py-3">
          <Link to="/" className="group flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 via-teal-500 to-blue-500 text-white shadow-lg shadow-cyan-200/80 transition group-hover:-translate-y-0.5 group-hover:shadow-cyan-300/80 sm:h-12 sm:w-12">
              <div className="absolute inset-0 bg-white/20 opacity-0 transition group-hover:opacity-100" />
              <Microscope size={22} />
            </div>
            <div className="block min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-slate-950 sm:text-lg">MicroSense</span>
                <span className="hidden rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-bold text-cyan-700 ring-1 ring-cyan-100 xs:inline-flex sm:inline-flex">AI-Cam</span>
              </div>
              <div className="mt-0.5 hidden items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 sm:flex">
                <Sparkles size={10} className="text-cyan-500" /> Microplastic Monitor
              </div>
            </div>
          </Link>

          <nav className="hidden items-center rounded-2xl border border-slate-200/70 bg-white/75 p-1 shadow-sm md:flex">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                    active
                      ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-md shadow-cyan-200"
                      : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onRefresh}
              disabled={checking}
              title="Refresh status"
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 disabled:opacity-50"
            >
              <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
            </button>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl border shadow-sm sm:hidden ${
                checking
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : backendConnected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
              title={checking ? "Checking backend" : backendConnected ? "Backend online" : "Backend offline"}
            >
              {checking ? <RefreshCw size={15} className="animate-spin" /> : backendConnected ? <Wifi size={15} /> : <WifiOff size={15} />}
            </div>
            <div
              className={`hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-black shadow-sm sm:flex ${
                checking
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : backendConnected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              <span className={`status-dot ${checking ? "bg-amber-400 animate-pulse" : backendConnected ? "bg-emerald-500 pulse-ring" : "bg-rose-500"}`} />
              {checking ? "Checking" : backendConnected ? <><Wifi size={12}/> Backend Online</> : <><WifiOff size={12}/> Offline</>}
            </div>
          </div>
        </div>

        <div className="fixed bottom-3 left-3 right-3 z-50 grid grid-cols-3 gap-2 rounded-[1.7rem] border border-cyan-100 bg-white/88 p-2 shadow-2xl shadow-cyan-950/10 backdrop-blur-2xl md:hidden mobile-bottom-nav">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-black transition ${
                  active ? "bg-cyan-600 text-white shadow-md" : "bg-white/70 text-slate-600 ring-1 ring-slate-200"
                }`}
              >
                <Icon size={16} /> <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
