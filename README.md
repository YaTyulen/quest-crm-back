# 1. Клонировать репозиторий
git clone https://github.com/YaTyulen/quest-crm-back.git
cd quest-crm-back

# 2. Установить зависимости
npm install

# 3. Создать .env с продакшен-значениями
cp .env.example .env
nano .env

# 4. Сгенерировать Prisma Client (обычно автоматически при npm install, но на всякий случай)
npx prisma generate

# 5. Применить миграции к продакшен-базе
npx prisma migrate deploy

# 6. Запустить приложение
npm run build
npm start