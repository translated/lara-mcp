import { z } from "zod";

const envSchema = z.object({
  ALLOWED_ORIGINS: z.string().transform((val) => val.split(",").map((origin) => origin.trim())),
});

export const env = envSchema.parse(process.env);