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
  console.log('🌱 Seeding database...');

  // === 1. Очистка (порядок важен: сначала зависимые таблицы) ===
  await prisma.businessRoleOnUser.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.quest.deleteMany();

  console.log('🧹 Cleared existing data');

  // === 2. Общий пароль для всех тестовых пользователей ===
  const passwordHash = await bcrypt.hash('secret123', SALT_ROUNDS);

  // === 3. Пользователи ===
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

  console.log(`👥 Created ${6} users`);

  // === 4. Квесты ===
  await prisma.quest.createMany({
    data: [
      {
        title: 'Побег из тюрьмы',
        description: 'Классический квест на 60 минут для команды из 4 человек',
      },
      {
        title: 'Тайна старого особняка',
        description: 'Хоррор-квест для опытных игроков. Возраст 16+',
      },
      {
        title: 'Космическая одиссея',
        description: 'Фантастический квест для детей от 10 лет',
      },
      {
        title: 'Ограбление казино',
        description: 'Командный квест на логику и смекалку',
      },
    ],
  });

  console.log('🎮 Created 4 quests');

  // === 5. Итоги ===
  console.log('\n✅ Seed completed!\n');
  console.log('📋 Test accounts (пароль у всех: secret123):');
  console.log('   owner@example.com     — ADMIN');
  console.log('   admin2@example.com    — ADMIN');
  console.log('   operator@example.com  — USER + OPERATOR');
  console.log('   actor@example.com     — USER + ACTOR');
  console.log('   multi@example.com     — USER + OPERATOR + ACTOR');
  console.log('   user@example.com      — USER (без бизнес-ролей)');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });