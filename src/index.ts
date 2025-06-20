import express, { Request } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { InvalidCredentialsError, InvalidSessionIdError } from "./exception.js";
import { createErrorResponse } from "./utils/rpc.js";
import getServer from "./mcp.server.js";

const app = express();
app.use(express.json());

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // A single header is reccomended instead of multiple headers,
    // since OAuth2 with a Bearer token is the standard way to authenticate with the streammable http server.
    // In this case, we're using a api key authentication method in a accessKey:secretKey format.
    const xLaraApiKey = req.headers["x-lara-api-key"] as string | undefined;
    if(!xLaraApiKey || xLaraApiKey.split(":").length !== 2) {
      res.status(400).json(createErrorResponse(new InvalidCredentialsError()));
      return;
    }

    const [laraAccessKeyId, laraAccessKeySecret] = xLaraApiKey.split(":");
    
    transport = await handleInitializeRequest(laraAccessKeyId, laraAccessKeySecret);
  } else {
    res.status(400).json(createErrorResponse(new InvalidSessionIdError()));
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

const handleInitializeRequest = async (laraAccessKeyId: string, laraAccessKeySecret: string) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      transports[sessionId] = transport;
    },
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      delete transports[transport.sessionId];
    }
  };

  const server = getServer(laraAccessKeyId, laraAccessKeySecret); 
  await server.connect(transport);

  return transport;
};

app.get("/mcp", (req, res) => handleSessionRequest(req, res));
app.delete("/mcp", (req, res) => handleSessionRequest(req, res));

const handleSessionRequest = async (
  req: express.Request,
  res: express.Response
) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).json(createErrorResponse(new InvalidSessionIdError()));
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

app.bind("127.0.0.1").listen(3000);
