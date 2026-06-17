// src/middlewares/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to validate presence of required fields in request body.
 */
export function validateBody(requiredFields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing: string[] = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: `Validation Failed: Missing or empty required fields: ${missing.join(', ')}`
      });
    }

    next();
  };
}
