import { z } from "zod";

const envSchema = z.object({
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // TMDB
  TMDB_ACCESS_TOKEN: z.string().min(1),

  // Site
  SITE_URL: z.string().url().optional(),

  // Stripe (optional — not required for dev)
  STRIPE_SECRET_KEY: z.string().startsWith("sk_").optional(),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const formatted = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
      .join("\n");
    console.error(`[env] Missing or invalid environment variables:\n${formatted}`);
    // In development, throw. In production, allow partial (Stripe may be unset).
    if (process.env.NODE_ENV !== "production") {
      throw new Error(`Environment validation failed:\n${formatted}`);
    }
  }

  cachedEnv = (result.success ? result.data : process.env) as Env;
  return cachedEnv;
}
