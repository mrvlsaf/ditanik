import { z } from "zod";

import { lpoLineItemsSchema } from "@/modules/lpo/schemas/line-items";

/**
 * The "client & commercial details" + "line items" subset of createLpoFormSchema —
 * everything a real order can still change after the LPO was first entered
 * (price renegotiated, quantity adjusted, a typo in the address). Deliberately
 * excludes lpoNumber (unique key), receivedDate (drives the +2/+12/+15 due
 * dates — changed via the dedicated date-extension flow instead, which
 * requires a reason), and the original LPO PDF (re-uploading isn't in scope).
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

export type EditLpoFormValues = z.infer<typeof editLpoFormSchema>;
