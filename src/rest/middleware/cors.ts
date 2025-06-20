import cors from "cors";

const corsMiddleware = cors({
  origin: "*",
  methods: ["POST", "GET", "DELETE"],
  // Allow only necessary headers
  allowedHeaders: ["Content-Type", "Accept", "X-LARA-API-ID", "X-LARA-API-KEY"],
});

export default corsMiddleware;
