/**
 * Terms & Conditions printed on every Quotation.
 *
 * `DEFAULT_QUOTATION_TERMS` is the standard 16-clause text from the client's
 * approved quotation format. It is used whenever Company Settings →
 * "Default terms & conditions" is blank; when that setting has text, it
 * replaces these defaults (one clause per line).
 *
 * A `**double asterisk**` pair marks bold text inside a clause. A leading
 * "Label:" (everything up to the first colon) is always bolded by the
 * workbook builder, so it does not need markers.
 */
export const DEFAULT_QUOTATION_TERMS: readonly string[] = [
  "Approved Sample: All uniforms will be manufactured strictly in accordance with the approved sample, specifications, measurements, colours, branding and design confirmed by the client.",
  "Order Confirmation: An order will be considered confirmed upon release of the Purchase Order (PO) by the client. In case of an urgent requirement where the PO cannot be released immediately, the client must provide written confirmation via email stating that the PO will be released and requesting DEEZANO to proceed with the order.",
  "Fabric: The above quotation is based on the fabric selected and discussed for this requirement. Any request for a different, upgraded, specialised or additional fabric will be subject to revised pricing and availability.",
  "Fabric & Colour Variation: Minor variations in fabric shade, texture and finish may occur between fabric batches and are considered normal manufacturing variations. Production will follow the approved reference/sample.",
  "Measurements & Alterations: DEEZANO will provide reasonable alterations, where required, to ensure the garments meet the approved specifications and intended fit. Any alterations arising from client-requested changes to the approved design, specifications or measurements after production may result in a revised delivery timeline.",
  "Quantity: Final production quantities will be based on the confirmed PO. Any increase or decrease in quantity after order confirmation may result in revised pricing and a revised delivery timeline.",
  "Delivery: Delivery timelines will be communicated based on the confirmed order quantity, approved sample, fabric availability and production schedule. Delays caused by late approvals, delayed measurements, artwork changes, fabric availability or other circumstances beyond DEEZANO’s control may result in a revised delivery timeline.",
  "Payment Terms: Payment terms are **50% ADVANCE . 50% UPON DELIVERY.**",
  "Outstanding Payments: DEEZANO reserves the right to hold or delay further production, deliveries or new orders if previous invoices remain overdue.",
  "Quality & Inspection: The client is requested to inspect the delivered goods within **two (2) working days** of delivery and notify DEEZANO of any manufacturing-related concerns within this period.",
  "Care & Washing: Garments should be washed and maintained in accordance with the care instructions provided. Damage, colour fading, shrinkage or deterioration resulting from incorrect washing, ironing, chemical treatment or improper care shall not be considered a manufacturing defect.",
  "VAT: 5% UAE VAT is applied as shown in the quotation above.",
  "Additional Requirements: Any items, specifications, accessories, embroidery, printing, packaging or services not specifically mentioned in this quotation will be quoted separately.",
  "Client Approvals: Delays in providing approvals, measurements, artwork or fabric confirmation may affect the production and delivery timeline.",
  "Force Majeure: DEEZANO shall not be liable for delays caused by circumstances beyond its reasonable control, including but not limited to supplier delays, fabric shortages, transportation disruptions, government restrictions, strikes, natural events or other unforeseen circumstances.",
  "Acceptance: Placement and confirmation of the order shall constitute the client's acceptance of the above terms and conditions.",
];

/**
 * CompanyProfile.defaultTermsText holds one clause per line. Returns null
 * when unset (or blank) so the caller falls back to DEFAULT_QUOTATION_TERMS.
 */
export function parseTermsText(text: string | null | undefined): string[] | null {
  if (!text) return null;
  const points = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return points.length > 0 ? points : null;
}

/** Number of days a Quotation stays valid after its document date. */
export const QUOTATION_VALIDITY_DAYS = 30;

/** Document date + QUOTATION_VALIDITY_DAYS whole days (UTC-safe). */
export function calculateQuotationValidityDate(documentDate: Date): Date {
  const validUntil = new Date(documentDate.getTime());
  validUntil.setUTCDate(validUntil.getUTCDate() + QUOTATION_VALIDITY_DAYS);
  return validUntil;
}
