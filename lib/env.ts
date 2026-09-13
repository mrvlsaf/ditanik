import { z } from "zod";

const envSchema = z.object({
  // Required — the app can't function without these
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_GOOGLE_ID: z.string().min(1, "AUTH_GOOGLE_ID is required"),
  AUTH_GOOGLE_SECRET: z.string().min(1, "AUTH_GOOGLE_SECRET is required"),
  ALLOWED_EMAILS: z
    .string()
    .min(1, "ALLOWED_EMAILS is required — without it, nobody can sign in"),
  CRON_SECRET: z.string().min(1, "CRON_SECRET is required"),

  // Optional — features degrade gracefully without these
  OVERDUE_NOTIFY_EMAIL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  APP_BASE_URL: z.string().optional(),
  GOTENBERG_URL: z.string().optional(),
  GOTENBERG_BASIC_AUTH_USER: z.string().optional(),
  GOTENBERG_BASIC_AUTH_PASSWORD: z.string().optional(),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

export function validateEnv(): void {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing environment variables:\n${missing}\n\nCheck .env against .env.example.`,
    );
  }
}