import { pino, destination, stdSerializers } from "pino";
import { env } from "./env.js";

export const logger = pino(
  {
    level: env.LOGGING_LEVEL,
    // The codebase logs errors as `{ error }`; pino only serializes the `err` key by default, so
    // register the standard error serializer under `error` too — otherwise Error instances log as
    // an empty `{}` (message/stack are non-enumerable) and failures become undiagnosable.
    serializers: { error: stdSerializers.err },
  },
  // Since STDIO server logs to stdout, we need to log to stderr in order
  // to avoid the client from reading the logs
  env.TRANSPORT === "stdio"
    ? destination(process.stderr)
    : destination(process.stdout)
);
