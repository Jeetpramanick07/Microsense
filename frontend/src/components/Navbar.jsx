import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Microscope, LayoutDashboard, Upload, History, Wifi, WifiOff, RefreshCw } from "lucide-react";

export default function Navbar({ backendConnected, checking, onRefresh }) {
  const location = useLocation();

  const navLinks = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/upload", label: "Manual Upload", icon: Upload },
    { to: "/history", label: "History", icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Microscope size={18} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="font-display font-bold text-slate-900 text-lg leading-none tracking-tight">
                MicroSense
              </span>
              <span className="font-display font-normal text-teal-600 text-lg leading-none tracking-tight ml-1">
                AI-Cam
              </span>
              <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">
                Microplastic Monitor
              </div>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-teal-50 text-teal-700 border border-teal-200"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Status + Refresh */}
          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={checking}
              title="Refresh status"
              className="p-2 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
            </button>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                checking
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : backendConnected
                  ? "bg-teal-50 text-teal-700 border-teal-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}
            >
              {checking ? (
                <>
                  <span className="status-dot bg-amber-400 animate-pulse" />
                  Checking...
                </>
              ) : backendConnected ? (
                <>
                  <span className="status-dot bg-teal-500 pulse-ring" />
                  <Wifi size={12} />
                  Backend Connected
                </>
              ) : (
                <>
                  <span className="status-dot bg-red-500" />
                  <WifiOff size={12} />
                  Backend Offline
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-1 pb-2">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-teal-50 text-teal-700 border border-teal-200"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
