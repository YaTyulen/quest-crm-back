import { prisma } from '../lib/prisma';
import { ConflictError } from '../errors/HttpError';
import type { CreateSlotInput, UpdateSlotInput } from '../schemas/slot.schema';

export const slotService = {
  async getAllSlots() {
    return prisma.slotTemplate.findMany({
      orderBy: { order: 'asc' },
    });
  },

  async getSlotById(id: number) {
    return prisma.slotTemplate.findUnique({ where: { id } });
  },

  async createSlot(data: CreateSlotInput) {
    return prisma.slotTemplate.create({ data });
  },

  async updateSlot(id: number, data: UpdateSlotInput) {
    return prisma.slotTemplate.update({ where: { id }, data });
  },

  async deleteSlot(id: number) {
    // Проверяем, используется ли слот где-то
    const usedInQuests = await prisma.questSlot.count({ where: { slotId: id } });
    if (usedInQuests > 0) {
      throw new ConflictError(
        `Cannot delete slot: it is used in ${usedInQuests} quest(s). Deactivate it instead.`
      );
    }

    return prisma.slotTemplate.delete({ where: { id } });
  },
};