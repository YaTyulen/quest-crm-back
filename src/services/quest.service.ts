import { prisma } from '../lib/prisma';
import type { CreateQuestInput, UpdateQuestInput } from '../schemas/quest.schema';

export const questService = {
    async getAllQuests() {
        return prisma.quest.findMany({
            orderBy: { id: 'asc'},
        })
    },

    async getQuestById(id: number) {
        return prisma.quest.findUnique({
            where: { id }
        })
    },

    async createQuest(data: CreateQuestInput) {
        return prisma.quest.create({ data });
    },

    async updateQuest( id: number, data: UpdateQuestInput ) {
        return prisma.quest.update({
            where: { id },
            data,
        });
    },

    async deleteQuest(id: number) {
        return prisma.quest.delete({
            where: { id },
        });
    },
}