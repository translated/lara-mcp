import { z } from "zod/v4";

const envSchema = z.object({
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().default(3000),
    USE_HTTP_SERVER: z.coerce.boolean().default(false),
    LOGGING_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    LARA_API_ID: z.string().optional(),
    LARA_API_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);
