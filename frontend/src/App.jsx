import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import UploadPage from "./components/UploadPage";
import HistoryPage from "./components/HistoryPage";

import { checkBackendConnection } from "./api";

export default function App() {
  const [backendOnline, setBackendOnline] = useState(false);
  const [backendChecking, setBackendChecking] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const checkBackend = async () => {
    try {
      setBackendChecking(true);
      const online = await checkBackendConnection();
      setBackendOnline(online);
    } catch {
      setBackendOnline(false);
    } finally {
      setBackendChecking(false);
    }
  };

  useEffect(() => {
    checkBackend();

    const interval = setInterval(() => {
      if (!isAnalyzing) {
        checkBackend();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const systemStatus = {
    backendConnected: backendOnline,
    backendChecking: backendChecking,
    databaseReady: backendOnline,
    latestSampleSync: backendOnline,
    yolo26Ready: backendOnline,
    cameraReady: "optional",
    esp32Ready: "optional",
    oledReady: "optional",
    isAnalyzing: isAnalyzing,
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-cyan-50 via-white to-teal-50 pt-16 pb-24 text-slate-900 sm:pt-20 lg:pb-8">
      <Navbar
        backendOnline={backendOnline}
        backendChecking={backendChecking}
        isAnalyzing={isAnalyzing}
      />

      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              systemStatus={systemStatus}
              backendOnline={backendOnline}
              backendChecking={backendChecking}
              refreshBackend={checkBackend}
            />
          }
        />

        <Route
          path="/upload"
          element={
            <UploadPage
              setGlobalAnalyzing={setIsAnalyzing}
              backendOnline={backendOnline}
              refreshBackend={checkBackend}
            />
          }
        />

        <Route
          path="/history"
          element={
            <HistoryPage
              backendOnline={backendOnline}
              refreshBackend={checkBackend}
            />
          }
        />
      </Routes>
    </div>
  );
}