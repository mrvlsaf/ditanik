import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { extractLpoData, type PdfLine } from "@/modules/lpo/domain/lpo-extraction";
import { extractPdfLines } from "@/modules/lpo/infrastructure/pdf-text-extraction";

describe("extractLpoData — synthetic layouts", () => {
  it("reads label/value header fields, including a value wrapped onto the next line", () => {
    const lines: PdfLine[] = [
      { page: 1, y: 700, tokens: [{ x: 327, text: "Order Number" }, { x: 422, text: "999AAA111" }] },
      { page: 1, y: 690, tokens: [{ x: 422, text: "#00777" }] },
      { page: 1, y: 680, tokens: [{ x: 327, text: "Order date" }, { x: 422, text: "01.03.2027 09:00:00" }] },
      { page: 1, y: 670, tokens: [{ x: 327, text: "Date of delivery" }, { x: 422, text: "02.03.2027" }] },
      { page: 1, y: 660, tokens: [{ x: 327, text: "Currency" }, { x: 422, text: "UAE Dirhams" }] },
      { page: 1, y: 640, tokens: [{ x: 66, text: "Terms of delivery" }, { x: 192, text: "---" }] },
      { page: 1, y: 630, tokens: [{ x: 66, text: "Terms of payment" }, { x: 192, text: "30 DAYS CREDIT" }] },
    ];

    const result = extractLpoData(lines);
    expect(result.orderNumber).toBe("999AAA111 #00777");
    expect(result.orderDate).toBe("2027-03-01");
    expect(result.deliveryDate).toBe("2027-03-02");
    expect(result.currency).toBe("AED");
    expect(result.paymentTerms).toBe("30 DAYS CREDIT");
    // "---" is a placeholder, not a real value.
    expect(result.deliveryTerms).toBeNull();
  });

  it("splits the side-by-side invoice/delivery address columns by x-position", () => {
    const lines: PdfLine[] = [
      {
        page: 1,
        y: 500,
        tokens: [
          { x: 66, text: "Invoice address" },
          { x: 329, text: "Delivery address" },
        ],
      },
      {
        page: 1,
        y: 490,
        tokens: [
          { x: 66, text: "Acme Test Kitchen LLC" },
          { x: 329, text: "Acme Test Kitchen LLC" },
        ],
      },
      { page: 1, y: 480, tokens: [{ x: 66, text: "ACME HOLDINGS GROUP LLC" }] },
      { page: 1, y: 470, tokens: [{ x: 66, text: "TRN: 123456789000123" }] },
      {
        page: 1,
        y: 460,
        tokens: [
          { x: 66, text: "Unit 5, Business Bay" },
          { x: 329, text: "Warehouse 2, Al Quoz" },
        ],
      },
      { page: 1, y: 450, tokens: [{ x: 66, text: "Dubai, UAE" }, { x: 329, text: "Dubai, UAE" }] },
      {
        page: 1,
        y: 430,
        tokens: [{ x: 66, text: "Position Item name" }, { x: 230, text: "Article no./" }],
      },
    ];

    const result = extractLpoData(lines);
    expect(result.clientName).toBe("Acme Test Kitchen LLC");
    expect(result.clientSubEntityName).toBe("ACME HOLDINGS GROUP LLC");
    expect(result.clientTrn).toBe("123456789000123");
    expect(result.invoiceAddress).toBe("Unit 5, Business Bay\nDubai, UAE");
    // Delivery column's own name-repeat line is dropped since it matches the invoice client name.
    expect(result.deliveryAddress).toBe("Warehouse 2, Al Quoz\nDubai, UAE");
  });

  it("parses one line item per Position-column marker, reading price/quantity only off the item's first line", () => {
    const lines: PdfLine[] = [
      { page: 1, y: 500, tokens: [{ x: 66, text: "Position Item name" }, { x: 230, text: "Article no./" }] },
      {
        page: 1,
        y: 480,
        tokens: [
          { x: 80, text: "1" },
          { x: 102, text: "APRON -Full-length kitchen apron" },
          { x: 233, text: "(12-000111)" },
          { x: 309, text: "45.00" },
          { x: 357, text: "3.000" },
          { x: 400, text: "135.00" },
        ],
      },
      // Continuation line: unit descriptor + a stray "5%" near the price column,
      // plus the real Discount % in parens — must not be mistaken for price/qty.
      {
        page: 1,
        y: 470,
        tokens: [
          { x: 102, text: "in white polycotton" },
          { x: 239, text: "1 Piece /" },
          { x: 319, text: "5%" },
          { x: 460, text: "(10.00%)" },
        ],
      },
      {
        page: 1,
        y: 440,
        tokens: [
          { x: 80, text: "2" },
          { x: 102, text: "HAT -Chef hat, adjustable" },
          { x: 233, text: "(12-000222)" },
          { x: 309, text: "20.00" },
          { x: 357, text: "5.000" },
          { x: 400, text: "100.00" },
        ],
      },
      { page: 1, y: 410, tokens: [{ x: 66, text: "Total value of order" }, { x: 425, text: "235.00" }] },
    ];

    const result = extractLpoData(lines);
    expect(result.lineItems).toHaveLength(2);

    const [apron, hat] = result.lineItems;
    if (!apron || !hat) throw new Error("expected two line items");
    expect(apron.description).toBe("APRON -Full-length kitchen apron in white polycotton");
    expect(apron.articleNo).toBe("12-000111");
    expect(apron.unitPrice).toBe(45);
    expect(apron.quantity).toBe(3);
    expect(apron.discountPercent).toBe(10);

    expect(hat.description).toBe("HAT -Chef hat, adjustable");
    expect(hat.articleNo).toBe("12-000222");
    expect(hat.unitPrice).toBe(20);
    expect(hat.quantity).toBe(5);
    // No "(NN.NN%)" token in this item's group at all.
    expect(hat.discountPercent).toBeNull();
  });

  it("returns an all-null/empty result rather than throwing when nothing recognizable is present", () => {
    const result = extractLpoData([
      { page: 1, y: 100, tokens: [{ x: 10, text: "Just some unrelated document text." }] },
    ]);
    expect(result.orderNumber).toBeNull();
    expect(result.clientName).toBeNull();
    expect(result.lineItems).toEqual([]);
  });
});

describe("extractLpoData — real sample LPO (Ishraq Hospitality layout)", () => {
  it("prefills header fields, addresses, and both line items from the real JOHNLPO.pdf sample", async () => {
    const bytes = readFileSync(
      path.join(__dirname, "..", "fixtures", "johnlpo-sample.pdf"),
    );
    const lines = await extractPdfLines(bytes);
    const result = extractLpoData(lines);

    expect(result.orderNumber).toBe("32610199732776UFYVHH #034555");
    expect(result.orderDate).toBe("2026-06-25");
    expect(result.deliveryDate).toBe("2026-06-26");
    expect(result.currency).toBe("AED");

    expect(result.clientName).toBe("The Plaza Bistro Restaurant & Cafe LLC");
    expect(result.clientSubEntityName).toBe("MOHAMED & OBAID ALMULLA LLC");
    expect(result.clientTrn).toBe("100584549800003");
    expect(result.invoiceAddress).toContain("Unit#Rest2, American Hospital");
    expect(result.invoiceAddress).toContain("AE - 8668 Dubai");
    expect(result.deliveryAddress).toContain("Unit#Rest2, American Hospital");
    expect(result.deliveryAddress).toContain("Purchasing Department");

    expect(result.paymentTerms).toBe("10 DAYS CREDIT");
    // The source PDF prints "---" for delivery terms — a placeholder, not a value.
    expect(result.deliveryTerms).toBeNull();

    expect(result.lineItems).toHaveLength(2);
    const [shirt, trousers] = result.lineItems;
    if (!shirt || !trousers) throw new Error("expected two line items");

    expect(shirt.description).toContain("SHIRT/BLOUSE");
    expect(shirt.description).toContain("Savana Coffee Shop");
    expect(shirt.description).toContain("APP32614429586023_3");
    expect(shirt.articleNo).toBe("99-471979");
    expect(shirt.quantity).toBe(2);
    expect(shirt.unitPrice).toBe(80);
    expect(shirt.discountPercent).toBe(0);

    expect(trousers.description).toContain("TROUSERS");
    expect(trousers.articleNo).toBe("99-274265");
    expect(trousers.quantity).toBe(2);
    expect(trousers.unitPrice).toBe(75);
    expect(trousers.discountPercent).toBe(0);
  });
});
