import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import UploadPage from "./components/UploadPage.jsx";
import HistoryPage from "./components/HistoryPage.jsx";
import { checkBackendConnection, checkDatabaseReady, getLatestSample, getSamples } from "./api.js";

function AppInner() {
  const [checking, setChecking] = useState(true);
  const [systemStatus, setSystemStatus] = useState({
    backendConnected: false,
    databaseReady: false,
    latestSampleAvailable: false,
    lastChecked: null,
    totalSamples: null,
  });
  const [latestSample, setLatestSample] = useState(null);

  const refreshStatus = useCallback(async () => {
    setChecking(true);
    try {
      const [backendOk, dbOk, latest] = await Promise.all([
        checkBackendConnection(),
        checkDatabaseReady(),
        getLatestSample(),
      ]);
      let totalSamples = null;
      if (dbOk) {
        try {
          const all = await getSamples({ limit: 1000 });
          totalSamples = Array.isArray(all) ? all.length : null;
        } catch {
          totalSamples = null;
        }
      }
      setLatestSample(latest);
      setSystemStatus({
        backendConnected: backendOk,
        databaseReady: dbOk,
        latestSampleAvailable: !!latest,
        lastChecked: new Date(),
        totalSamples,
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return (
    <div className="min-h-screen bg-mesh text-slate-900">
      <Navbar backendConnected={systemStatus.backendConnected} checking={checking} onRefresh={refreshStatus} />
      <main className="pb-28 md:pb-16">
        <Routes>
          <Route path="/" element={<Dashboard systemStatus={systemStatus} latestSample={latestSample} checking={checking} onRefresh={refreshStatus} />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-6 py-32 text-center"><div className="mb-5 rounded-3xl bg-white p-6 text-6xl shadow-xl">🔬</div><h1 className="text-3xl font-black text-slate-950">Page Not Found</h1><p className="mt-2 text-slate-500">This MicroSense route does not exist.</p><Link to="/" className="mt-6 rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-200 transition hover:-translate-y-0.5">Return to Dashboard</Link></div>} />
        </Routes>
      </main>
      <footer className="mb-24 border-t border-cyan-100 bg-white/70 px-4 py-6 text-center backdrop-blur-xl md:mb-0 sm:px-6">
        <p className="mx-auto max-w-sm text-xs leading-6 text-slate-500 sm:max-w-none">MicroSense AI-Cam · Prototype AI microplastic monitoring system · <span className="font-mono text-cyan-700">FastAPI + YOLO26n + Hybrid Validation + React</span></p>
      </footer>
    </div>
  );
}

export default function App() {
  return <BrowserRouter><AppInner /></BrowserRouter>;
}
