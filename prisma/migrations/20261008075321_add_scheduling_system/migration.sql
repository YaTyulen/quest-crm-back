-- DropIndex
DROP INDEX "Quest_title_key";

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "actorsNeeded" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "operatorsNeeded" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "availabilityHorizonDays" INTEGER NOT NULL DEFAULT 14,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuest" (
    "userId" INTEGER NOT NULL,
    "questId" INTEGER NOT NULL,

    CONSTRAINT "UserQuest_pkey" PRIMARY KEY ("userId","questId")
);

-- CreateTable
CREATE TABLE "SlotTemplate" (
    "id" SERIAL NOT NULL,
    "time" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SlotTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestSlot" (
    "id" SERIAL NOT NULL,
    "questId" INTEGER NOT NULL,
    "slotId" INTEGER NOT NULL,

    CONSTRAINT "QuestSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "questId" INTEGER NOT NULL,
    "slotId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "canWork" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SlotTemplate_time_key" ON "SlotTemplate"("time");

-- CreateIndex
CREATE UNIQUE INDEX "QuestSlot_questId_slotId_key" ON "QuestSlot"("questId", "slotId");

-- CreateIndex
CREATE INDEX "Availability_questId_date_slotId_idx" ON "Availability"("questId", "date", "slotId");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_userId_date_questId_slotId_key" ON "Availability"("userId", "date", "questId", "slotId");

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuest" ADD CONSTRAINT "UserQuest_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestSlot" ADD CONSTRAINT "QuestSlot_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestSlot" ADD CONSTRAINT "QuestSlot_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "SlotTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "SlotTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
