import React from "react";

const statusConfig = {
  connected: { color: "teal", label: "Connected", dot: "bg-teal-500" },
  ready: { color: "teal", label: "Ready", dot: "bg-teal-500" },
  active: { color: "teal", label: "Active", dot: "bg-teal-500" },
  available: { color: "teal", label: "Available", dot: "bg-teal-500" },
  checking: { color: "amber", label: "Checking...", dot: "bg-amber-400" },
  waiting: { color: "blue", label: "Waiting", dot: "bg-blue-400" },
  pending: { color: "slate", label: "Pending", dot: "bg-slate-400" },
  offline: { color: "red", label: "Offline", dot: "bg-red-500" },
  error: { color: "red", label: "Error", dot: "bg-red-500" },
  optional: { color: "slate", label: "Optional", dot: "bg-slate-300" },
  unknown: { color: "slate", label: "Unknown", dot: "bg-slate-300" },
};

const colorMap = {
  teal: {
    bg: "bg-teal-50",
    border: "border-teal-100",
    icon: "bg-teal-100 text-teal-600",
    badge: "bg-teal-100 text-teal-700",
    ring: "ring-teal-200",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-100",
    icon: "bg-amber-100 text-amber-600",
    badge: "bg-amber-100 text-amber-700",
    ring: "ring-amber-200",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-100",
    icon: "bg-blue-100 text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    ring: "ring-blue-200",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-100",
    icon: "bg-red-100 text-red-600",
    badge: "bg-red-100 text-red-700",
    ring: "ring-red-200",
  },
  slate: {
    bg: "bg-slate-50",
    border: "border-slate-100",
    icon: "bg-slate-100 text-slate-500",
    badge: "bg-slate-100 text-slate-600",
    ring: "ring-slate-200",
  },
};

export default function StatusCard({ icon: Icon, title, description, status, detail }) {
  const cfg = statusConfig[status] || statusConfig.unknown;
  const colors = colorMap[cfg.color];

  return (
    <div
      className={`card card-hover p-4 flex flex-col gap-3 animate-fade-in border ${colors.border}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.icon}`}>
          <Icon size={18} />
        </div>
        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.badge}`}>
          <span className={`status-dot ${cfg.dot} ${status === "checking" ? "animate-pulse" : ""} ${status === "connected" || status === "ready" || status === "active" ? "pulse-ring" : ""}`} />
          {cfg.label}
        </span>
      </div>
      <div>
        <div className="font-semibold text-slate-800 text-sm">{title}</div>
        <div className="text-slate-500 text-xs mt-0.5 leading-relaxed">{description}</div>
        {detail && (
          <div className="mt-1.5 font-mono text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 truncate">
            {detail}
          </div>
        )}
      </div>
    </div>
  );
}
