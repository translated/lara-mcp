import { Request, Response, NextFunction } from "express";
import { logger } from "#logger";

// Sensitive headers that should not be logged
const SENSITIVE_HEADERS = [
  'authorization',
  'x-lara-access-key-id',
  'x-lara-access-key-secret',
  'x-lara-api-id',
  'x-lara-api-secret',
  'cookie',
  'set-cookie',
];

// Sanitize headers to remove sensitive information
function sanitizeHeaders(headers: any): any {
  const sanitized = { ...headers };
  SENSITIVE_HEADERS.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  return sanitized;
}

// Sanitize request body to remove sensitive information
function sanitizeBody(body: any): any {
  if (!body) return body;
  
  const sanitized = { ...body };
  // Remove sensitive fields from body if they exist
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'api_key'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  return sanitized;
}

export default function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
    logger.info(`Received request: ${req.method} ${req.url}`);
    logger.debug(`Body: ${JSON.stringify(sanitizeBody(req.body), null, 2)}`);
    logger.debug(`Headers: ${JSON.stringify(sanitizeHeaders(req.headers), null, 2)}`);

    next();

    logger.info(`Sending response: ${res.statusCode} ${res.statusMessage}`);
}