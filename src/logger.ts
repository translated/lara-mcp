import { pino } from "pino";
import { env } from "./env.js";

export const logger = pino(
  {
    level: env.LOGGING_LEVEL,
  },
  // Since STDIO server logs to stdout, we need to log to stderr in order
  // to avoid the client from reading the logs
  env.USE_HTTP_SERVER
    ? pino.destination(process.stdout)
    : pino.destination(process.stderr)
);
