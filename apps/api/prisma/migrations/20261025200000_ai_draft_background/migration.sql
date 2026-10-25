-- FUZZ-145: the AI draft runs in the background, one model call per section, and keeps
-- every finished section. Additive: new defaulted/nullable columns on both tables, plus a
-- value mapping of the old AiDraft.status (OK → DONE, ERROR → FAILED; REFUSED unchanged).
-- Existing section rows were all written in full, so their generation defaults to DONE.

-- AlterTable
ALTER TABLE "AiDraft" ADD COLUMN "notesJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "AiDraft" ADD COLUMN "effort" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "AiDraft" ADD COLUMN "cancelRequested" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AiDraft" ADD COLUMN "startedAt" DATETIME;
ALTER TABLE "AiDraft" ADD COLUMN "finishedAt" DATETIME;

-- Old single-call drafts: map the review-style status onto the job status.
UPDATE "AiDraft" SET "status" = 'DONE' WHERE "status" = 'OK';
UPDATE "AiDraft" SET "status" = 'FAILED' WHERE "status" = 'ERROR';
UPDATE "AiDraft" SET "effort" = 'high' WHERE "status" IN ('DONE', 'FAILED', 'REFUSED');

-- AlterTable
ALTER TABLE "AiDraftSection" ADD COLUMN "generation" TEXT NOT NULL DEFAULT 'DONE';
ALTER TABLE "AiDraftSection" ADD COLUMN "targetWords" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AiDraftSection" ADD COLUMN "errorMessage" TEXT;
ALTER TABLE "AiDraftSection" ADD COLUMN "inputTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AiDraftSection" ADD COLUMN "outputTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AiDraftSection" ADD COLUMN "cacheReadTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AiDraftSection" ADD COLUMN "cacheCreationTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AiDraftSection" ADD COLUMN "estimatedCostUsd" REAL;
ALTER TABLE "AiDraftSection" ADD COLUMN "durationMs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AiDraftSection" ADD COLUMN "startedAt" DATETIME;
ALTER TABLE "AiDraftSection" ADD COLUMN "finishedAt" DATETIME;
