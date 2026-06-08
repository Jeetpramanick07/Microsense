import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { checkBackendConnection } from './api';
import { AppShell } from './components/ui';
import Analyze from './pages/Analyze';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Reports from './pages/Reports';
import Results from './pages/Results';
import Status from './pages/Status';

const titles = {
  '/': 'Dashboard',
  '/analyze': 'Analyze Sample',
  '/results': 'Analysis Results',
  '/history': 'Sample History',
  '/reports': 'Reports Archive',
  '/status': 'System Status',
};

export default function App() {
  const location = useLocation();
  const [backendOnline, setBackendOnline] = useState(false);
  const [backendChecking, setBackendChecking] = useState(true);
  const [latestResult, setLatestResult] = useState(null);

  const refreshBackend = async () => {
    setBackendChecking(true);
    const online = await checkBackendConnection();
    setBackendOnline(online);
    setBackendChecking(false);
  };

  useEffect(() => {
    refreshBackend();
    const interval = setInterval(refreshBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppShell title={titles[location.pathname] || 'MicroSense AI-Cam'} backendOnline={backendOnline} backendChecking={backendChecking}>
      <Routes>
        <Route path="/" element={<Dashboard backendOnline={backendOnline} />} />
        <Route path="/analyze" element={<Analyze setLatestResult={setLatestResult} />} />
        <Route path="/results" element={<Results latestResult={latestResult} />} />
        <Route path="/history" element={<History />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/status" element={<Status backendOnline={backendOnline} backendChecking={backendChecking} refreshBackend={refreshBackend} />} />
        <Route path="/upload" element={<Navigate to="/analyze" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
