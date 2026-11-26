/** Address that serves a stored file, to view inline or (with `download`) to save. */
export function fileUrl(fileKey: string, download = false): string {
  const params = new URLSearchParams({ key: fileKey });
  if (download) {
    params.set("download", "1");
  }
  return `/api/files?${params.toString()}`;
}
