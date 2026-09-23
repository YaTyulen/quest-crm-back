// здесь "живет" бизнес-логика

import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../errors/HttpError';
import type { CreateUserInput, UpdateUserInput, ChangePasswordInput } from '../schemas/user.schema';

const SALT_ROUNDS = 10;

export const userService = {
  async getAllUsers() {
    return prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        createdAt: true,
      },
    });
  },

  async getUserById(id: number) {
    return prisma.user.findUnique({
        where: { id },
        select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        createdAt: true,
        businessRoles: {
          select: { businessRole: true },
        },
      },
    })
  },

  async createUser(data: CreateUserInput) {
    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        systemRole: data.systemRole ?? 'USER', 
      },
    });
  },

  async deleteUser(id: number) {
    return prisma.user.delete({
      where: { id },
      select: { id: true, name: true, email: true },
    });
  },

  async updateUser( id: number, data: UpdateUserInput) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        createdAt: true,
      },
    });
  },

  async updateSystemRole(id: number, systemRole: 'ADMIN' | 'USER') {
    // Проверяем, что пользователь существует — иначе Prisma выбросит P2025,
    // и errorHandler вернёт «Resource not found» без деталей.
    // Явная проверка даёт более точное сообщение.
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    // Если понижаем последнего админа — запрещаем
    if (existing.systemRole === 'ADMIN' && systemRole === 'USER') {
      const adminCount = await prisma.user.count({
        where: { systemRole: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new ConflictError('Cannot demote the last admin');
      }
    }

    return prisma.user.update({
      where: { id },
      data: { systemRole },
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
      },
    });
  },

  async getUserBusinessRoles(id: number) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        businessRoles: {
          select: { businessRole: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      businessRoles: user.businessRoles.map((r) => r.businessRole),
    };
  },

  async addBusinessRole(id: number, businessRole: 'OPERATOR' | 'ACTOR') {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    // Проверяем, не назначена ли уже эта роль
    const alreadyHas = await prisma.businessRoleOnUser.findUnique({
      where: {
        userId_businessRole: { userId: id, businessRole },
      },
    });

    if (alreadyHas) {
      throw new ConflictError(`User already has role ${businessRole}`);
    }

    return prisma.businessRoleOnUser.create({
      data: { userId: id, businessRole },
      select: { userId: true, businessRole: true },
    });
  },

  async removeBusinessRole(id: number, businessRole: 'OPERATOR' | 'ACTOR') {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User not found');
    }

    const link = await prisma.businessRoleOnUser.findUnique({
      where: {
        userId_businessRole: { userId: id, businessRole },
      },
    });

    if (!link) {
      throw new NotFoundError(`User does not have role ${businessRole}`);
    }

    await prisma.businessRoleOnUser.delete({
      where: {
        userId_businessRole: { userId: id, businessRole },
      },
    });
  },

  async changeOwnPassword(
    userId: number,
    data: ChangePasswordInput
  ) {
    // 1. Находим пользователя
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 2. Проверяем текущий пароль
    const isCurrentValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // 3. Проверяем, что новый пароль отличается от старого
    const isSameAsOld = await bcrypt.compare(data.newPassword, user.passwordHash);
    if (isSameAsOld) {
      throw new BadRequestError('New password must be different from current password');
    }

    // 4. Хешируем и сохраняем новый пароль
    const newPasswordHash = await bcrypt.hash(data.newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  },

  async getMe(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        systemRole: true,
        createdAt: true,
        businessRoles: {
          select: { businessRole: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      systemRole: user.systemRole,
      createdAt: user.createdAt,
      businessRoles: user.businessRoles.map((r) => r.businessRole),
    };
  },

  async resetUserPassword(id: number, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Проверяем, что новый пароль отличается от текущего
    const isSameAsOld = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSameAsOld) {
      throw new BadRequestError('New password must be different from current password');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id },
      data: { passwordHash: newPasswordHash },
    });
  },
};