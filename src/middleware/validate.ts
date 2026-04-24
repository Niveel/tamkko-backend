import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema, source?: 'body' | 'query' | 'params') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(source ? req[source] : {
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue) => ({
          message: `${issue.path.join('.')} is ${issue.message}`,
        }));
        _res.status(400).json({ status: 'error', message: 'Validation failed', errors: errorMessages });
      } else {
        _res.status(500).json({ status: 'error', message: 'Internal Server Error' });
      }
    }
  };
};
