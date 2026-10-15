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

    // Funnel metrics (integrations monitoring backend, channel "mcp").
    // These override the defaults compiled into src/metrics.ts; both are plain
    // strings rather than z.url() because this schema is parsed at import time
    // and a malformed value in a published package must not crash the user's
    // server — metrics.ts validates the URL and turns telemetry off instead.
    METRICS_URL: z.string().optional(),
    METRICS_API_KEY: z.string().optional(),

    // Where product state lives (the metrics installation id). Default: ~/.lara
    LARA_HOME: z.string().optional(),

    // https://consoledonottrack.com — 1/true/yes disables every event.
    DO_NOT_TRACK: z.string().optional(),
});

export const env = envSchema.parse(process.env);
