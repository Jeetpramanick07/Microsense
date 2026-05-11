import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  History, Search, Filter, RefreshCw, Loader2, AlertCircle, Upload,
  ChevronUp, ChevronDown, Eye, Trash2, BarChart2, FlaskConical, TrendingUp,
  ShieldCheck, ShieldAlert, ShieldX, Shield, Calendar
} from "lucide-react";
import { getSamples, deleteSample, getMediaUrl } from "../api.js";
import RiskBadge from "./RiskBadge.jsx";
import SampleModal from "./SampleModal.jsx";

const RISK_LEVELS = ["All", "Low", "Moderate", "High", "Critical"];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "msmi_desc", label: "Highest MSMI" },
  { value: "particles_desc", label: "Highest Particle Count" },
];

function SummaryCard({ icon: Icon, label, value, color }) {
  const colors = {
    teal: "bg-teal-50 text-teal-700 border-teal-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    red: "bg-red-50 text-red-700 border-red-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] || colors.slate}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} />
        <span className="text-[10px] font-semibold uppercase tracking-widest opacity-70">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value ?? "—"}</div>
    </div>
  );
}

export default function HistoryPage() {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSample, setSelectedSample] = useState(null);
  const [searchSource, setSearchSource] = useState("");
  const [filterRisk, setFilterRisk] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const fetchSamples = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSamples();
      setSamples(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to fetch history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSamples(); }, []);

  const handleDelete = async (id) => {
    await deleteSample(id);
    setSamples((prev) => prev.filter((s) => s.id !== id));
  };

  // Summary stats
  const stats = useMemo(() => {
    const total = samples.length;
    const riskCounts = { Low: 0, Moderate: 0, High: 0, Critical: 0 };
    let totalParticles = 0;
    let maxMpi = 0;
    let totalQuality = 0;
    let qualityCount = 0;
    for (const s of samples) {
      if (s.monitoring_risk_level in riskCounts) riskCounts[s.monitoring_risk_level]++;
      totalParticles += s.detected_particles ?? 0;
      if ((s.msmi_score ?? s.mpi_score ?? 0) > maxMpi) maxMpi = s.msmi_score ?? s.mpi_score ?? 0;
      if (s.image_quality_score != null) { totalQuality += Number(s.image_quality_score); qualityCount++; }
    }
    const latestRisk = samples.length > 0
      ? [...samples].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]?.monitoring_risk_level
      : "—";
    return {
      total,
      latestRisk,
      avgParticles: total > 0 ? Math.round(totalParticles / total) : 0,
      maxMpi,
      avgQuality: qualityCount > 0 ? Math.round(totalQuality / qualityCount) : 0,
      ...riskCounts,
    };
  }, [samples]);

  // Filtering + sorting
  const filtered = useMemo(() => {
    let arr = [...samples];
    if (searchSource.trim()) {
      const q = searchSource.trim().toLowerCase();
      arr = arr.filter((s) => s.sample_source?.toLowerCase().includes(q));
    }
    if (filterRisk !== "All") {
      arr = arr.filter((s) => s.monitoring_risk_level === filterRisk);
    }
    switch (sortBy) {
      case "newest": arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
      case "oldest": arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
      case "msmi_desc": arr.sort((a, b) => (b.msmi_score ?? b.mpi_score ?? 0) - (a.msmi_score ?? a.mpi_score ?? 0)); break;
      case "particles_desc": arr.sort((a, b) => (b.detected_particles ?? 0) - (a.detected_particles ?? 0)); break;
    }
    return arr;
  }, [samples, searchSource, filterRisk, sortBy]);

  const formatDate = (dt) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full tracking-widest uppercase">
              Database Records
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Testing History
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            All analyzed samples stored in the MicroSense database · {samples.length} total records
          </p>
        </div>
        <button
          onClick={fetchSamples}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-xl border border-slate-200 disabled:opacity-50 transition-all shadow-sm self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Summary Cards */}
      {!loading && !error && samples.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 animate-slide-up">
          <div className="col-span-2 sm:col-span-2">
            <SummaryCard icon={FlaskConical} label="Total Tests" value={stats.total} color="teal" />
          </div>
          <div className="col-span-2 sm:col-span-2">
            <SummaryCard icon={TrendingUp} label="Avg Particles" value={stats.avgParticles} color="blue" />
          </div>
          <div className="col-span-2 sm:col-span-2">
            <SummaryCard icon={BarChart2} label="Highest MSMI" value={stats.maxMpi} color="amber" />
          </div>
          <div className="col-span-2 sm:col-span-2">
            <SummaryCard icon={Shield} label="Latest Risk" value={stats.latestRisk} color="slate" />
          </div>
          <div className="col-span-2 sm:col-span-2">
            <SummaryCard icon={BarChart2} label="Avg Quality" value={stats.avgQuality} color="blue" />
          </div>
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <SummaryCard icon={ShieldCheck} label="Low Risk" value={stats.Low} color="emerald" />
          </div>
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <SummaryCard icon={ShieldAlert} label="Moderate" value={stats.Moderate} color="amber" />
          </div>
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <SummaryCard icon={ShieldX} label="High Risk" value={stats.High} color="red" />
          </div>
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <SummaryCard icon={ShieldX} label="Critical" value={stats.Critical} color="purple" />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by sample source..."
            value={searchSource}
            onChange={(e) => setSearchSource(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 transition-all"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 transition-all appearance-none cursor-pointer"
          >
            {RISK_LEVELS.map((r) => <option key={r} value={r}>{r === "All" ? "All Risk Levels" : r}</option>)}
          </select>
        </div>
        <div className="relative">
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="pl-3 pr-8 py-2.5 text-sm rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-300 transition-all appearance-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={28} className="text-teal-500 animate-spin" />
          <p className="text-sm text-slate-500">Loading history from database...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle size={28} className="text-red-400" />
          <p className="text-sm font-semibold text-slate-700">Could not load history</p>
          <p className="text-xs text-slate-400">{error}</p>
          <button onClick={fetchSamples} className="mt-2 text-xs text-teal-600 hover:underline flex items-center gap-1">
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      ) : samples.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <History size={28} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-700">No test records found</p>
          <p className="text-xs text-slate-400">Analyze a sample from Manual Upload Mode to create your first record.</p>
          <Link to="/upload" className="mt-2 flex items-center gap-1 text-xs text-teal-600 hover:underline">
            <Upload size={12} /> Go to Manual Upload
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <p className="text-sm font-semibold text-slate-700">No results match your filters</p>
          <button onClick={() => { setSearchSource(""); setFilterRisk("All"); }} className="text-xs text-teal-600 hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3 animate-slide-up">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="card card-hover p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Thumbnail */}
              <div className="flex-shrink-0">
                {s.processed_image_url ? (
                  <img
                    src={getMediaUrl(s.processed_image_url)}
                    alt={`Sample ${s.id}`}
                    className="w-16 h-16 object-cover rounded-xl border border-slate-200"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                    <FlaskConical size={18} className="text-slate-300" />
                  </div>
                )}
              </div>

              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-slate-400">#{s.id}</span>
                  <span className="text-sm font-semibold text-slate-800 truncate">{s.sample_source}</span>
                  <RiskBadge level={s.monitoring_risk_level} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar size={10} /> {formatDate(s.created_at)}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex gap-4 flex-shrink-0">
                <div className="text-center">
                  <div className="text-lg font-bold text-cyan-700">{s.msmi_score ?? s.mpi_score ?? "—"}</div>
                  <div className="text-[10px] text-slate-400">MSMI</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-teal-700">{s.detected_particles ?? "—"}</div>
                  <div className="text-[10px] text-slate-400">Particles</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-700">{s.image_quality_score != null ? Number(s.image_quality_score).toFixed(0) : "—"}</div>
                  <div className="text-[10px] text-slate-400">Quality</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-slate-700">{s.confidence_score != null ? `${s.confidence_score}%` : "—"}</div>
                  <div className="text-[10px] text-slate-400">Confidence</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setSelectedSample(s)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-all"
                >
                  <Eye size={12} /> Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedSample && (
        <SampleModal
          sample={selectedSample}
          onClose={() => setSelectedSample(null)}
          onDelete={async (id) => {
            await handleDelete(id);
            setSelectedSample(null);
          }}
        />
      )}
    </div>
  );
}
