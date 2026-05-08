import React from "react";

const riskConfig = {
  Low: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  Moderate: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  High: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
  Critical: { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-200", dot: "bg-purple-600" },
};

export default function RiskBadge({ level, size = "sm" }) {
  const cfg = riskConfig[level] || { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400" };
  const textSize = size === "lg" ? "text-sm px-3 py-1.5" : "text-xs px-2 py-0.5";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border} ${textSize}`}>
      <span className={`status-dot ${cfg.dot}`} />
      {level || "Unknown"}
    </span>
  );
}
