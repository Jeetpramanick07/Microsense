import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Server,
  Cpu,
  Camera,
  Bluetooth,
  Database,
  RefreshCw,
  Monitor,
  Zap,
  ArrowRight,
  AlertCircle,
  Activity,
  Droplets,
  BarChart3,
  FlaskConical,
  ShieldCheck,
  Gauge,
  Sparkles,
  Eye,
  ScanLine,
} from "lucide-react";

import StatusCard from "./StatusCard.jsx";
import RiskBadge from "./RiskBadge.jsx";

import {
  getMediaUrl,
  API_BASE_URL,
  getLatestSample,
  getSamples,
} from "../api.js";
import DownloadReportButton from "./DownloadReportButton.jsx";

const pipeline = [
  {
    icon: Camera,
    label: "Camera / Microscope",
    desc: "Optical sample image",
  },
  {
    icon: Server,
    label: "FastAPI Backend",
    desc: "Upload + preprocessing",
  },
  {
    icon: Cpu,
    label: "YOLO26n Main",
    desc: "Candidate detection",
  },
  {
    icon: ShieldCheck,
    label: "Hybrid Validation",
    desc: "Visual reliability filter",
  },
  {
    icon: Database,
    label: "Database",
    desc: "MSMI + history",
  },
  {
    icon: Monitor,
    label: "Dashboard / OLED",
    desc: "Live interpretation",
  },
];

const modules = [
  {
    icon: Cpu,
    title: "YOLO26n Main Detector",
    text: "Primary lightweight detector for microplastic-like particle candidates.",
  },
  {
    icon: ShieldCheck,
    title: "Hybrid AI Validation",
    text: "Checks contrast, edge boundary, compactness and area after detection.",
  },
  {
    icon: Eye,
    title: "Image Quality Scoring",
    text: "Flags blur, darkness, overexposure and underexposure before interpretation.",
  },
  {
    icon: Gauge,
    title: "Source-Aware MSMI",
    text: "Prototype monitoring score adjusted by sample source and confidence.",
  },
  {
    icon: ScanLine,
    title: "Processed Image Output",
    text: "Visual overlay of accepted and rejected candidate regions.",
  },
  {
    icon: Database,
    title: "Database History",
    text: "Stores sample results, particle features and monitoring trends.",
  },
];

const fmt = (value, fallback = "—") =>
  value === null || value === undefined || value === "" ? fallback : value;

const num = (value, digits = 0) => {
  if (value === null || value === undefined || value === "") return "—";

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) return "—";

  return numberValue.toFixed(digits).replace(/\.0+$/, "");
};

export default function Dashboard({
  systemStatus = {},
  checking = false,
  onRefresh,
  refreshBackend,
  latestRefreshKey = 0,
}) {
  const [latestSample, setLatestSample] = useState(null);
  const [latestLoading, setLatestLoading] = useState(true);
  const [totalSamples, setTotalSamples] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const {
    backendConnected = false,
    databaseReady = false,
    backendChecking = false,
  } = systemStatus || {};

  const isChecking = checking || backendChecking || latestLoading;

  const loadDashboardData = async () => {
    try {
      setLatestLoading(true);

      const latest = await getLatestSample();
      setLatestSample(latest);

      const samples = await getSamples({ limit: 100 });
      setTotalSamples(Array.isArray(samples) ? samples.length : null);

      setLastChecked(new Date().toISOString());
    } catch (error) {
      console.error("Dashboard latest sample load failed:", error);
      setLatestSample(null);
    } finally {
      setLatestLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [latestRefreshKey]);

  const handleRefresh = async () => {
    await refreshBackend?.();
    await onRefresh?.();
    await loadDashboardData();
  };

  const formatChecked = (dt) =>
    dt
      ? new Date(dt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "Never";

  const latestSampleAvailable = Boolean(latestSample);
  const dbReady = databaseReady || latestSampleAvailable || totalSamples !== null;
  const backendIsOnline = backendConnected || latestSampleAvailable;

  const statusCards = [
    {
      icon: Server,
      title: "Backend API",
      description: "FastAPI server running YOLO26n main analysis pipeline",
      status: isChecking
        ? "checking"
        : backendIsOnline
        ? "connected"
        : "offline",
      detail: `${API_BASE_URL}/docs`,
    },
    {
      icon: Cpu,
      title: "YOLO26n Main Detector",
      description: "Primary detection route for microplastic-like particle candidates",
      status: isChecking ? "checking" : backendIsOnline ? "ready" : "offline",
      detail: "backend/model/yolo26_best.pt",
    },
    {
      icon: Database,
      title: "Storage / Database",
      description: "PostgreSQL/SQLite persistence for analysis history",
      status: isChecking ? "checking" : dbReady ? "ready" : "offline",
      detail: dbReady
        ? `${totalSamples ?? "?"} records synced`
        : "Could not reach /api/samples/",
    },
    {
      icon: RefreshCw,
      title: "Latest Sample Sync",
      description: "Live access to the most recent sample intelligence",
      status: isChecking
        ? "checking"
        : latestSampleAvailable
        ? "available"
        : "waiting",
      detail: latestSampleAvailable
        ? `Sample #${latestSample?.id} · ${latestSample?.sample_source}`
        : "No latest sample yet",
    },
    {
      icon: Camera,
      title: "Camera Module",
      description: "Optical sample capture layer for water chamber images",
      status: "waiting",
      detail: "Hardware integration ready",
    },
    {
      icon: Bluetooth,
      title: "ESP32 / Hardware Unit",
      description: "Microcontroller layer for future portable workflow",
      status: "pending",
      detail: "Prototype extension",
    },
    {
      icon: Monitor,
      title: "OLED Display",
      description: "Optional compact display for field-ready results",
      status: "optional",
      detail: "Future hardware display",
    },
  ];

  const stats = [
    {
      icon: Gauge,
      label: "Latest MSMI",
      value: num(latestSample?.msmi_score ?? latestSample?.mpi_score),
      tone: "cyan",
    },
    {
      icon: Droplets,
      label: "Detected Candidates",
      value: fmt(latestSample?.detected_particles),
      tone: "teal",
    },
    {
      icon: ShieldCheck,
      label: "Hybrid Score",
      value: num(latestSample?.hybrid_filter_score, 1),
      tone: "emerald",
    },
    {
      icon: Eye,
      label: "Image Quality",
      value: fmt(latestSample?.image_quality_status),
      tone: "amber",
    },
  ];

  return (
    <div className="relative mx-auto max-w-7xl space-y-6 px-3 py-5 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
      <div className="pointer-events-none absolute -left-20 top-20 hidden h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl float-slow sm:block" />

      <div className="pointer-events-none absolute right-0 top-40 hidden h-72 w-72 rounded-full bg-teal-200/30 blur-3xl float-delayed sm:block" />

      {!isChecking && !backendIsOnline && (
        <div className="animate-slide-up rounded-3xl border border-rose-200 bg-rose-50/90 p-4 text-rose-800 shadow-sm">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-black">MicroSense Backend Offline</p>

              <p className="mt-1 text-sm">
                Could not connect to FastAPI at{" "}
                <code className="rounded bg-white px-1 font-mono">
                  {API_BASE_URL}
                </code>
                . Please check Render deployment or local backend.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden rounded-3xl border border-cyan-100 bg-white/80 p-4 shadow-2xl shadow-cyan-100/70 backdrop-blur-2xl sm:rounded-[2rem] sm:p-8 lg:p-10 soft-grid">
        <div className="absolute right-8 top-8 hidden h-24 w-24 rounded-full border border-cyan-200/60 lg:block" />

        <div className="absolute bottom-10 right-20 hidden h-12 w-12 rounded-full bg-teal-200/40 blur-sm lg:block" />

        <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <div className="animate-slide-up">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50/90 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              YOLO26n Main Pipeline
            </div>

            <h1 className="max-w-4xl text-[2.15rem] font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              AI-Powered{" "}
              <span className="bg-gradient-to-r from-cyan-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
                Microplastic Screening
              </span>{" "}
              for Water Samples
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-lg sm:leading-8">
              MicroSense AI-Cam combines optical imaging, YOLO26n main
              detection, hybrid validation and MSMI scoring for prototype-level
              water sample monitoring.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row">
              <Link
                to="/upload"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-cyan-200 transition hover:-translate-y-1 hover:shadow-cyan-300"
              >
                Analyze Sample
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>

              <Link
                to="/history"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/85 px-6 py-3.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-1 hover:border-cyan-200 hover:text-cyan-700"
              >
                View History
                <Database className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="relative animate-scale-in stagger-2">
            <div className="aurora-border rounded-[2rem] p-[2px]">
              <div className="relative overflow-hidden rounded-[calc(2rem-2px)] bg-white p-5 shadow-xl scan-line">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
                      Live Sample Intelligence
                    </p>

                    <h3 className="mt-1 text-2xl font-black text-slate-950">
                      {latestLoading
                        ? "Loading latest sample..."
                        : latestSample
                        ? latestSample.sample_source
                        : "Waiting for sample"}
                    </h3>
                  </div>

                  {latestSample ? (
                    <RiskBadge
                      level={latestSample.monitoring_risk_level}
                      size="lg"
                    />
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                      No data
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <MiniStat
                    icon={Droplets}
                    label="Accepted"
                    value={fmt(
                      latestSample?.accepted_detection_count ??
                        latestSample?.detected_particles
                    )}
                  />

                  <MiniStat
                    icon={Gauge}
                    label="MSMI"
                    value={num(latestSample?.msmi_score ?? latestSample?.mpi_score)}
                  />

                  <MiniStat
                    icon={ShieldCheck}
                    label="Hybrid"
                    value={num(latestSample?.hybrid_filter_score, 1)}
                  />

                  <MiniStat
                    icon={Eye}
                    label="Quality"
                    value={fmt(latestSample?.image_quality_status)}
                  />
                </div>

                {latestSample?.processed_image_url ? (
                  <img
                    src={getMediaUrl(latestSample.processed_image_url)}
                    alt="Latest processed sample"
                    className="mt-4 h-40 w-full rounded-2xl border border-slate-100 object-contain bg-slate-50 sm:h-48"
                  />
                ) : (
                  <div className="mt-4 flex h-40 items-center justify-center rounded-2xl border border-dashed border-cyan-200 bg-cyan-50/60 px-3 text-center text-sm font-bold text-cyan-700 sm:h-48">
                    Processed preview appears here
                  </div>
                )}

                {latestSample?.quality_warning && (
                  <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    {latestSample.quality_warning}
                  </p>
                )}
                {latestSample?.id && (
                  <div className="mt-4">
                    <DownloadReportButton
                      sampleId={latestSample.id}
                      label="Download Latest Report"
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {stats.map((item, index) => (
          <HeroStat
            key={item.label}
            {...item}
            delay={`stagger-${index + 1}`}
          />
        ))}
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
              Operational Readiness
            </p>

            <h2 className="mt-1 text-2xl font-black text-slate-950">
              System Modules
            </h2>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isChecking}
            className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-cyan-700 disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={isChecking ? "animate-spin" : ""}
            />
            Last checked {formatChecked(lastChecked)}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {statusCards.map((card, index) => (
            <StatusCard key={card.title} {...card} delay={index} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-cyan-100 bg-white/80 p-4 shadow-xl shadow-cyan-100/60 backdrop-blur-xl sm:rounded-[2rem] sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
            <Zap className="h-6 w-6" />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
              Pipeline Flow
            </p>

            <h2 className="text-2xl font-black text-slate-950">
              From sample image to monitored insight
            </h2>
          </div>
        </div>

        <div className="hidden items-center gap-0 lg:flex">
          {pipeline.map((step, index) => (
            <React.Fragment key={step.label}>
              <PipelineStep {...step} index={index} />

              {index < pipeline.length - 1 && (
                <div className="flex flex-1 items-center px-2">
                  <div className="pipeline-line" />
                  <ArrowRight className="h-4 w-4 shrink-0 text-cyan-500" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid gap-3 lg:hidden">
          {pipeline.map((step, index) => (
            <PipelineStep key={step.label} {...step} index={index} mobile />
          ))}
        </div>

        <p className="mt-5 rounded-2xl bg-cyan-50/80 p-4 text-sm leading-7 text-slate-600">
          Results represent microplastic-like particle candidates for prototype
          monitoring. The system does not chemically confirm polymer composition
          or provide regulatory-grade quantification.
        </p>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">
            Core Capabilities
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-950">
            MicroSense intelligence modules
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((item, index) => (
            <FeatureCard key={item.title} {...item} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
}

function HeroStat({ icon: Icon, label, value, tone, delay }) {
  const colors = {
    cyan: "from-cyan-50 to-white text-cyan-700",
    teal: "from-teal-50 to-white text-teal-700",
    emerald: "from-emerald-50 to-white text-emerald-700",
    amber: "from-amber-50 to-white text-amber-700",
  };

  return (
    <div
      className={`premium-card lift-card animate-slide-up ${delay} rounded-3xl p-4 sm:p-5`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`rounded-2xl bg-gradient-to-br ${
            colors[tone] || colors.cyan
          } p-3 shadow-sm`}
        >
          <Icon className="h-6 w-6" />
        </div>

        <Activity className="h-4 w-4 text-slate-300" />
      </div>

      <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
      <Icon className="mb-2 h-4 w-4 text-cyan-700" />

      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function PipelineStep({ icon: Icon, label, desc, index, mobile }) {
  return (
    <div
      className={`lift-card flex ${
        mobile ? "items-center" : "min-w-[130px] flex-col items-center text-center"
      } gap-3 rounded-3xl border border-cyan-100 bg-white/85 p-4 shadow-sm animate-slide-up`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-200">
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <p className="text-sm font-black text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text, index }) {
  return (
    <div
      className="premium-card lift-card animate-slide-up rounded-3xl p-6"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="text-lg font-black text-slate-950">{title}</h3>

      <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
    </div>
  );
}