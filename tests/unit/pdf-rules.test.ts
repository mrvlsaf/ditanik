import { describe, expect, it } from "vitest";

import { assertPdfFile } from "@/modules/files/domain/pdf-rules";

describe("assertPdfFile", () => {
  it("accepts a PDF file", () => {
    const file = new File(["%PDF"], "offer.pdf", { type: "application/pdf" });
    expect(() => assertPdfFile(file)).not.toThrow();
  });

  it("rejects non-PDF files", () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    expect(() => assertPdfFile(file)).toThrow(/Only PDF/i);
  });
});
