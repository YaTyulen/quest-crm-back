import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { rotateRefreshToken, revokeRefreshToken, generateAccessToken } from '../services/token.service';
import { UnauthorizedError } from '../errors/HttpError';

const REFRESH_COOKIE = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
};

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    
    res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.status(200).json(result);
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const oldToken = req.cookies[REFRESH_COOKIE];
    if (!oldToken) throw new UnauthorizedError('Missing refresh token');

    const result = await rotateRefreshToken(oldToken);
    if (!result) {
      res.clearCookie(REFRESH_COOKIE, COOKIE_OPTIONS);
      throw new UnauthorizedError('Invalid or reused refresh token');
    }

    // Получаем пользователя для нового access-токена
    const { prisma } = await import('../lib/prisma');
    const user = await prisma.user.findUnique({ where: { id: result.userId } });
    if (!user) throw new UnauthorizedError('User not found');

    const accessToken = generateAccessToken(user.id, user.email);

    res.cookie(REFRESH_COOKIE, result.newRefreshToken, COOKIE_OPTIONS);
    res.status(200).json({ accessToken });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies[REFRESH_COOKIE];
    if (token) await revokeRefreshToken(token);

    res.clearCookie(REFRESH_COOKIE, COOKIE_OPTIONS);
    res.status(200).json({ message: 'Logged out' });
  }),
};