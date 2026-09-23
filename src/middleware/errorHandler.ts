import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/HttpError';
import { Prisma } from '../generated/prisma/client';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  // Наши кастомные ошибки
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Ошибки Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2025':
        return res.status(404).json({ error: 'Resource not found' });
      case 'P2002': {
        const target = (err.meta?.target as string[])?.join(', ') ?? 'field';
        return res.status(409).json({
          error: `Unique constraint violation on: ${target}`,
        });
      }
      case 'P2003':
        return res.status(409).json({
          error: 'Cannot perform operation: foreign key constraint violated',
        });
      default:
        console.error('Unhandled Prisma error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
  }

  // Всё остальное — 500
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
}