import { prisma } from '../lib/prisma';
import { BadRequestError, ForbiddenError, NotFoundError } from '../errors/HttpError';
import type { SaveMyAvailabilityInput } from '../schemas/availability.schema';
import { settingsService } from './settings.service';

export const availabilityService = {
  async getMyAvailability(
    userId: number,
    questId: number,
    from: string,
    to: string
  ) {
    // Проверяем, что квест существует
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
      include: {
        questSlots: {
          include: { slot: true },
          orderBy: { slot: { order: 'asc' } },
        },
      },
    });

    if (!quest) {
      throw new NotFoundError('Quest not found');
    }

    const fromDate = new Date(from + 'T00:00:00.000Z');
    const toDate = new Date(to + 'T00:00:00.000Z');

    // Получаем доступность пользователя за период
    const availability = await prisma.availability.findMany({
      where: {
        userId,
        questId,
        date: { gte: fromDate, lte: toDate },
      },
    });

    // Строим карту: "YYYY-MM-DD_slotId" -> canWork
    const map = new Map<string, boolean>();
    for (const av of availability) {
      const dateKey = av.date.toISOString().split('T')[0];
      map.set(`${dateKey}_${av.slotId}`, av.canWork);
    }

    // Собираем ответ: для каждой даты в диапазоне — все слоты квеста
    const days = [];
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
      const dateKey = cursor.toISOString().split('T')[0];
      const slots = quest.questSlots.map((qs) => {
        const key = `${dateKey}_${qs.slotId}`;
        return {
          slotId: qs.slotId,
          time: qs.slot.time,
          order: qs.slot.order,
          // null = не заполнено, true = могу, false = не могу
          canWork: map.has(key) ? map.get(key)! : null,
        };
      });
      days.push({ date: dateKey, slots });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return {
      quest: { id: quest.id, title: quest.title },
      days,
    };
  },

  async saveMyAvailability(userId: number, data: SaveMyAvailabilityInput) {
    // 1. Проверяем, что пользователь работает на всех указанных квестах
    const questIds = [...new Set(data.items.map((i) => i.questId))];

    const userQuests = await prisma.userQuest.findMany({
      where: { userId, questId: { in: questIds } },
    });

    const userQuestIds = new Set(userQuests.map((uq) => uq.questId));
    const notWorkingOn = questIds.filter((id) => !userQuestIds.has(id));

    if (notWorkingOn.length > 0) {
      throw new ForbiddenError(
        `You don't work on quests: ${notWorkingOn.join(', ')}`
      );
    }

    // 2. Проверяем, что все слоты входят в сетки своих квестов
    for (const item of data.items) {
      const questSlot = await prisma.questSlot.findUnique({
        where: {
          questId_slotId: { questId: item.questId, slotId: item.slotId },
        },
      });
      if (!questSlot) {
        throw new BadRequestError(
          `Slot ${item.slotId} is not in quest ${item.questId}`
        );
      }
    }

    // 3. Проверяем, что все даты в пределах горизонта
    const settings = await settingsService.getSettings();
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const maxDate = new Date(today);
    maxDate.setUTCDate(maxDate.getUTCDate() + settings.availabilityHorizonDays);

    for (const item of data.items) {
      const itemDate = new Date(item.date + 'T00:00:00.000Z');
      if (itemDate < today) {
        throw new BadRequestError(`Date ${item.date} is in the past`);
      }
      if (itemDate > maxDate) {
        throw new BadRequestError(
          `Date ${item.date} is beyond the horizon (${settings.availabilityHorizonDays} days)`
        );
      }
    }

    // 4. Upsert каждой записи в транзакции
    await prisma.$transaction(
      data.items.map((item) => {
        const date = new Date(item.date + 'T00:00:00.000Z');
        return prisma.availability.upsert({
          where: {
            userId_date_questId_slotId: {
              userId,
              date,
              questId: item.questId,
              slotId: item.slotId,
            },
          },
          create: {
            userId,
            date,
            questId: item.questId,
            slotId: item.slotId,
            canWork: item.canWork,
          },
          update: {
            canWork: item.canWork,
          },
        });
      })
    );

    return { saved: data.items.length };
  },
};