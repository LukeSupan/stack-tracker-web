export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function readResponseError(res, fallbackMessage) {
  const text = await res.text();
  const responseLabel = `${fallbackMessage} (${res.status} ${res.statusText})`;
  if (!text) return responseLabel;

  try {
    const parsed = JSON.parse(text);
    return parsed.detail || parsed.message || responseLabel;
  } catch {
    const contentType = res.headers.get("content-type") || "unknown content type";
    return `${responseLabel}: ${contentType} ${text.slice(0, 300)}`;
  }
}
