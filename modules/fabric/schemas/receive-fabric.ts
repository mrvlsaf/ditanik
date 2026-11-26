import { z } from "zod";

const receiveFabricBatchSchema = z.object({
  fabricType: z.string().trim().min(1, "Fabric type is required"),
  colour: z.string().trim().min(1, "Colour is required"),
  remarks: z.string().trim().optional(),
  qtyReceived: z.number().positive("Quantity received must be greater than 0"),
});

export const receiveFabricSchema = z.object({
  supplierName: z.string().trim().min(1, "Supplier name is required"),
  invoiceRef: z.string().trim().min(1, "Invoice reference is required"),
  receivedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Received date must be YYYY-MM-DD"),
  /** Optional invoice total including VAT (AED), for the Invoices VAT summary. */
  totalInclVat: z
    .number()
    .min(0, "Invoice total cannot be negative")
    .max(999_999_999_999, "Invoice total is too large")
    .optional(),
  batches: z
    .array(receiveFabricBatchSchema)
    .min(1, "At least one fabric batch is required"),
});

export type ReceiveFabricBatchValues = z.infer<typeof receiveFabricBatchSchema>;
