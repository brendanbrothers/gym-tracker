-- AlterTable
ALTER TABLE "WorkoutSession" ADD COLUMN     "copiedFromId" TEXT;

-- CreateIndex
CREATE INDEX "WorkoutSession_copiedFromId_idx" ON "WorkoutSession"("copiedFromId");

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_copiedFromId_fkey" FOREIGN KEY ("copiedFromId") REFERENCES "WorkoutSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
