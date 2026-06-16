-- AlterEnum
-- The new value must be committed in its own migration before it can be used
-- as a column default (Postgres forbids using a new enum value in the same
-- transaction that adds it). The SET DEFAULT lives in the next migration.
ALTER TYPE "SessionStatus" ADD VALUE 'SCHEDULED';
