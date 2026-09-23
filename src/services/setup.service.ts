import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { ConflictError } from '../errors/HttpError';
import { generateToken } from './auth.service';
import type { SetupInput } from '../schemas/auth.schema';

const SALT_ROUNDS = 10;

export const setupService = {
  async isSetupRequired(): Promise<boolean> {
    const count = await prisma.user.count();
    return count === 0;
  },

  async createFirstAdmin(data: SetupInput) {
    // Защита: если пользователи уже есть — bootstrap запрещён
    const count = await prisma.user.count();
    if (count > 0) {
      throw new ConflictError('Setup already completed');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        systemRole: 'ADMIN',
      },
    });

    const token = generateToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        systemRole: user.systemRole,
      },
      token,
    };
  },
};