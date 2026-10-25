-- FUZZ-142: AI draft of the description (Claude API) and the project's target description length.
-- Purely additive: one nullable column, two new tables, nothing existing is touched.

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "targetDescriptionPages" INTEGER;

-- CreateTable
CREATE TABLE "AiDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "targetPages" INTEGER NOT NULL,
    "imageCount" INTEGER NOT NULL DEFAULT 0,
    "requestSummary" TEXT NOT NULL DEFAULT '',
    "responseJson" TEXT NOT NULL DEFAULT '',
    "errorMessage" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheCreationTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" REAL,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiDraft_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiDraftSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aiDraftId" TEXT NOT NULL,
    "applicationSectionId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "content" TEXT NOT NULL,
    "placeholders" INTEGER NOT NULL DEFAULT 0,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "sectionWasConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "draftVersionId" TEXT,
    "previousVersionId" TEXT,
    "decidedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiDraftSection_aiDraftId_fkey" FOREIGN KEY ("aiDraftId") REFERENCES "AiDraft" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AiDraft_projectId_createdAt_idx" ON "AiDraft"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "AiDraftSection_aiDraftId_idx" ON "AiDraftSection"("aiDraftId");

-- CreateIndex
CREATE INDEX "AiDraftSection_draftVersionId_idx" ON "AiDraftSection"("draftVersionId");
