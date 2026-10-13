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

  async getOverview(questId: number, from: string, to: string) {
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
      include: {
        questSlots: {
          include: { slot: true },
        },
      },
    });

    if (!quest) {
      throw new NotFoundError('Quest not found');
    }

    const sortedQuestSlots = [...quest.questSlots].sort(
      (a, b) => a.slot.order - b.slot.order
    );

    const fromDate = new Date(from + 'T00:00:00.000Z');
    const toDate = new Date(to + 'T00:00:00.000Z');

    // Загружаем всех назначенных на квест (для missingUsers)
    const questUsers = await prisma.userQuest.findMany({
      where: { questId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            businessRoles: {
              select: { businessRole: true },
            },
          },
        },
      },
    });

    const assignees = questUsers
      .filter((uq) => uq.user.businessRoles.length > 0)
      .map((uq) => ({
        id: uq.user.id,
        name: uq.user.name,
        roles: uq.user.businessRoles.map((br) => br.businessRole),
      }));

    // Все отметки за период (и canWork: true, и false)
    const availabilities = await prisma.availability.findMany({
      where: {
        questId,
        date: { gte: fromDate, lte: toDate },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            businessRoles: {
              select: { businessRole: true },
            },
          },
        },
      },
    });

    // Карта: "YYYY-MM-DD_slotId" -> массив записей
    const map = new Map<string, typeof availabilities>();
    // Карта: "YYYY-MM-DD" -> Set userId, которые что-то отметили в этот день
    const markedByDay = new Map<string, Set<number>>();

    for (const av of availabilities) {
      const dateKey = av.date.toISOString().split('T')[0];

      const slotKey = `${dateKey}_${av.slotId}`;
      if (!map.has(slotKey)) map.set(slotKey, []);
      map.get(slotKey)!.push(av);

      if (!markedByDay.has(dateKey)) markedByDay.set(dateKey, new Set());
      markedByDay.get(dateKey)!.add(av.userId);
    }

    const days = [];
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
      const dateKey = cursor.toISOString().split('T')[0];

      const slots = sortedQuestSlots.map((qs) => {
        const key = `${dateKey}_${qs.slotId}`;
        const records = map.get(key) ?? [];

        const operatorsAvailable = records
          .filter(
            (r) =>
              r.canWork &&
              r.user.businessRoles.some((br) => br.businessRole === 'OPERATOR')
          )
          .map((r) => ({ id: r.user.id, name: r.user.name }));

        const operatorsUnavailable = records
          .filter(
            (r) =>
              !r.canWork &&
              r.user.businessRoles.some((br) => br.businessRole === 'OPERATOR')
          )
          .map((r) => ({ id: r.user.id, name: r.user.name }));

        const actorsAvailable = records
          .filter(
            (r) =>
              r.canWork &&
              r.user.businessRoles.some((br) => br.businessRole === 'ACTOR')
          )
          .map((r) => ({ id: r.user.id, name: r.user.name }));

        const actorsUnavailable = records
          .filter(
            (r) =>
              !r.canWork &&
              r.user.businessRoles.some((br) => br.businessRole === 'ACTOR')
          )
          .map((r) => ({ id: r.user.id, name: r.user.name }));

        const operatorsOk = operatorsAvailable.length >= quest.operatorsNeeded;
        const actorsOk = actorsAvailable.length >= quest.actorsNeeded;

        const totalOperatorResponses =
          operatorsAvailable.length + operatorsUnavailable.length;
        const totalActorResponses =
          actorsAvailable.length + actorsUnavailable.length;

        let status: 'covered' | 'understaffed' | 'empty' | 'declined';
        if (totalOperatorResponses === 0 && totalActorResponses === 0) {
          status = 'empty';
        } else if (operatorsOk && actorsOk) {
          status = 'covered';
        } else if (
          operatorsAvailable.length === 0 &&
          actorsAvailable.length === 0 &&
          (totalOperatorResponses > 0 || totalActorResponses > 0)
        ) {
          status = 'declined';
        } else {
          status = 'understaffed';
        }

        return {
          slotId: qs.slotId,
          time: qs.slot.time,
          order: qs.slot.order,
          operators: {
            available: operatorsAvailable.length,
            unavailable: operatorsUnavailable.length,
            needed: quest.operatorsNeeded,
            ok: operatorsOk,
            availableUsers: operatorsAvailable,
            unavailableUsers: operatorsUnavailable,
          },
          actors: {
            available: actorsAvailable.length,
            unavailable: actorsUnavailable.length,
            needed: quest.actorsNeeded,
            ok: actorsOk,
            availableUsers: actorsAvailable,
            unavailableUsers: actorsUnavailable,
          },
          status,
        };
      });

      const marked = markedByDay.get(dateKey) ?? new Set<number>();
      const missingUsers = assignees.filter((a) => !marked.has(a.id));

      days.push({
        date: dateKey,
        missingUsers,
        slots,
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return {
      quest: {
        id: quest.id,
        title: quest.title,
        operatorsNeeded: quest.operatorsNeeded,
        actorsNeeded: quest.actorsNeeded,
      },
      assignees,
      days,
    };
  }
};