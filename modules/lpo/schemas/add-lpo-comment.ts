import { z } from "zod";

export const addLpoCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Comment cannot be empty.")
    .max(2000, "Comment must be at most 2000 characters."),
});
