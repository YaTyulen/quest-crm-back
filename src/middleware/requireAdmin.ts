import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { ForbiddenError, UnauthorizedError } from '../errors/HttpError';
import { prisma } from '../lib/prisma';

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { systemRole: true },
    });

    if (!user || user.systemRole !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
}