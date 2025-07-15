import cors from "cors";

const corsMiddleware = cors({
  methods: ["POST", "GET", "DELETE"],
  // Allow only necessary headers
  allowedHeaders: ["Content-Type", "Accept", "X-LARA-API-ID", "X-LARA-API-KEY"],
  // Prevent credentials from being sent to untrusted origins
  credentials: false,
});

export default corsMiddleware;
