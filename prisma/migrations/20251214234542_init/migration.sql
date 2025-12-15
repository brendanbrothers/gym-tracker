/*
  Warnings:

  - The `source` column on the `Exercise` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `WorkoutSession` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'TRAINER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ExerciseSource" AS ENUM ('IMPORTED', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "source",
ADD COLUMN     "source" "ExerciseSource" NOT NULL DEFAULT 'CUSTOM';

-- AlterTable
ALTER TABLE "SetExercise" ALTER COLUMN "targetWeight" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "actualWeight" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'CLIENT';

-- AlterTable
ALTER TABLE "WorkoutSession" DROP COLUMN "status",
ADD COLUMN     "status" "SessionStatus" NOT NULL DEFAULT 'IN_PROGRESS';

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_source_sourceId_key" ON "Exercise"("name", "source", "sourceId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
