import { prisma } from '../lib/prisma';
import type { UpdateSettingsInput } from '../schemas/settings.schema';

const SETTINGS_ID = 1;

export const settingsService = {
  async getSettings() {
    const settings = await prisma.settings.findUnique({
      where: { id: SETTINGS_ID },
    });

    // Если строки нет (например, забыли seed) — создаём с дефолтами
    if (!settings) {
      return prisma.settings.create({
        data: { id: SETTINGS_ID },
      });
    }

    return settings;
  },

  async updateSettings(data: UpdateSettingsInput) {
    return prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...data },
      update: data,
    });
  },
};