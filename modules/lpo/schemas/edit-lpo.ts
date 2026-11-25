import { z } from "zod";

import { lpoLineItemsSchema } from "@/modules/lpo/schemas/line-items";

/**
 * The client/commercial details and line items subset of createLpoFormSchema.
 * Excludes lpoNumber (unique key), receivedDate (drives the due dates; changed via
 * the date-extension flow with a reason) and the original PDF.
 */
export const editLpoFormSchema = z.object({
  nickname: z.string().trim().min(1, "Nickname is required"),
  clientName: z.string().trim().min(1, "Client name is required"),
  clientSubEntityName: z.string().trim().optional(),
  clientTrn: z.string().trim().optional(),
  invoiceAddress: z.string().trim().min(1, "Invoice address is required"),
  deliveryAddress: z.string().trim().optional(),
  siteCode: z.string().trim().min(1, "Site code is required"),
  paymentTerms: z.string().trim().optional(),
  deliveryTerms: z.string().trim().optional(),
  currency: z.string().trim().min(1).default("AED"),
  lineItems: lpoLineItemsSchema,
});
