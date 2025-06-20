import cors from "cors";

const corsMiddleware = cors({
  origin: "*",
  // Stateless MCP servers only support POST
  methods: ["POST"],
  // Allow only necessary headers
  allowedHeaders: ["Content-Type", "Accept", "X-LARA-API-ID", "X-LARA-API-KEY"],
});

export default corsMiddleware;
