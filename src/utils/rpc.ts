import { JSONRPCError } from "@modelcontextprotocol/sdk/types.js";
import { ServerException } from "../exception.js";
import { randomUUID } from "node:crypto";

function createErrorResponse(error: ServerException): JSONRPCError {
  return {
    jsonrpc: "2.0",
    error: {
      code: error.code,
      message: error.message,
    },
    id: randomUUID(),
  };
}

export { createErrorResponse };