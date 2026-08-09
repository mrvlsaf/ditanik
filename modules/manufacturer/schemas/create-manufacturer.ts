import { z } from "zod";

export const createManufacturerSchema = z.object({
  name: z.string().trim().min(1, "Manufacturer name is required"),
});

export type CreateManufacturerValues = z.infer<typeof createManufacturerSchema>;
