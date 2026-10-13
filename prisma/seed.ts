import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const SALT_ROUNDS = 10;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // === 1. Очистка (порядок важен: сначала зависимые таблицы) ===
  await prisma.availability.deleteMany();
  await prisma.userQuest.deleteMany();
  await prisma.questSlot.deleteMany();
  await prisma.businessRoleOnUser.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.slotTemplate.deleteMany();
  await prisma.settings.deleteMany();

  console.log('Cleared existing data');

  // === 2. Настройки ===
  await prisma.settings.create({
    data: {
      id: 1,
      availabilityHorizonDays: 14,
    },
  });

  console.log('Created settings (horizon: 14 days)');

  // === 3. Шаблоны слотов ===
  const slotTimes = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  const slots = await Promise.all(
    slotTimes.map((time, index) =>
      prisma.slotTemplate.create({
        data: {
          time,
          order: index + 1,
          isActive: true,
        },
      })
    )
  );

  console.log(`Created ${slots.length} slot templates`);

  // === 4. Пользователи ===
  const passwordHash = await bcrypt.hash('secret123', SALT_ROUNDS);

  const owner = await prisma.user.create({
    data: {
      name: 'Владелец',
      email: 'owner@example.com',
      passwordHash,
      systemRole: 'ADMIN',
    },
  });

  const admin2 = await prisma.user.create({
    data: {
      name: 'Второй админ',
      email: 'admin2@example.com',
      passwordHash,
      systemRole: 'ADMIN',
    },
  });

  const operator = await prisma.user.create({
    data: {
      name: 'Оператор',
      email: 'operator@example.com',
      passwordHash,
      systemRole: 'USER',
      businessRoles: {
        create: [{ businessRole: 'OPERATOR' }],
      },
    },
  });

  const actor = await prisma.user.create({
    data: {
      name: 'Актёр',
      email: 'actor@example.com',
      passwordHash,
      systemRole: 'USER',
      businessRoles: {
        create: [{ businessRole: 'ACTOR' }],
      },
    },
  });

  const multiRole = await prisma.user.create({
    data: {
      name: 'Мультироль',
      email: 'multi@example.com',
      passwordHash,
      systemRole: 'USER',
      businessRoles: {
        create: [{ businessRole: 'OPERATOR' }, { businessRole: 'ACTOR' }],
      },
    },
  });

  const regularUser = await prisma.user.create({
    data: {
      name: 'Обычный сотрудник',
      email: 'user@example.com',
      passwordHash,
      systemRole: 'USER',
    },
  });

  console.log(`Created 6 users`);

  // === 5. Квесты ===
  const escapeQuest = await prisma.quest.create({
    data: {
      title: 'Побег из тюрьмы',
      description: 'Классический квест на 60 минут для команды из 4 человек',
      operatorsNeeded: 1,
      actorsNeeded: 1,
    },
  });

  const mansionQuest = await prisma.quest.create({
    data: {
      title: 'Тайна старого особняка',
      description: 'Хоррор-квест для опытных игроков. Возраст 16+',
      operatorsNeeded: 1,
      actorsNeeded: 2,
    },
  });

  const spaceQuest = await prisma.quest.create({
    data: {
      title: 'Космическая одиссея',
      description: 'Фантастический квест для детей от 10 лет',
      operatorsNeeded: 1,
      actorsNeeded: 1,
    },
  });

  console.log('Created 3 quests');

  // === 6. Сетка слотов для квестов ===
  // «Побег» — все 7 слотов
  await prisma.questSlot.createMany({
    data: slots.map((slot) => ({
      questId: escapeQuest.id,
      slotId: slot.id,
    })),
  });

  // «Особняк» — только слоты с 14:00 (id слотов 3,4,5,6,7)
  const mansionSlots = slots.filter((s) => s.order >= 3);
  await prisma.questSlot.createMany({
    data: mansionSlots.map((slot) => ({
      questId: mansionQuest.id,
      slotId: slot.id,
    })),
  });

  // «Космическая одиссея» — только дневные слоты (10:00–16:00)
  const spaceSlots = slots.filter((s) => s.order <= 4);
  await prisma.questSlot.createMany({
    data: spaceSlots.map((slot) => ({
      questId: spaceQuest.id,
      slotId: slot.id,
    })),
  });

  console.log('Created quest slot grids');

  // === 7. Сотрудники на квестах (UserQuest) ===
  await prisma.userQuest.createMany({
    data: [
      // Владелец — на всех трёх квестах
      { userId: owner.id, questId: escapeQuest.id },
      { userId: owner.id, questId: mansionQuest.id },
      { userId: owner.id, questId: spaceQuest.id },
      // Оператор — на «Побеге» и «Особняке»
      { userId: operator.id, questId: escapeQuest.id },
      { userId: operator.id, questId: mansionQuest.id },
      // Актёр — на «Побеге» и «Космической одиссее»
      { userId: actor.id, questId: escapeQuest.id },
      { userId: actor.id, questId: spaceQuest.id },
      // Мультироль — на всех трёх
      { userId: multiRole.id, questId: escapeQuest.id },
      { userId: multiRole.id, questId: mansionQuest.id },
      { userId: multiRole.id, questId: spaceQuest.id },
      // Обычный сотрудник — ни на одном (не может заполнять расписание)
    ],
  });

  console.log('Assigned users to quests');

  // === 8. Тестовая доступность на ближайшие дни ===
  // Заполняем для «Побега» на 3 дня вперёд
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const availabilityData: {
    userId: number;
    questId: number;
    slotId: number;
    date: Date;
    canWork: boolean;
  }[] = [];

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);

    for (const slot of slots) {
      // Оператор доступен во все слоты
      availabilityData.push({
        userId: operator.id,
        questId: escapeQuest.id,
        slotId: slot.id,
        date,
        canWork: true,
      });

      // Актёр доступен только в чётные слоты (12:00, 16:00, 20:00)
      availabilityData.push({
        userId: actor.id,
        questId: escapeQuest.id,
        slotId: slot.id,
        date,
        canWork: slot.order % 2 === 0,
      });

      // Мультироль доступен везде
      availabilityData.push({
        userId: multiRole.id,
        questId: escapeQuest.id,
        slotId: slot.id,
        date,
        canWork: true,
      });
    }
  }

  await prisma.availability.createMany({ data: availabilityData });

  console.log(`Created ${availabilityData.length} availability records`);

  // === 9. Итоги ===
  console.log('\n Seed completed!\n');
  console.log('📋 Test accounts (пароль у всех: secret123):');
  console.log('   owner@example.com     — ADMIN, работает на всех квестах');
  console.log('   admin2@example.com    — ADMIN, ни на одном квесте');
  console.log('   operator@example.com  — USER + OPERATOR, «Побег» и «Особняк»');
  console.log('   actor@example.com     — USER + ACTOR, «Побег» и «Одиссея»');
  console.log('   multi@example.com     — USER + OPERATOR + ACTOR, все квесты');
  console.log('   user@example.com      — USER без ролей и квестов');
  console.log('');
  console.log('🎮 Quests:');
  console.log('   «Побег из тюрьмы»     — 7 слотов (10:00–22:00), 1 оператор + 1 актёр');
  console.log('   «Тайна особняка»      — 5 слотов (14:00–22:00), 1 оператор + 2 актёра');
  console.log('   «Космическая одиссея» — 4 слота (10:00–16:00), 1 оператор + 1 актёр');
  console.log('');


}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });