import { Request, Response, NextFunction } from "express";
import { logger } from "#logger";

export default function loggingMiddleware(req: Request, res: Response, next: NextFunction) {
    logger.info(`Received request: ${req.method} ${req.url}`);
    logger.debug(`Body: ${JSON.stringify(req.body, null, 2)}`);
    logger.debug(`Headers: ${JSON.stringify(req.headers, null, 2)}`);

    next();

    logger.info(`Sending response: ${res.statusCode} ${res.statusMessage}`);
}