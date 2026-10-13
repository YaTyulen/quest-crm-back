// принимает http-запрос, вызывает сервис и формирует ответ + обработка ошибок

import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';
import { parseId } from '../utils/parseId';
import { AuthRequest } from '../middleware/authenticate'
import { BadRequestError } from '../errors/HttpError';

const BUSINESS_ROLES = ['OPERATOR', 'ACTOR'] as const;

export const userController = {
  getMe: asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await userService.getMe(req.userId!);
    res.status(200).json(user);
  }),

  getAllUsers: asyncHandler(async (_req: Request, res: Response) => {
    const users = await userService.getAllUsers();
    res.status(200).json(users);
  }),

  getUserById: asyncHandler(async (req: Request, res: Response) => {
    const id = parseId(req.params.id, 'user');
    const user = await userService.getUserById(id);
    res.status(200).json(user);
  }),

  createUser: asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password, systemRole } = req.body;
    const user = await userService.createUser({ name, email, password, systemRole });
    // const user = await userService.createUser({
    //   name: name.trim(),
    //   email: email.trim().toLowerCase(),
    //   password,
    //   systemRole,
    //   vkId: vkId || undefined,
    // });

    // Не возвращаем passwordHash
    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      systemRole: user.systemRole,
      createdAt: user.createdAt,
    });
  }),

  updateUser: asyncHandler(async (req: Request, res: Response) => {
    const id = parseId(req.params.id, 'user');
    const data = req.body;
    const user = await userService.updateUser(id, data);
    res.status(200).json(user);
  }),

  deleteUser: asyncHandler(async (req: Request, res: Response) => {
    const id = parseId(req.params.id, 'user');
    const user = await userService.deleteUser(id);
    res.status(200).json({ message: 'User deleted', user });
  }),

  updateSystemRole: asyncHandler(async (req: Request, res: Response) => {
    const id = parseId(req.params.id, 'user');
    const { systemRole } = req.body;
    const user = await userService.updateSystemRole(id, systemRole);
    res.status(200).json(user);
  }),

  getUserBusinessRoles: asyncHandler(async (req: Request, res: Response) => {
    const id = parseId(req.params.id, 'user');
    const result = await userService.getUserBusinessRoles(id);
    res.status(200).json(result);
  }),

  addBusinessRole: asyncHandler(async (req: Request, res: Response) => {
    const id = parseId(req.params.id, 'user');
    const { businessRole } = req.body;
    const result = await userService.addBusinessRole(id, businessRole);
    res.status(201).json(result);
  }),

  removeBusinessRole: asyncHandler(async (req: Request, res: Response) => {
    const id = parseId(req.params.id, 'user');
    const { role } = req.params;

    // Для role нужна отдельная проверка, потому что он в URL, а не в body
    if (!role || !BUSINESS_ROLES.includes(role as any)) {
      throw new BadRequestError(
        `Role must be one of: ${BUSINESS_ROLES.join(', ')}`
      );
    }

    await userService.removeBusinessRole(id, role as 'OPERATOR' | 'ACTOR');
    res.status(200).json({ message: `Role ${role} removed from user ${id}` });
  }),

  changeOwnPassword: asyncHandler(async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.userId!;
    await userService.changeOwnPassword(userId, { currentPassword, newPassword });
    res.status(200).json({ message: 'Password changed successfully' });
  }),

  resetUserPassword: asyncHandler(async (req: Request, res: Response) => {
    const id = parseId(req.params.id, 'user');
    const { newPassword } = req.body;
    await userService.resetUserPassword(id, newPassword);
    res.status(200).json({ message: 'Password reset successfully' });
  }),
};