-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SetExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order" INTEGER NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "modifier" TEXT,
    "targetReps" INTEGER,
    "targetWeight" REAL,
    "targetDuration" INTEGER,
    "actualReps" INTEGER,
    "actualWeight" REAL,
    "actualDuration" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "workoutSetId" TEXT NOT NULL,
    CONSTRAINT "SetExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SetExercise_workoutSetId_fkey" FOREIGN KEY ("workoutSetId") REFERENCES "WorkoutSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SetExercise" ("actualDuration", "actualReps", "actualWeight", "completed", "createdAt", "exerciseId", "id", "modifier", "notes", "order", "targetDuration", "targetReps", "targetWeight", "updatedAt", "workoutSetId") SELECT "actualDuration", "actualReps", "actualWeight", "completed", "createdAt", "exerciseId", "id", "modifier", "notes", "order", "targetDuration", "targetReps", "targetWeight", "updatedAt", "workoutSetId" FROM "SetExercise";
DROP TABLE "SetExercise";
ALTER TABLE "new_SetExercise" RENAME TO "SetExercise";
CREATE INDEX "SetExercise_exerciseId_idx" ON "SetExercise"("exerciseId");
CREATE INDEX "SetExercise_workoutSetId_idx" ON "SetExercise"("workoutSetId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
