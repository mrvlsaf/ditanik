import { z } from "zod";

import { lpoLineItemsSchema } from "@/modules/lpo/schemas/line-items";

export const createLpoFormSchema = z.object({
  lpoNumber: z.string().trim().min(1, "LPO number is required"),
  nickname: z.string().trim().min(1, "Nickname is required"),
  clientName: z.string().trim().min(1, "Client name is required"),
  receivedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Received date must be YYYY-MM-DD"),
  // Client & commercial details — feed the Quotation / Quote / Invoice / Delivery Note templates.
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

export type CreateLpoFormValues = z.infer<typeof createLpoFormSchema>;
