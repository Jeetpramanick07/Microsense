const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (error) {
    console.error("Network/API error:", error);
    throw new Error("Could not connect to backend server");
  }
}

export { API_BASE_URL };

export function getMediaUrl(path) {
  if (!path) return "";

  if (path.startsWith("http")) {
    return path;
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  return `${API_BASE_URL}${cleanPath}`;
}

export async function checkBackendConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Backend health check failed:", error);
    return false;
  }
}

export async function checkDatabaseReady() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/samples/latest`, {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    if (response.status === 404 || response.status === 204) {
      return true;
    }

    return response.ok;
  } catch (error) {
    console.error("Database readiness check failed:", error);
    return false;
  }
}

export async function getLatestSample() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/samples/latest`, {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    if (response.status === 404 || response.status === 204) {
      return null;
    }

    if (!response.ok) {
      console.error("Latest sample API failed:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch latest sample:", error);
    return null;
  }
}

export async function getSamples(params = {}) {
  try {
    const url = new URL(`${API_BASE_URL}/api/samples/`);

    if (params.risk_level) {
      url.searchParams.set("risk_level", params.risk_level);
    }

    if (params.source) {
      url.searchParams.set("source", params.source);
    }

    if (params.limit) {
      url.searchParams.set("limit", params.limit);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error("Samples API failed:", response.status);
      return [];
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch samples:", error);
    return [];
  }
}

export async function getSampleById(id) {
  if (!id) {
    throw new Error("Sample ID is required");
  }

  const response = await safeFetch(`${API_BASE_URL}/api/samples/${id}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sample with ID ${id}`);
  }

  return response.json();
}

export async function deleteSample(id) {
  if (!id) {
    throw new Error("Sample ID is required");
  }

  const response = await safeFetch(`${API_BASE_URL}/api/samples/${id}`, {
    method: "DELETE",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      typeof errorData?.detail === "string"
        ? errorData.detail
        : `Failed to delete sample with ID ${id}`
    );
  }

  return true;
}

export async function analyzeSample({
  file,
  sampleSource,
  chamberVolumeMl,
  notes,
  detectorModel = "yolo26",
}) {
  if (!file) {
    throw new Error("Please select a sample image");
  }

  const formData = new FormData();

  formData.append("file", file);
  formData.append("sample_source", sampleSource || "Manual Upload");
  formData.append("chamber_volume_ml", chamberVolumeMl || 50);

  if (notes) {
    formData.append("notes", notes);
  }

  const endpoint =
    detectorModel === "yolov5"
      ? "/api/samples/analyze-image"
      : "/api/samples/analyze-image-yolo26";

  const response = await safeFetch(`${API_BASE_URL}${endpoint}`, {
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
      endpoint,
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

export function getDetectorLabel(sample) {
  if (!sample) {
    return "YOLO26n Main Detector";
  }

  const notes = String(sample.notes || "").toLowerCase();
  const processedUrl = String(sample.processed_image_url || "").toLowerCase();

  if (
    notes.includes("yolo26") ||
    notes.includes("yolo26n") ||
    processedUrl.includes("yolo26")
  ) {
    return "YOLO26n Main Detector";
  }

  return "YOLOv5 Baseline";
}

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? value : value.toFixed(decimals);
  }

  return value;
}

export function getRiskTone(riskLevel) {
  const risk = String(riskLevel || "").toLowerCase();

  if (risk.includes("low")) {
    return "low";
  }

  if (risk.includes("moderate")) {
    return "moderate";
  }

  if (risk.includes("high")) {
    return "high";
  }

  return "unknown";
}

export async function downloadSampleReport(sampleId) {
  if (!sampleId) {
    throw new Error("Sample ID is required to download report");
  }

  const response = await fetch(`${API_BASE_URL}/api/samples/${sampleId}/report`, {
    method: "GET",
    cache: "no-store",
    headers: {
      accept: "application/pdf",
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("Report download failed:", response.status, errorText);
    throw new Error("Failed to generate PDF report");
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `microsense_sample_${sampleId}_report.pdf`;

  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);

  return true;
}