import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  convertOfficeFileToPdf,
  PdfConversionFailedError,
  PdfConversionNotConfiguredError,
} from "@/modules/documents/infrastructure/pdf-conversion";

type FetchOptions = { method: string; body: unknown; headers: Record<string, string> };

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

beforeEach(() => {
  resetEnv();
  delete process.env.GOTENBERG_URL;
  delete process.env.GOTENBERG_BASIC_AUTH_USER;
  delete process.env.GOTENBERG_BASIC_AUTH_PASSWORD;
});

afterEach(() => {
  resetEnv();
  vi.unstubAllGlobals();
});

describe("convertOfficeFileToPdf", () => {
  it("throws PdfConversionNotConfiguredError when GOTENBERG_URL is unset", async () => {
    await expect(
      convertOfficeFileToPdf(Buffer.from("x"), "invoice.xlsx"),
    ).rejects.toBeInstanceOf(PdfConversionNotConfiguredError);
  });

  it("POSTs to the LibreOffice route with the file and no auth header by default", async () => {
    process.env.GOTENBERG_URL = "https://gotenberg.example.com/";

    const pdfBytes = new Uint8Array([1, 2, 3]);
    const fetchMock = vi.fn(async (_url: string, _options: FetchOptions) => ({
      ok: true,
      arrayBuffer: async () => pdfBytes.buffer,
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await convertOfficeFileToPdf(Buffer.from("data"), "invoice.xlsx");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://gotenberg.example.com/forms/libreoffice/convert");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.headers.Authorization).toBeUndefined();
    expect(Buffer.compare(result, Buffer.from(pdfBytes))).toBe(0);
  });

  it("sends a Basic Auth header when credentials are configured", async () => {
    process.env.GOTENBERG_URL = "https://gotenberg.example.com";
    process.env.GOTENBERG_BASIC_AUTH_USER = "ditanik";
    process.env.GOTENBERG_BASIC_AUTH_PASSWORD = "secret";

    const fetchMock = vi.fn(async (_url: string, _options: FetchOptions) => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(0),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await convertOfficeFileToPdf(Buffer.from("data"), "invoice.xlsx");

    const [, options] = fetchMock.mock.calls[0]!;
    expect(options.headers.Authorization).toBe(
      `Basic ${Buffer.from("ditanik:secret").toString("base64")}`,
    );
  });

  it("throws PdfConversionFailedError on a non-OK response", async () => {
    process.env.GOTENBERG_URL = "https://gotenberg.example.com";

    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => "libreoffice crashed",
    }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      convertOfficeFileToPdf(Buffer.from("data"), "invoice.xlsx"),
    ).rejects.toBeInstanceOf(PdfConversionFailedError);
  });
});
