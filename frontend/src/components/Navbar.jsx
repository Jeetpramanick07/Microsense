import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  UploadCloud,
  History,
  Microscope,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Analyze",
    path: "/upload",
    icon: UploadCloud,
  },
  {
    label: "History",
    path: "/history",
    icon: History,
  },
];

export default function Navbar({
  backendOnline = false,
  backendChecking = false,
  isAnalyzing = false,
}) {
  const statusLabel = isAnalyzing
    ? "Busy"
    : backendChecking
    ? "Checking"
    : backendOnline
    ? "Online"
    : "Offline";

  const statusClass = isAnalyzing
    ? "border-amber-200 bg-amber-50 text-amber-700"
    : backendChecking
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : backendOnline
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";

  const StatusIcon = isAnalyzing ? Loader2 : backendOnline ? Wifi : WifiOff;

  return (
    <>
      {/* TOP HEADER */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-cyan-100/80 bg-white/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:h-20 sm:px-6 lg:px-8">
          {/* Brand */}
          <NavLink to="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-200 sm:h-12 sm:w-12">
              <Microscope className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-sm font-black tracking-tight text-slate-950 sm:text-xl">
                MicroSense
              </h1>

              <p className="hidden text-[10px] font-black uppercase tracking-[0.28em] text-cyan-700 sm:block">
                Microplastic Monitor
              </p>
            </div>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-2 rounded-3xl border border-slate-200 bg-white/80 p-1 shadow-sm lg:flex">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition ${
                      isActive
                        ? "bg-cyan-600 text-white shadow-lg shadow-cyan-200"
                        : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          {/* Status Chip */}
          <div
            className={`inline-flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black ${statusClass}`}
            title={`Backend status: ${statusLabel}`}
          >
            <StatusIcon
              className={`h-4 w-4 ${isAnalyzing ? "animate-spin" : ""}`}
            />

            <span className="hidden sm:inline">{statusLabel}</span>
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-cyan-100 bg-white/90 px-3 py-2 shadow-[0_-10px_30px_rgba(14,116,144,0.12)] backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2 rounded-3xl border border-cyan-100 bg-cyan-50/60 p-1">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-black transition ${
                    isActive
                      ? "bg-cyan-600 text-white shadow-lg shadow-cyan-200"
                      : "text-slate-600 hover:bg-white hover:text-cyan-700"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
}