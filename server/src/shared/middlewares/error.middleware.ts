// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Centralized, graceful Express error handling middleware.
 * Masks raw stack traces in production environments to avoid security leaks.
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Unhandled Application Error:', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}
