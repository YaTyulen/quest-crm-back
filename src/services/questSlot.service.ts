import { prisma } from '../lib/prisma';
import { BadRequestError, NotFoundError } from '../errors/HttpError';

export const questSlotService = {
  async getQuestSlots(questId: number) {
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
      select: { id: true, title: true },
    });

    if (!quest) {
      throw new NotFoundError('Quest not found');
    }

    const questSlots = await prisma.questSlot.findMany({
      where: { questId },
      include: { slot: true },
      orderBy: { slot: { order: 'asc' } },
    });

    return {
      quest,
      slots: questSlots.map((qs) => qs.slot),
    };
  },

  async replaceQuestSlots(questId: number, slotIds: number[]) {
    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) {
      throw new NotFoundError('Quest not found');
    }

    // Проверяем, что все slotIds существуют
    if (slotIds.length > 0) {
      const existingSlots = await prisma.slotTemplate.findMany({
        where: { id: { in: slotIds } },
        select: { id: true },
      });

      const existingIds = new Set(existingSlots.map((s) => s.id));
      const missing = slotIds.filter((id) => !existingIds.has(id));

      if (missing.length > 0) {
        throw new BadRequestError(`Slots not found: ${missing.join(', ')}`);
      }
    }

    // Транзакция: удаляем старые, создаём новые
    await prisma.$transaction(async (tx) => {
      await tx.questSlot.deleteMany({ where: { questId } });

      if (slotIds.length > 0) {
        await tx.questSlot.createMany({
          data: slotIds.map((slotId) => ({ questId, slotId })),
        });
      }
    });

    // Возвращаем обновлённую сетку
    return this.getQuestSlots(questId);
  },
};