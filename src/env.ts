import { z } from "zod";

const envSchema = z.object({
    PORT: z.number().default(3000),
    USE_HTTP_SERVER: z.boolean().optional().default(false),
    LARA_API_ID: z.string().optional(),
    LARA_API_KEY: z.string().optional(),
});

console.log(process.env);

export const env = envSchema.parse(process.env);