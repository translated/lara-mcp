import { z } from "zod/v4";

const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    USE_HTTP_SERVER: z.coerce.boolean().default(false),
    LARA_API_ID: z.string().optional(),
    LARA_API_SECRET: z.string().optional(),
    LOGGING_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const env = envSchema.parse(process.env);
