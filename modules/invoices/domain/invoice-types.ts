/**
 * The four kinds of invoice on the Invoices page. Plain strings (not Prisma
 * enums) so client components and tests can import this file freely.
 */
export const INVOICE_TYPES = ["tax", "fabric", "accessory", "manufacturing"] as const;
export type InvoiceType = (typeof INVOICE_TYPES)[number];

/** The two kinds that are added on the Add invoice page. */
export const SUPPLIER_INVOICE_TYPES = ["accessory", "manufacturing"] as const;
export type SupplierInvoiceType = (typeof SUPPLIER_INVOICE_TYPES)[number];

export type InvoiceTone = "green" | "blue" | "amber" | "purple";

type InvoiceTypeInfo = {
  label: string;
  /** Short heading for the type card, plural. */
  pluralLabel: string;
  tone: InvoiceTone;
  /** "Client" for invoices you send, "Supplier" for ones you receive. */
  role: "Client" | "Supplier";
  description: string;
};

export const INVOICE_TYPE_INFO: Record<InvoiceType, InvoiceTypeInfo> = {
  tax: {
    label: "Tax invoice",
    pluralLabel: "Tax invoices",
    tone: "green",
    role: "Client",
    description: "Sent to your clients. Made from an LPO or on their own.",
  },
  fabric: {
    label: "Fabric invoice",
    pluralLabel: "Fabric invoices",
    tone: "blue",
    role: "Supplier",
    description: "From fabric suppliers. Added when you receive fabric.",
  },
  accessory: {
    label: "Accessory invoice",
    pluralLabel: "Accessory invoices",
    tone: "amber",
    role: "Supplier",
    description: "Buttons, zips, thread and similar. Added here.",
  },
  manufacturing: {
    label: "Manufacturing invoice",
    pluralLabel: "Manufacturing invoices",
    tone: "purple",
    role: "Supplier",
    description:
      "Billed by workshops or tailors for making your garments. Added here, not linked to anything else.",
  },
};

/** Text for the Add invoice type cards (a little longer than the list cards). */
export const SUPPLIER_INVOICE_CARD_TEXT: Record<
  SupplierInvoiceType,
  { description: string; supplierPlaceholder: string; refPlaceholder: string }
> = {
  accessory: {
    description: "From a supplier of buttons, zips, thread and similar.",
    supplierPlaceholder: "e.g. Button and Zip Co.",
    refPlaceholder: "e.g. ACC-118",
  },
  manufacturing: {
    description:
      "Billed by a workshop or tailor for making your garments. Kept on its own, not linked to a manufacturer or an LPO.",
    supplierPlaceholder: "e.g. Al Noor Tailoring",
    refPlaceholder: "e.g. MFG-0912",
  },
};

export function parseSupplierInvoiceType(
  value: string | null | undefined,
): SupplierInvoiceType | null {
  return SUPPLIER_INVOICE_TYPES.find((type) => type === value) ?? null;
}
