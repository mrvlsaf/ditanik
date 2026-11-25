/**
 * Converts an Office file (xlsx) to PDF via a self-hosted Gotenberg instance
 * (LibreOffice; Vercel cannot run it). Swappable by replacing this one function.
 */

export class PdfConversionNotConfiguredError extends Error {
  constructor() {
    super(
      "PDF conversion isn't set up yet — set GOTENBERG_URL (and, if your " +
        "Gotenberg is behind Basic Auth, GOTENBERG_BASIC_AUTH_USER / " +
        "GOTENBERG_BASIC_AUTH_PASSWORD) in the environment.",
    );
    this.name = "PdfConversionNotConfiguredError";
  }
}

export class PdfConversionFailedError extends Error {
  constructor(statusCode: number, body: string) {
    super(`PDF conversion failed (Gotenberg returned ${statusCode}): ${body.slice(0, 500)}`);
    this.name = "PdfConversionFailedError";
  }
}

function gotenbergAuthHeader(): string | null {
  const user = process.env.GOTENBERG_BASIC_AUTH_USER;
  const password = process.env.GOTENBERG_BASIC_AUTH_PASSWORD;
  if (!user || !password) {
    return null;
  }
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

export async function convertOfficeFileToPdf(
  bytes: Buffer,
  fileName: string,
): Promise<Buffer> {
  const gotenbergUrl = process.env.GOTENBERG_URL;
  if (!gotenbergUrl) {
    throw new PdfConversionNotConfiguredError();
  }

  const form = new FormData();
  // Gotenberg picks the converter by file extension, so keep the real ".xlsx" name.
  form.append("files", new Blob([new Uint8Array(bytes)]), fileName);

  const headers: Record<string, string> = {};
  const authHeader = gotenbergAuthHeader();
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  const response = await fetch(
    `${gotenbergUrl.replace(/\/$/, "")}/forms/libreoffice/convert`,
    { method: "POST", body: form, headers },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new PdfConversionFailedError(response.status, body);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
