import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  CORS_ORIGIN: z.string().default("http://localhost:8080"),
  EMAIL: z.string().email("EMAIL must be a valid email address"),
  APP_PASSWORD: z.string().min(1, "APP_PASSWORD is required"),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid server environment variables",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Server environment validation failed");
}

export const env = parsed.data;
