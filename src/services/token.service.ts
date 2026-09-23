import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) || 7;

export function generateAccessToken(userId: number, email: string): string {
  return jwt.sign({ userId, email }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
}

export function generateRefreshToken(userId: number): string {
  // jti (JWT ID) — уникальный идентификатор для ротации
  return jwt.sign({ userId, jti: crypto.randomUUID() }, REFRESH_SECRET, {
    expiresIn: `${REFRESH_DAYS}d`,
  } as jwt.SignOptions);
}

export async function saveRefreshToken(userId: number, token: string): Promise<void> {
  const tokenHash = await bcrypt.hash(token, 10);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_DAYS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });
}

export async function rotateRefreshToken(oldToken: string): Promise<{ userId: number; newRefreshToken: string } | null> {
  // 1. Верифицируем старый токен
  let payload: { userId: number; jti: string };
  try {
    payload = jwt.verify(oldToken, REFRESH_SECRET) as { userId: number; jti: string };
  } catch {
    return null; // Токен невалидный или истёк
  }

  // 2. Ищем все активные токены пользователя
  const activeTokens = await prisma.refreshToken.findMany({
    where: { userId: payload.userId, revokedAt: null, expiresAt: { gt: new Date() } },
  });

  // 3. Проверяем, есть ли совпадение по хешу
  let matchedToken = null;
  for (const t of activeTokens) {
    if (await bcrypt.compare(oldToken, t.tokenHash)) {
      matchedToken = t;
      break;
    }
  }

  // 4. Если токен не найден среди активных — это повторное использование!
  if (!matchedToken) {
    // Отзываем ВСЕ токены пользователя (защита от кражи)
    await prisma.refreshToken.updateMany({
      where: { userId: payload.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  // 5. Отзываем старый токен и создаём новый
  await prisma.refreshToken.update({
    where: { id: matchedToken.id },
    data: { revokedAt: new Date() },
  });

  const newRefreshToken = generateRefreshToken(payload.userId);
  await saveRefreshToken(payload.userId, newRefreshToken);

  return { userId: payload.userId, newRefreshToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokens = await prisma.refreshToken.findMany({
    where: { revokedAt: null, expiresAt: { gt: new Date() } },
  });

  for (const t of tokens) {
    if (await bcrypt.compare(token, t.tokenHash)) {
      await prisma.refreshToken.update({
        where: { id: t.id },
        data: { revokedAt: new Date() },
      });
      return;
    }
  }
}