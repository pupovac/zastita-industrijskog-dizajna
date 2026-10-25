-- FUZZ-144: richer interview guidance per question (include/avoid hints, high priority)
-- and a stable key for default-bank questions. Purely additive: four nullable/defaulted
-- columns and one index; existing rows and answers are untouched.

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "defaultKey" TEXT;
ALTER TABLE "Question" ADD COLUMN "includeHintsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Question" ADD COLUMN "avoidHintsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Question" ADD COLUMN "highPriority" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Question_projectId_defaultKey_idx" ON "Question"("projectId", "defaultKey");
