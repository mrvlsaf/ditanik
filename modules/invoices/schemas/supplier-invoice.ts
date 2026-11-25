import { z } from "zod";

import { SUPPLIER_INVOICE_TYPES } from "@/modules/invoices/domain/invoice-types";

export const supplierInvoiceLineSchema = z.object({
  description: z.string().trim().min(1, "Add a description to every line."),
  quantity: z.number().positive("Quantity must be more than 0."),
  unitPrice: z.number().min(0, "Unit price cannot be negative."),
  vatPercent: z.number().min(0, "VAT % must be between 0 and 100.").max(100),
});

export const supplierInvoiceSchema = z.object({
  type: z.enum(SUPPLIER_INVOICE_TYPES),
  supplierName: z.string().trim().min(1, "Supplier name is required."),
  invoiceRef: z.string().trim().optional(),
  receivedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date received must be YYYY-MM-DD."),
  lines: z.array(supplierInvoiceLineSchema).min(1, "Add at least one invoice line."),
});

export type SupplierInvoiceValues = z.infer<typeof supplierInvoiceSchema>;
