import { z } from "zod";

export const createFabricEntrySchema = z.object({
  vendor: z.string().trim().min(1, "Vendor is required.").max(120),
  color: z.string().trim().min(1, "Color is required.").max(80),
  metersReceived: z.coerce
    .number()
    .positive("Meters received must be greater than 0."),
  metersDelivered: z.coerce
    .number()
    .min(0, "Meters delivered cannot be negative."),
  destination: z.string().trim().min(1, "Destination is required.").max(200),
});
