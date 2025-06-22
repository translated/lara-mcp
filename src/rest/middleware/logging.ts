import { Request, Response, NextFunction } from "express";
import { logger } from "../../logger.js";

export default function loggingMiddleware(req: Request, _res: Response, next: NextFunction) {
    logger.debug("Received request: " + req.method + " " + req.url);
    next();
}