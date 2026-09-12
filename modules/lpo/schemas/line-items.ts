import { z } from "zod";

export const lpoLineItemSchema = z.object({
  category: z.string().trim().optional(),
  description: z.string().trim().min(1, "Description is required"),
  articleNo: z.string().trim().optional(),
  quantity: z.number().int().min(1, "Quantity must be an integer of at least 1"),
  unitPrice: z.number().min(0, "Unit price must be 0 or greater"),
  discountPercent: z.number().min(0).max(100).optional(),
});

export const lpoLineItemsSchema = z
  .array(lpoLineItemSchema)
  .min(1, "At least one line item is required");

export type LpoLineItemValues = z.infer<typeof lpoLineItemSchema>;
