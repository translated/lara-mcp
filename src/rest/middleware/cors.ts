import cors from "cors";

const getOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    return ['https://laratranslate.com', 'https://www.laratranslate.com'];
  }
  if(process.env.NODE_ENV === 'staging') {
    return ['https://staging.laratranslate.com', 'https://www.staging.laratranslate.com'];
  }
  return ['http://localhost:3000', 'http://127.0.0.1:3000'];
}

const corsMiddleware = cors({
  // Restrict origins to prevent CSRF attacks
  origin: getOrigins(),
  methods: ["POST", "GET", "DELETE"],
  // Allow only necessary headers
  allowedHeaders: ["Content-Type", "Accept", "X-LARA-API-ID", "X-LARA-API-KEY"],
  // Prevent credentials from being sent to untrusted origins
  credentials: false,
});

export default corsMiddleware;
