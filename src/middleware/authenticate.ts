import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config'
import { UnauthorizedError } from '../errors/HttpError';

// const JWT_SECRET = process.env.JWT_SECRET!;
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;


// Расширяем тип Request, чтобы добавить userId
export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  // 1. Достаём заголовок Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  // 2. Извлекаем токен (после "Bearer ")
  const token = authHeader.split(' ')[1];

  // 3. Проверяем токен
  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as { userId: number; email: string };
    console.log('Decoded payload:', payload);

    // 4. Кладём данные в req, чтобы контроллеры могли их использовать
    req.userId = payload.userId;
    req.userEmail = payload.email;

    next(); // пропускаем дальше
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}