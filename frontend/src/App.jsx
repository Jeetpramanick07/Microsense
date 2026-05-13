import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./components/Dashboard.jsx";
import UploadPage from "./components/UploadPage.jsx";
import HistoryPage from "./components/HistoryPage.jsx";
import {
  checkBackendConnection,
  checkDatabaseReady,
  getLatestSample,
  getSamples,
} from "./api.js";

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
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return (
    <div className="min-h-screen bg-mesh">
      <Navbar
        backendConnected={systemStatus.backendConnected}
        checking={checking}
        onRefresh={refreshStatus}
      />
      <main className="pb-16">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                systemStatus={systemStatus}
                latestSample={latestSample}
                checking={checking}
                onRefresh={refreshStatus}
              />
            }
          />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route
            path="*"
            element={
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <span className="text-6xl">🔬</span>
                <h1 className="text-2xl font-bold text-slate-800">Page Not Found</h1>
                <a href="/" className="text-teal-600 hover:underline text-sm">Return to Dashboard →</a>
              </div>
            }
          />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/80 py-4 px-6 text-center">
        <p className="text-xs text-slate-400">
          MicroSense AI-Cam · Hardware-linked AI microplastic monitoring prototype ·{" "}
          <span className="font-mono">FastAPI + YOLO26n + Hybrid validation + React</span>
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
