export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const getMediaUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;

  // Prevent double slash problems
  const cleanBase = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
};

async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    console.error("Network/API error:", error);
    throw new Error("Could not connect to backend server");
  }
}

export async function checkBackendConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function checkDatabaseReady() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/samples/`, {
      signal: AbortSignal.timeout(5000),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function getLatestSample() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/samples/latest`, {
      signal: AbortSignal.timeout(5000),
    });

    // Empty database or backend says no latest sample
    if (response.status === 404) return null;
    if (response.status === 204) return null;

    if (!response.ok) return null;

    const data = await response.json();

    // Backend permanent fix may return null
    if (!data) return null;

    return data;
  } catch {
    return null;
  }
}

export async function getSamples(params = {}) {
  const url = new URL(`${API_BASE_URL}/api/samples/`);

  if (params.risk_level) url.searchParams.set("risk_level", params.risk_level);
  if (params.source) url.searchParams.set("source", params.source);
  if (params.limit) url.searchParams.set("limit", params.limit);

  const response = await safeFetch(url.toString());

  if (!response.ok) {
    throw new Error("Failed to fetch history");
  }

  return response.json();
}

export async function getSampleById(id) {
  const response = await safeFetch(`${API_BASE_URL}/api/samples/${id}`);

  if (!response.ok) {
    throw new Error("Failed to fetch sample details");
  }

  return response.json();
}

export async function deleteSample(id) {
  const response = await safeFetch(`${API_BASE_URL}/api/samples/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete sample");
  }

  return response.json();
}

export async function analyzeSample({
  file,
  sampleSource,
  chamberVolumeMl,
  notes,
}) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append("sample_source", sampleSource || "Manual Upload");
  formData.append("chamber_volume_ml", chamberVolumeMl || 50);

  if (notes) {
    formData.append("notes", notes);
  }

  const response = await safeFetch(`${API_BASE_URL}/api/samples/analyze-image`, {
    method: "POST",
    body: formData,
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    console.error("Analyze API failed:", {
      status: response.status,
      errorData,
    });

    throw new Error(
      typeof errorData?.detail === "string"
        ? errorData.detail
        : typeof errorData?.error === "string"
        ? errorData.error
        : `Image analysis failed with status ${response.status}`
    );
  }

  return response.json();
}