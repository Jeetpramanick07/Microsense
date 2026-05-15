import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { downloadSampleReport } from "../api";

export default function DownloadReportButton({
  sampleId,
  label = "Download PDF Report",
  className = "",
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!sampleId || loading) return;

    try {
      setLoading(true);
      await downloadSampleReport(sampleId);
    } catch (error) {
      console.error("PDF report download failed:", error);
      alert("Failed to generate PDF report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={!sampleId || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:-translate-y-0.5 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}

      {loading ? "Generating..." : label}
    </button>
  );
}