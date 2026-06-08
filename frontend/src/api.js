export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function safeFetch(url, options = {}) {
  try {
    return await fetch(url, options);
  } catch (error) {
    console.error('Network/API error:', error);
    throw new Error('Could not connect to backend server');
  }
}

export function getMediaUrl(path) {
  if (!path) return '';
  if (String(path).startsWith('http')) return path;
  const cleanPath = String(path).startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export async function checkBackendConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

export async function getLatestSample() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/samples/latest`, {
      method: 'GET',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (response.status === 404 || response.status === 204) return null;
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch latest sample:', error);
    return null;
  }
}

export async function getSamples(params = {}) {
  try {
    const url = new URL(`${API_BASE_URL}/api/samples/`);
    if (params.risk_level) url.searchParams.set('risk_level', params.risk_level);
    if (params.source) url.searchParams.set('source', params.source);
    if (params.limit) url.searchParams.set('limit', params.limit);

    const response = await fetch(url.toString(), {
      method: 'GET',
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch samples:', error);
    return [];
  }
}

export async function getSampleById(sample_id) {
  if (!sample_id) throw new Error('Sample ID is required');
  const response = await safeFetch(`${API_BASE_URL}/api/samples/${sample_id}`, {
    method: 'GET',
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Failed to fetch sample with ID ${sample_id}`);
  return response.json();
}

export async function analyzeSample({ file, sample_source, chamber_volume_ml, notes, detector_model = 'yolo26' }) {
  if (!file) throw new Error('Please select a sample image');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('sample_source', sample_source || 'Manual Upload');
  formData.append('chamber_volume_ml', chamber_volume_ml || 50);
  if (notes) formData.append('notes', notes);

  const endpoint = detector_model === 'yolov5'
    ? '/api/samples/analyze-image'
    : '/api/samples/analyze-image-yolo26';

  const response = await safeFetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    body: formData,
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      typeof errorData?.detail === 'string'
        ? errorData.detail
        : typeof errorData?.error === 'string'
        ? errorData.error
        : `Image analysis failed with status ${response.status}`
    );
  }
  return response.json();
}

export async function downloadSampleReport(sample_id) {
  if (!sample_id) throw new Error('Sample ID is required to download report');
  const response = await fetch(`${API_BASE_URL}/api/samples/${sample_id}/report`, {
    method: 'GET',
    cache: 'no-store',
    headers: { accept: 'application/pdf' },
  });
  if (!response.ok) throw new Error('Failed to generate PDF report');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `microsense_sample_${sample_id}_report.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
  return true;
}

export function getDetectorLabel(sample) {
  if (!sample) return 'YOLO26n + Hybrid Filter';
  const notes = String(sample.notes || '').toLowerCase();
  const processed_image_url = String(sample.processed_image_url || '').toLowerCase();
  if (notes.includes('yolo26') || notes.includes('yolo26n') || processed_image_url.includes('yolo26')) {
    return 'YOLO26n + Hybrid Filter';
  }
  return 'YOLOv5 Baseline';
}

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(decimals);
  return value;
}

export function getRiskTone(monitoring_risk_level) {
  const risk = String(monitoring_risk_level || '').toLowerCase();
  if (risk.includes('low')) return 'low';
  if (risk.includes('moderate')) return 'moderate';
  if (risk.includes('high')) return 'high';
  return 'unknown';
}
