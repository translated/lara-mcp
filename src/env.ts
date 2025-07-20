import { z } from "zod/v4";

const envSchema = z.object({
    // Http Server
    HOST: z.string().default("0.0.0.0"),
    PORT: z.coerce.number().default(3000),
    
    // Transport
    TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),

    // Logging
    LOGGING_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

    // Lara STDIO MCP Server
    LARA_ACCESS_KEY_ID: z.string().optional(),
    LARA_ACCESS_KEY_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);
