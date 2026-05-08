import React from "react";
import { Link } from "react-router-dom";
import {
  Server, Cpu, Camera, Bluetooth, Database, RefreshCw, Monitor,
  Zap, ArrowRight, AlertCircle, ChevronRight, Activity, Droplets,
  BarChart2, Clock, Hash, FlaskConical, ExternalLink, Wifi
} from "lucide-react";
import StatusCard from "./StatusCard.jsx";
import RiskBadge from "./RiskBadge.jsx";
import { getMediaUrl, API_BASE_URL } from "../api.js";

const PIPELINE_STEPS = [
  { icon: Camera, label: "Camera / Microscope", desc: "Hardware capture", color: "slate" },
  { icon: Server, label: "FastAPI Backend", desc: "Image receiver", color: "teal" },
  { icon: Cpu, label: "YOLOv5 Model", desc: "AI detection engine", color: "cyan" },
  { icon: Database, label: "Database Storage", desc: "Result persistence", color: "blue" },
  { icon: Monitor, label: "Dashboard / OLED", desc: "Result display", color: "indigo" },
];

const pipelineColors = {
  slate: "bg-slate-100 text-slate-500 border-slate-200",
  teal: "bg-teal-100 text-teal-600 border-teal-200",
  cyan: "bg-cyan-100 text-cyan-600 border-cyan-200",
  blue: "bg-blue-100 text-blue-600 border-blue-200",
  indigo: "bg-indigo-100 text-indigo-600 border-indigo-200",
};

const dotColors = {
  slate: "bg-slate-300",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
};

export default function Dashboard({ systemStatus, latestSample, checking, onRefresh }) {
  const {
    backendConnected,
    databaseReady,
    latestSampleAvailable,
    lastChecked,
    totalSamples,
  } = systemStatus;

  const formatDate = (dt) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const formatChecked = (dt) => {
    if (!dt) return "Never";
    return new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const statusCards = [
    {
      icon: Server,
      title: "Backend API",
      description: "FastAPI server running YOLOv5 analysis pipeline",
      status: checking ? "checking" : backendConnected ? "connected" : "offline",
      detail: `${API_BASE_URL}/docs`,
    },
    {
      icon: Cpu,
      title: "YOLOv5 Model",
      description: "Custom-trained microplastic detection model (best.pt)",
      status: checking ? "checking" : backendConnected ? "ready" : "offline",
      detail: backendConnected ? "backend/model/best.pt — Loaded" : "Requires backend connection",
    },
    {
      icon: Camera,
      title: "Camera Module",
      description: "Microscope/camera hardware for water sample capture",
      status: "waiting",
      detail: "Waiting for hardware signal — Not yet integrated",
    },
    {
      icon: Bluetooth,
      title: "ESP32 / Hardware Unit",
      description: "Microcontroller for hardware communication layer",
      status: "pending",
      detail: "Pending integration — Hardware design phase",
    },
    {
      icon: Database,
      title: "Storage / Database",
      description: "SQLite/PostgreSQL backend for storing all test results",
      status: checking ? "checking" : databaseReady ? "ready" : "offline",
      detail: databaseReady ? `${totalSamples ?? "?"} records stored` : "Could not reach /api/samples/",
    },
    {
      icon: RefreshCw,
      title: "Latest Sample Sync",
      description: "Real-time access to the most recent analysis result",
      status: checking ? "checking" : latestSampleAvailable ? "available" : "offline",
      detail: latestSampleAvailable ? `Sample #${latestSample?.id} — ${latestSample?.sample_source}` : "No sample found in database",
    },
    {
      icon: Monitor,
      title: "OLED Display",
      description: "Optional hardware display showing latest result summary",
      status: "optional",
      detail: "Optional / Not connected — Future hardware feature",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-teal-500 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full tracking-widest uppercase">
              Control Center
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            MicroSense AI-Cam
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Hardware-linked AI microplastic monitoring system · Real-time control dashboard
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-all shadow-sm hover:shadow-md self-start sm:self-auto"
        >
          <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
          {checking ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>

      {/* Offline warning */}
      {!checking && !backendConnected && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-slide-up">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">MicroSense Backend Offline</p>
            <p className="text-xs text-red-600 mt-0.5">
              Could not connect to FastAPI at <code className="font-mono bg-red-100 px-1 rounded">{API_BASE_URL}</code>.
              Make sure the backend is running with <code className="font-mono bg-red-100 px-1 rounded">python run.py</code> inside the backend folder.
            </p>
          </div>
        </div>
      )}

      {/* System Status Cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
            <Activity size={16} className="text-teal-500" /> System Readiness
          </h2>
          {lastChecked && (
            <span className="text-xs text-slate-400 font-mono">
              Last checked: {formatChecked(lastChecked)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {statusCards.map((card) => (
            <StatusCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      {/* Pipeline Visualization */}
      <section>
        <h2 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Zap size={16} className="text-teal-500" /> Hardware Pipeline
        </h2>
        <div className="card p-5">
          {/* Desktop horizontal pipeline */}
          <div className="hidden md:flex items-center gap-0">
            {PIPELINE_STEPS.map((step, i) => (
              <React.Fragment key={step.label}>
                <div
                  className={`flex flex-col items-center gap-2 px-4 py-3 rounded-xl border transition-all cursor-default hover:shadow-md ${pipelineColors[step.color]}`}
                  style={{ minWidth: 130 }}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center border shadow-sm">
                    <step.icon size={18} />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold leading-tight">{step.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{step.desc}</div>
                  </div>
                  <span className={`status-dot ${dotColors[step.color]} ${i > 0 && i <= 3 && backendConnected ? "pulse-ring" : ""}`} />
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="flex items-center flex-1 px-1">
                    <div className="pipeline-line" />
                    <ArrowRight size={14} className="text-teal-400 flex-shrink-0" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          {/* Mobile vertical pipeline */}
          <div className="flex md:hidden flex-col gap-3">
            {PIPELINE_STEPS.map((step, i) => (
              <React.Fragment key={step.label}>
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${pipelineColors[step.color]}`}>
                  <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center border shadow-sm flex-shrink-0">
                    <step.icon size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold">{step.label}</div>
                    <div className="text-[10px] opacity-70">{step.desc}</div>
                  </div>
                  <span className={`status-dot ${dotColors[step.color]}`} />
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div className="flex items-center gap-1 pl-10">
                    <div className="w-px h-4 bg-gradient-to-b from-teal-300 to-cyan-300" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 italic leading-relaxed">
              <span className="font-semibold text-teal-600 not-italic">Primary workflow:</span>{" "}
              Hardware camera captures water sample → FastAPI backend receives image → YOLOv5 detects microplastic particles → Result stored in database → Dashboard displays latest monitoring status.{" "}
              <span className="font-semibold text-slate-500 not-italic">Manual upload is available only for testing and demo mode.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Live Monitor + Latest Result */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Connection Monitor */}
        <section>
          <h2 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Wifi size={16} className="text-teal-500" /> Live Connection Monitor
          </h2>
          <div className="card p-5 space-y-1">
            {[
              { label: "Backend URL", value: API_BASE_URL, mono: true },
              { label: "Frontend Port", value: "localhost:5173", mono: true },
              { label: "Last Status Check", value: formatChecked(systemStatus.lastChecked) },
              { label: "Backend Status", value: backendConnected ? "● Connected" : "● Offline" },
              { label: "Database Status", value: databaseReady ? "● Ready" : "● Not reachable" },
              { label: "Total Samples Stored", value: totalSamples != null ? totalSamples : "—" },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-xs text-slate-400">{label}</span>
                <span className={`text-xs font-medium text-slate-700 ${mono ? "font-mono" : ""}`}>{value}</span>
              </div>
            ))}
            {latestSample ? (
              <>
                {[
                  { label: "Last Sample ID", value: `#${latestSample.id}` },
                  { label: "Last Sample Source", value: latestSample.sample_source },
                  { label: "Last Detected Particles", value: latestSample.detected_particles },
                  { label: "Last MPI Score", value: latestSample.mpi_score },
                  { label: "Last Risk Level", value: latestSample.monitoring_risk_level },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                    <span className="text-xs text-slate-400">{label}</span>
                    <span className="text-xs font-medium text-slate-700">{value ?? "—"}</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-slate-400">No sample analyzed yet.</p>
                <Link to="/upload" className="text-xs text-teal-600 hover:underline mt-0.5 block">
                  Use Manual Upload Mode for testing →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Latest Result Preview */}
        <section>
          <h2 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
            <FlaskConical size={16} className="text-teal-500" /> Latest Result Preview
          </h2>
          {latestSample ? (
            <div className="card p-5 space-y-4">
              {latestSample.processed_image_url && (
                <img
                  src={getMediaUrl(latestSample.processed_image_url)}
                  alt="Latest processed"
                  className="w-full h-44 object-cover rounded-xl border border-slate-200"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-teal-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-teal-700">{latestSample.detected_particles}</div>
                  <div className="text-[10px] text-teal-500 font-medium">Detected Particles</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-xl font-bold text-blue-700">{latestSample.mpi_score}</div>
                  <div className="text-[10px] text-blue-500 font-medium">MPI Score</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <RiskBadge level={latestSample.monitoring_risk_level} size="lg" />
                <span className="text-xs text-slate-400 font-mono">{formatDate(latestSample.created_at)}</span>
              </div>
              {latestSample.recommendation && (
                <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 leading-relaxed">
                  {latestSample.recommendation}
                </p>
              )}
              <Link
                to="/history"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-all"
              >
                <BarChart2 size={14} /> View History
              </Link>
            </div>
          ) : (
            <div className="card p-8 flex flex-col items-center justify-center text-center gap-3" style={{ minHeight: 260 }}>
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                <FlaskConical size={24} className="text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">No sample analyzed yet</p>
                <p className="text-xs text-slate-400 mt-1">Use Manual Upload Mode to test the pipeline</p>
              </div>
              <Link
                to="/upload"
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-xl transition-all"
              >
                <ExternalLink size={13} /> Go to Manual Upload
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Callout banner */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Zap size={20} className="text-teal-200 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-teal-50 leading-relaxed">
            <span className="font-bold text-white">Primary workflow:</span>{" "}
            Hardware camera captures water sample image → MicroSense backend runs YOLOv5 detection → result is stored in database → dashboard displays latest monitoring status.{" "}
            <span className="font-semibold text-teal-100">Manual upload is available only for testing and demo mode.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
