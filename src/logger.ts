import { pino } from "pino";
import { env } from "./env.js";

export const logger = pino(
  {
    level: env.LOGGING_LEVEL,
  },
  // Since STDIO server logs to stdout, we need to log to stderr in order
  // to avoid the client from reading the logs
  env.TRANSPORT === "stdio"
    ? pino.destination(process.stderr)
    : pino.destination(process.stdout)
);
