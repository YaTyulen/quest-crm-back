// связывает http-метод и путь с конкретным методом контроллера

import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireAdmin } from '../middleware/requireAdmin';
import { userController } from '../controllers/user.controller';
import { validateBody } from '../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  changePasswordSchema,
  resetPasswordSchema,
  systemRoleSchema,
  businessRoleSchema,
} from '../schemas/user.schema';

import userQuestRoutes from './userQuest.routes';

const router = Router();

// Все роуты требуют аутентификации
router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me/password', validateBody(changePasswordSchema), userController.changeOwnPassword); // Роуты для текущего пользователя — ДО /:id

// Вложенный роутер: /api/users/:userId/quests
router.use('/:userId/quests', userQuestRoutes);

// Чтение — доступно любому авторизованному
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.get('/:id/business-roles', userController.getUserBusinessRoles);

// Изменения — только админ
router.post('/', requireAdmin, validateBody(createUserSchema), userController.createUser);
router.delete('/:id', requireAdmin, userController.deleteUser);
router.put('/:id', requireAdmin, validateBody(updateUserSchema), userController.updateUser);
router.patch('/:id/password', requireAdmin, validateBody(resetPasswordSchema), userController.resetUserPassword);

// Управление ролями — только админ
router.patch('/:id/system-role', requireAdmin, validateBody(systemRoleSchema), userController.updateSystemRole);
router.post('/:id/business-roles', requireAdmin, validateBody(businessRoleSchema), userController.addBusinessRole);
router.delete('/:id/business-roles/:role', requireAdmin, userController.removeBusinessRole);

export default router;