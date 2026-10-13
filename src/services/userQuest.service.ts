import { prisma } from '../lib/prisma';
import { BadRequestError, NotFoundError } from '../errors/HttpError';

export const userQuestService = {
  async getUserQuests(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const userQuests = await prisma.userQuest.findMany({
      where: { userId },
      include: { quest: true },
      orderBy: { quest: { id: 'asc' } },
    });

    return {
      user,
      quests: userQuests.map((uq) => uq.quest),
    };
  },

  async replaceUserQuests(userId: number, questIds: number[]) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Проверяем, что все questIds существуют
    if (questIds.length > 0) {
      const existingQuests = await prisma.quest.findMany({
        where: { id: { in: questIds } },
        select: { id: true },
      });

      const existingIds = new Set(existingQuests.map((q) => q.id));
      const missing = questIds.filter((id) => !existingIds.has(id));

      if (missing.length > 0) {
        throw new BadRequestError(`Quests not found: ${missing.join(', ')}`);
      }
    }

    // Транзакция: удаляем старые связи, создаём новые,
    // и чистим Availability для квестов, с которых сняли сотрудника
    await prisma.$transaction(async (tx) => {
      await tx.userQuest.deleteMany({ where: { userId } });

      // Удаляем доступность для квестов, на которых сотрудник больше не работает
      await tx.availability.deleteMany({
        where: {
          userId,
          questId: { notIn: questIds },
        },
      });

      if (questIds.length > 0) {
        await tx.userQuest.createMany({
          data: questIds.map((questId) => ({ userId, questId })),
        });
      }
    });

    return this.getUserQuests(userId);
  },
};