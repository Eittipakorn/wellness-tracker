import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../lib/errors';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      statusCode: err.statusCode,
      error: err.errorName,
      message: err.message,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        statusCode: 409,
        error: 'Conflict',
        message: 'A record with this value already exists',
      });
      return;
    }
  }

  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    statusCode: 500,
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
  });
}
