import React from "react";
import {
  X, ImageIcon, Activity, Droplets, BarChart2, Info, Trash2, AlertTriangle, Microscope, Gauge, Waves
} from "lucide-react";
import { getMediaUrl } from "../api.js";
import RiskBadge from "./RiskBadge.jsx";

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-800 text-right max-w-[55%]">{value ?? "—"}</span>
    </div>
  );
}

export default function SampleModal({ sample, onClose, onDelete }) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  if (!sample) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(sample.id);
      onClose();
    } catch (err) {
      alert("Delete failed: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dt) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-slide-up border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Sample #{sample.id}</span>
              <RiskBadge level={sample.monitoring_risk_level} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">{sample.sample_source}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Images */}
          <div className="space-y-3">
            {sample.processed_image_url && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Activity size={12} /> YOLO Processed Image
                </p>
                <img
                  src={getMediaUrl(sample.processed_image_url)}
                  alt="Processed"
                  className="w-full rounded-xl border border-slate-200 object-cover"
                  style={{ maxHeight: 220 }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
            )}
            {sample.original_image_url && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <ImageIcon size={12} /> Original Image
                </p>
                <img
                  src={getMediaUrl(sample.original_image_url)}
                  alt="Original"
                  className="w-full rounded-xl border border-slate-200 object-cover"
                  style={{ maxHeight: 180 }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="card p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">MSMI Detection Metrics</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-cyan-50 rounded-xl p-3 text-center border border-cyan-100">
                  <div className="text-2xl font-bold text-cyan-700">{sample.msmi_score ?? sample.mpi_score ?? "—"}</div>
                  <div className="text-[10px] text-cyan-600 font-medium mt-0.5">MSMI Score</div>
                </div>
                <div className="bg-teal-50 rounded-xl p-3 text-center border border-teal-100">
                  <div className="text-2xl font-bold text-teal-700">{sample.detected_particles ?? "—"}</div>
                  <div className="text-[10px] text-teal-500 font-medium mt-0.5">Detected Particles</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                  <div className="text-lg font-bold text-blue-700">{sample.estimated_particles_per_litre ?? "—"}</div>
                  <div className="text-[10px] text-blue-500 font-medium mt-0.5">Particles / Litre</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <div className="text-lg font-bold text-slate-700">{sample.confidence_score != null ? `${sample.confidence_score}%` : "—"}</div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">Confidence</div>
                </div>
              </div>
            </div>

            {/* Image Quality */}
            <div className="card p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Microscope size={12} /> Image Quality Validation
              </p>
              <InfoRow label="Quality Status" value={sample.image_quality_status} />
              <InfoRow label="Quality Score" value={sample.image_quality_score != null ? Number(sample.image_quality_score).toFixed(2) : "—"} />
              <InfoRow label="Focus Score" value={sample.focus_score != null ? Number(sample.focus_score).toFixed(2) : "—"} />
              <InfoRow label="Brightness Score" value={sample.brightness_score != null ? Number(sample.brightness_score).toFixed(2) : "—"} />
              <InfoRow label="Contrast Score" value={sample.contrast_score != null ? Number(sample.contrast_score).toFixed(2) : "—"} />
              <InfoRow label="Underexposed" value={sample.underexposed_percent != null ? `${Number(sample.underexposed_percent).toFixed(2)}%` : "—"} />
              {sample.quality_warning && (
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800 leading-relaxed">
                  {sample.quality_warning}
                </div>
              )}
            </div>

            {/* Source Risk */}
            <div className="card p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Waves size={12} /> Source-Aware Risk
              </p>
              <InfoRow label="Source Risk Factor" value={sample.source_risk_factor} />
              <InfoRow label="Concentration-only Risk" value={sample.concentration_only_risk_level} />
              <InfoRow label="Final MSMI Risk" value={sample.monitoring_risk_level} />
              <InfoRow label="Concentration Score" value={sample.concentration_score} />
              <InfoRow label="Size Score" value={sample.size_score} />
            </div>

            {/* Details list */}
            <div className="card p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sample Details</p>
              <InfoRow label="Sample Source" value={sample.sample_source} />
              <InfoRow label="Chamber Volume" value={sample.chamber_volume_ml != null ? `${sample.chamber_volume_ml} mL` : "—"} />
              <InfoRow label="Risk Level" value={sample.monitoring_risk_level} />
              <InfoRow label="Avg Particle Area" value={sample.average_particle_area != null ? `${Number(sample.average_particle_area).toFixed(2)} px²` : "—"} />
              <InfoRow label="Avg Brightness" value={sample.average_brightness != null ? Number(sample.average_brightness).toFixed(2) : "—"} />
              <InfoRow label="Size Category" value={sample.size_category} />
              <InfoRow label="Notes" value={sample.notes || "None"} />
              <InfoRow label="Analyzed At" value={formatDate(sample.created_at)} />
            </div>

            {/* Risk Explanation */}
            {sample.risk_explanation && (
              <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-cyan-700 mb-1 flex items-center gap-1">
                  <Gauge size={11} /> MSMI Explanation
                </p>
                <p className="text-xs text-cyan-900 leading-relaxed">{sample.risk_explanation}</p>
              </div>
            )}

            {/* Recommendation */}
            {sample.recommendation && (
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-teal-600 mb-1 flex items-center gap-1">
                  <Info size={11} /> Recommendation
                </p>
                <p className="text-xs text-teal-800 leading-relaxed">{sample.recommendation}</p>
              </div>
            )}

            {/* Delete */}
            <div className="pt-2">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-all border border-transparent hover:border-red-100"
                >
                  <Trash2 size={13} /> Delete this record
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Are you sure you want to delete this test record?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium transition-all"
                    >
                      {deleting ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="px-3 py-1.5 bg-white text-slate-700 text-xs rounded-lg border border-slate-200 hover:bg-slate-50 font-medium transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
