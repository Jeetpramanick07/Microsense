import { useEffect, useState } from 'react';
import {
  getHardwareStatus,
  startHardwareScan,
  getLatestHardwareResult,
  convertWindowsPathToUrl,
} from '../api';

export default function HardwareScanPanel({ onScanComplete }) {
  const [hardwareStatus, setHardwareStatus] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  async function loadHardwareStatus() {
    try {
      setLoadingStatus(true);
      setError('');

      const data = await getHardwareStatus();
      setHardwareStatus(data);
    } catch (err) {
      setError(err.message || 'Unable to connect to hardware API');
      setHardwareStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }

  async function handleScan() {
    try {
      setScanning(true);
      setError('');
      setScanResult(null);

      await startHardwareScan();

      let attempts = 0;
      const maxAttempts = 60;

      const interval = setInterval(async () => {
        attempts += 1;

        try {
          const result = await getLatestHardwareResult();

          if (result?.scan_status === 'completed') {
            setScanResult(result);
            setScanning(false);
            clearInterval(interval);

            if (typeof onScanComplete === 'function') {
              onScanComplete();
            }
          }

          if (result?.scan_status === 'failed') {
            setError(result.message || 'Hardware scan failed');
            setScanning(false);
            clearInterval(interval);
          }

          if (attempts >= maxAttempts) {
            setError('Hardware scan timeout. ESP32 did not return result.');
            setScanning(false);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Polling hardware result failed:', err);

          if (attempts >= maxAttempts) {
            setError('Could not fetch hardware scan result.');
            setScanning(false);
            clearInterval(interval);
          }
        }
      }, 1000);
    } catch (err) {
      setError(err.message || 'Hardware scan request failed');
      setScanning(false);
    }
  }

  useEffect(() => {
    loadHardwareStatus();
  }, []);

  const capturedImageUrl = convertWindowsPathToUrl(
    scanResult?.captured_image_path
  );

  const processedImageUrl = convertWindowsPathToUrl(
    scanResult?.processed_image_path
  );

  const statusColor =
    hardwareStatus?.status === 'connected'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
      : 'border-red-500/30 bg-red-500/10 text-red-700';

  const commandColor =
    hardwareStatus?.command === 'START_SCAN'
      ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700'
      : 'border-slate-300 bg-slate-50 text-slate-700';

  const riskColor =
    scanResult?.risk_level === 'High'
      ? 'border-red-500/30 bg-red-500/10 text-red-700'
      : scanResult?.risk_level === 'Moderate'
      ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700'
      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';

  return (
    <section className="stitch-card overflow-hidden">
      <div className="border-b border-outline-variant px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-primary">
              Hardware Control
            </p>

            <h3 className="mt-1 font-display text-xl font-bold">
              MicroSense AI-Cam Scan Station
            </h3>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-on-surface-variant">
              Start a physical ESP32-controlled scan from the dashboard. The
              ESP32 turns ON illumination, triggers backend USB microscope
              capture, runs YOLO26n detection, and returns the result.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadHardwareStatus}
              disabled={loadingStatus}
              className="btn-secondary"
            >
              {loadingStatus ? 'Checking...' : 'Check Hardware'}
            </button>

            <button
              onClick={handleScan}
              disabled={scanning}
              className="btn-primary"
            >
              {scanning ? 'Waiting for ESP32...' : 'Start Hardware Scan'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-on-surface-variant">
              Hardware API
            </p>

            <div
              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-extrabold ${statusColor}`}
            >
              {hardwareStatus?.status || 'Unknown'}
            </div>

            <p className="mt-3 text-sm text-on-surface-variant">
              {hardwareStatus?.message || 'Status not checked yet'}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-on-surface-variant">
              ESP32 Command
            </p>

            <div
              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-extrabold ${commandColor}`}
            >
              {hardwareStatus?.command || 'IDLE'}
            </div>

            <p className="mt-3 text-sm text-on-surface-variant">
              {hardwareStatus?.scan_requested
                ? 'Dashboard has requested a physical scan.'
                : 'No scan command pending.'}
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-on-surface-variant">
              Scan Risk
            </p>

            <div
              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-extrabold ${riskColor}`}
            >
              {scanResult?.risk_level || 'Pending'}
            </div>

            <p className="mt-3 text-sm text-on-surface-variant">
              Based on accepted microplastic-like particle candidates.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {scanning && (
          <div className="mt-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm font-semibold text-yellow-800">
            Scan command sent. Waiting for ESP32 to receive command, turn ON
            hardware, capture image, and return YOLO26n result.
          </div>
        )}

        {scanResult && (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-5">
              <MetricCard
                label="Detected"
                value={scanResult.detected_particles}
              />

              <MetricCard
                label="Accepted"
                value={scanResult.accepted_particles}
              />

              <MetricCard
                label="Rejected"
                value={scanResult.rejected_particles}
              />

              <MetricCard
                label="Hybrid Score"
                value={scanResult.hybrid_score}
              />

              <MetricCard
                label="Image Quality"
                value={`${scanResult.image_quality_score} / ${scanResult.image_quality_status}`}
              />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <ImagePreview
                title="Captured USB Microscope Image"
                imageUrl={capturedImageUrl}
              />

              <ImagePreview
                title="YOLO26n Processed Image"
                imageUrl={processedImageUrl}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>

      <h3 className="mt-3 break-words font-display text-2xl font-bold">
        {value ?? '—'}
      </h3>
    </div>
  );
}

function ImagePreview({ title, imageUrl }) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-low">
      <div className="border-b border-outline-variant bg-white px-4 py-3">
        <span className="text-sm font-extrabold">{title}</span>
      </div>

      <div className="flex min-h-[280px] items-center justify-center p-4">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="max-h-[320px] rounded-lg object-contain shadow-sm"
          />
        ) : (
          <span className="text-sm text-on-surface-variant">
            No image available
          </span>
        )}
      </div>
    </div>
  );
}