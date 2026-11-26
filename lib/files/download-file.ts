/** File name from a Content-Disposition header, or null. */
export function fileNameFromDisposition(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1] ? match[1] : null;
}

/** Saves the body of a successful response as a file. */
export async function saveResponse(
  response: Response,
  fallbackName = "download",
): Promise<boolean> {
  if (!response.ok) {
    return false;
  }
  const blob = await response.blob();
  const name =
    fileNameFromDisposition(response.headers.get("Content-Disposition")) ?? fallbackName;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = name;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  return true;
}

/**
 * Fetches a file and saves it, so the page can show a loader until the file is
 * ready. Resolves to false when the server refused, so the caller can fall back.
 */
export async function downloadFile(url: string, fallbackName?: string): Promise<boolean> {
  const response = await fetch(url, { credentials: "same-origin" });
  return saveResponse(response, fallbackName);
}
