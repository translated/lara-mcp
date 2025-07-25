import express, { Express, Response } from "express";
import helmet from "helmet";
import cors from "./middleware/cors.js";
import { env } from "#env";
import { ServerException } from "#exception";
import {
  JSONRPCError,
  JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js";
import { logger } from "#logger";
import loggingMiddleware from "./middleware/logging.js";
import { createServer, Server } from "node:http";

export class RestServer {
  private port: number;
  private host: string;

  private express: Express;
  private httpServer?: Server;

  constructor() {
    // -- Member variables
    this.port = env.PORT;
    this.host = env.HOST;

    this.express = express();

    // -- Json parser
    this.express.use(express.json());

    // -- Security
    this.express.use(cors);
    this.express.use(helmet());

    // -- Logging
    this.express.use(loggingMiddleware);
  }

  public start() {
    logger.info(`Starting HTTP server on ${this.host}:${this.port}...`);
    // Bind specifically on 127.0.0.1 to avoid binding to all interfaces
    this.httpServer = createServer(this.express).listen(this.port, this.host, () => {
      logger.info(`HTTP server successfully started on ${this.host}:${this.port}`);
    });
  }

  public stop() {
    if (!this.httpServer) {
      logger.error("Cannot stop HTTP server, it is not started");
      return;
    }

    logger.info(`Stopping HTTP server on ${this.host}:${this.port}...`);
    this.httpServer.close(() => {
      logger.info(`HTTP server successfully stopped on ${this.host}:${this.port}`);
    });
  }

  public configure() {
    return this.express;
  }

  public send(res: Response, payload: ServerException | any): void {
    logger.debug("Sending response to client: " + JSON.stringify(payload));
    if (payload instanceof ServerException) {
      res.status(400).json({
        error: {
          code: payload.code,
          message: payload.message,
        },
      });
      return;
    }

    res.status(200).json(payload);
  }

  public sendJsonRpc(res: Response, payload: ServerException | any): void {
    logger.debug("Sending JSON-RPC response to client: " + JSON.stringify(payload));
    if (payload instanceof ServerException) {
      res.status(400).json(this.createJsonRpcResponse(payload));
      return;
    }

    res.status(200).json(this.createJsonRpcResponse(payload));
  }

  private createJsonRpcResponse(
    payload: ServerException | any
  ): JSONRPCResponse | JSONRPCError {
    if (payload instanceof ServerException) {
      return {
        jsonrpc: "2.0",
        error: {
          code: payload.code,
          message: payload.message,
        },
        id: "",
      };
    }
    
    return {
      jsonrpc: "2.0",
      result: payload,
      id: "",
    };
  }
}
