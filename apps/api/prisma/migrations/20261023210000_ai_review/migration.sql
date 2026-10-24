-- FUZZ-134: AI review of a step (Claude API) and the user's decisions on its suggestions.
-- Purely additive: two new tables, nothing existing is touched.

-- CreateTable
CREATE TABLE "AiReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "stepKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestSummary" TEXT NOT NULL DEFAULT '',
    "responseJson" TEXT NOT NULL DEFAULT '',
    "errorMessage" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheCreationTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "aiReviewId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "targetEntity" TEXT NOT NULL,
    "targetId" TEXT,
    "targetField" TEXT NOT NULL,
    "currentValue" TEXT NOT NULL DEFAULT '',
    "proposedValue" TEXT NOT NULL,
    "rationale" TEXT NOT NULL DEFAULT '',
    "requirementRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "decidedAt" DATETIME,
    "appliedReference" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiSuggestion_aiReviewId_fkey" FOREIGN KEY ("aiReviewId") REFERENCES "AiReview" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AiReview_projectId_stepKey_createdAt_idx" ON "AiReview"("projectId", "stepKey", "createdAt");

-- CreateIndex
CREATE INDEX "AiSuggestion_aiReviewId_idx" ON "AiSuggestion"("aiReviewId");
