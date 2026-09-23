import bcrypt from 'bcrypt';
// import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { UnauthorizedError } from '../errors/HttpError';
import { generateAccessToken, generateRefreshToken, saveRefreshToken } from './token.service';

const SALT_ROUNDS = 10;

export const authService = {
  async login(data: { email: string; password: string }) {
    // 1. Ищем пользователя по email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    // 2. Если не нашли — 401
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 3. Сравниваем пароль с хешем
    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 4. Генерируем токен
    const accessToken = generateAccessToken(user.id, user.email);
    const refreshToken = generateRefreshToken(user.id);
    await saveRefreshToken(user.id, refreshToken);

    return {
      user: { id: user.id, name: user.name, email: user.email, systemRole: user.systemRole },
      accessToken,
      refreshToken,
    };
  },
};

export function generateToken(userId: number, email: string): string {
  return generateAccessToken(userId, email);
}