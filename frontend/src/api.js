export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const getMediaUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
};

export async function checkBackendConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/docs`, { signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function checkDatabaseReady() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/samples/`, { signal: AbortSignal.timeout(5000) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getLatestSample() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/samples/latest`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function getSamples(params = {}) {
  const url = new URL(`${API_BASE_URL}/api/samples/`);
  if (params.risk_level) url.searchParams.set("risk_level", params.risk_level);
  if (params.source) url.searchParams.set("source", params.source);
  if (params.limit) url.searchParams.set("limit", params.limit);
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error("Failed to fetch history");
  return response.json();
}

export async function getSampleById(id) {
  const response = await fetch(`${API_BASE_URL}/api/samples/${id}`);
  if (!response.ok) throw new Error("Failed to fetch sample details");
  return response.json();
}

export async function deleteSample(id) {
  const response = await fetch(`${API_BASE_URL}/api/samples/${id}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Failed to delete sample");
  return response.json();
}

export async function analyzeSample({ file, sampleSource, chamberVolumeMl, notes }) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sample_source", sampleSource);
  formData.append("chamber_volume_ml", chamberVolumeMl);
  if (notes) formData.append("notes", notes);

  const response = await fetch(`${API_BASE_URL}/api/samples/analyze-image`, {
    method: "POST",
    body: formData,
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      typeof errorData?.detail === "string"
        ? errorData.detail
        : "Failed to analyze image"
    );
  }
  return response.json();
}
