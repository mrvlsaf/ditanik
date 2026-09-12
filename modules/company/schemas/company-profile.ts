import { z } from "zod";

/**
 * Deezano's own letterhead/bank details — a single settings row reused as the
 * constant "from" side of every generated Quotation, Quote, Invoice and
 * Delivery Note. Everything here is optional at the schema level except
 * legalName, since a partially-filled profile is still useful to save as a
 * draft while the rest of the details are gathered.
 */
export const companyProfileSchema = z.object({
  legalName: z.string().trim().min(1, "Legal name is required"),
  trn: z.string().trim().optional(),
  addressLine1: z.string().trim().optional(),
  addressLine2: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  website: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  bankAccountName: z.string().trim().optional(),
  bankAccountNumber: z.string().trim().optional(),
  bankIban: z.string().trim().optional(),
  bankSwiftCode: z.string().trim().optional(),
  defaultTermsText: z.string().trim().optional(),
  defaultFooterText: z.string().trim().optional(),
});

export type CompanyProfileValues = z.infer<typeof companyProfileSchema>;
