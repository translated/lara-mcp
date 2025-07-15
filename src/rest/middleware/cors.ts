import cors from "cors";

const corsMiddleware = cors({
  methods: ["POST", "GET", "DELETE"],
  // Allow only necessary headers
  allowedHeaders: ["Content-Type", "Accept", "x-lara-access-key-id", "x-lara-access-key-secret"],
  // Prevent credentials from being sent to untrusted origins
  credentials: false,
});

export default corsMiddleware;
