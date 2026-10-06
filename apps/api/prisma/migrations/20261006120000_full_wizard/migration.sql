-- FUZZ-130: every step of the wizard gets its data model.
-- Purely additive: new columns (nullable or with a default) and new tables.
-- No table is dropped or rebuilt, no existing value is changed except the
-- interview group backfill at the end, which only fills a new column.

ALTER TABLE "Project" ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Question" ADD COLUMN "interviewGroup" TEXT;
ALTER TABLE "DesignVariant" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'AGENT_INFERENCE';
ALTER TABLE "DesignVariant" ADD COLUMN "sourceReference" TEXT;
ALTER TABLE "DesignVariant" ADD COLUMN "confidence" REAL;
ALTER TABLE "DesignVariant" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DesignFeature" ADD COLUMN "category" TEXT;
ALTER TABLE "DesignFeature" ADD COLUMN "categoryRationale" TEXT NOT NULL DEFAULT '';
ALTER TABLE "DesignFeature" ADD COLUMN "riskRationale" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Source" ADD COLUMN "code" TEXT;
ALTER TABLE "Source" ADD COLUMN "institution" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Source" ADD COLUMN "documentKind" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Source" ADD COLUMN "documentVersion" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Source" ADD COLUMN "relevantSections" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Source" ADD COLUMN "significance" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Source" ADD COLUMN "localCopiesJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "SourceRequirement" ADD COLUMN "code" TEXT;
ALTER TABLE "SourceRequirement" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE "SourceRequirement" ADD COLUMN "area" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SourceRequirement" ADD COLUMN "areaCode" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SourceRequirement" ADD COLUMN "phasesJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "SourceRequirement" ADD COLUMN "isDiscrepancy" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SourceRequirement" ADD COLUMN "precedence" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SourceRequirement" ADD COLUMN "openItemsJson" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "SourceRequirement" ADD COLUMN "accessDate" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ResearchFinding" ADD COLUMN "code" TEXT;
ALTER TABLE "PriorDesign" ADD COLUMN "country" TEXT;
ALTER TABLE "PriorDesign" ADD COLUMN "designDate" TEXT;
ALTER TABLE "PriorDesign" ADD COLUMN "locarnoClass" TEXT;
ALTER TABLE "PriorDesign" ADD COLUMN "database" TEXT;
ALTER TABLE "PriorDesign" ADD COLUMN "imageFileId" TEXT REFERENCES "UploadedFile" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PriorDesign" ADD COLUMN "similarFeatures" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PriorDesign" ADD COLUMN "differingFeatures" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PriorDesign" ADD COLUMN "similarityLevel" TEXT;
ALTER TABLE "PriorDesign" ADD COLUMN "searchResult" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PriorDesign" ADD COLUMN "legalConclusion" TEXT NOT NULL DEFAULT '';
ALTER TABLE "UploadedFile" ADD COLUMN "replacedById" TEXT;
ALTER TABLE "Representation" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Representation" ADD COLUMN "featureShown" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Representation" ADD COLUMN "requirement" TEXT NOT NULL DEFAULT 'RECOMMENDED';
ALTER TABLE "Representation" ADD COLUMN "medium" TEXT;
ALTER TABLE "Representation" ADD COLUMN "mediumRationale" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Representation" ADD COLUMN "assessment" TEXT;
ALTER TABLE "Representation" ADD COLUMN "assessmentNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Representation" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'AGENT_INFERENCE';
ALTER TABLE "Representation" ADD COLUMN "sourceReference" TEXT;
ALTER TABLE "Representation" ADD COLUMN "confidence" REAL;
ALTER TABLE "Representation" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ApplicationSection" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ApplicationSection" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'AGENT_INFERENCE';
ALTER TABLE "ApplicationSection" ADD COLUMN "sourceReference" TEXT;
ALTER TABLE "ApplicationSection" ADD COLUMN "confidence" REAL;
ALTER TABLE "ApplicationSection" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DraftVersion" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'AGENT_INFERENCE';
ALTER TABLE "DraftVersion" ADD COLUMN "sourceReference" TEXT;
ALTER TABLE "DraftVersion" ADD COLUMN "confidence" REAL;
ALTER TABLE "DraftVersion" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ReviewIssue" ADD COLUMN "checkKey" TEXT;
ALTER TABLE "ReviewIssue" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'AGENT_INFERENCE';
ALTER TABLE "ReviewIssue" ADD COLUMN "sourceReference" TEXT;
ALTER TABLE "ReviewIssue" ADD COLUMN "confidence" REAL;
ALTER TABLE "ReviewIssue" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Decision" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "Decision" ADD COLUMN "confidence" REAL;
ALTER TABLE "Decision" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OpenQuestion" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'AGENT_INFERENCE';
ALTER TABLE "OpenQuestion" ADD COLUMN "sourceReference" TEXT;
ALTER TABLE "OpenQuestion" ADD COLUMN "confidence" REAL;
ALTER TABLE "OpenQuestion" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;

-- New tables
CREATE TABLE "FunctionAnalysisAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "designFeatureId" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'AI_INFERENCE',
    "sourceType" TEXT NOT NULL,
    "sourceReference" TEXT,
    "confidence" REAL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FunctionAnalysisAnswer_designFeatureId_fkey" FOREIGN KEY ("designFeatureId") REFERENCES "DesignFeature" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "RequirementCitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceRequirementId" TEXT NOT NULL,
    "sourceDocumentId" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RequirementCitation_sourceRequirementId_fkey" FOREIGN KEY ("sourceRequirementId") REFERENCES "SourceRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementCitation_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "SourceDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ResearchReportSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "reportKey" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "heading" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sourceReference" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResearchReportSection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "SearchCoverage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "database" TEXT NOT NULL,
    "query" TEXT NOT NULL DEFAULT '',
    "searchedAt" DATETIME,
    "status" TEXT NOT NULL,
    "resultSummary" TEXT NOT NULL DEFAULT '',
    "blockedReason" TEXT NOT NULL DEFAULT '',
    "coverageGap" TEXT NOT NULL DEFAULT '',
    "sourceType" TEXT NOT NULL DEFAULT 'AGENT_INFERENCE',
    "sourceReference" TEXT,
    "confidence" REAL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SearchCoverage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "ProtectionStrategyItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "details" TEXT NOT NULL DEFAULT '',
    "rationale" TEXT NOT NULL DEFAULT '',
    "requirementRefs" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'RECOMMENDATION',
    "sourceType" TEXT NOT NULL DEFAULT 'AGENT_INFERENCE',
    "sourceReference" TEXT,
    "confidence" REAL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProtectionStrategyItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "D1FieldValue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "deferredToFiling" BOOLEAN,
    "sourceType" TEXT NOT NULL DEFAULT 'USER',
    "sourceReference" TEXT,
    "confidence" REAL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "D1FieldValue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "missingJson" TEXT NOT NULL DEFAULT '[]',
    "createdByActor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "FinalSignoff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "packageVersion" INTEGER,
    "confirmedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinalSignoff_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX "Source_projectId_code_key" ON "Source"("projectId", "code");
CREATE UNIQUE INDEX "SourceRequirement_projectId_code_key" ON "SourceRequirement"("projectId", "code");
CREATE UNIQUE INDEX "FunctionAnalysisAnswer_designFeatureId_questionNumber_key" ON "FunctionAnalysisAnswer"("designFeatureId", "questionNumber");
CREATE UNIQUE INDEX "RequirementCitation_sourceRequirementId_sourceDocumentId_key" ON "RequirementCitation"("sourceRequirementId", "sourceDocumentId");
CREATE UNIQUE INDEX "ResearchReportSection_projectId_reportKey_code_key" ON "ResearchReportSection"("projectId", "reportKey", "code");
CREATE UNIQUE INDEX "ProtectionStrategyItem_projectId_key_key" ON "ProtectionStrategyItem"("projectId", "key");
CREATE UNIQUE INDEX "D1FieldValue_projectId_fieldKey_key" ON "D1FieldValue"("projectId", "fieldKey");
CREATE UNIQUE INDEX "GeneratedDocument_projectId_type_versionNumber_key" ON "GeneratedDocument"("projectId", "type", "versionNumber");
CREATE UNIQUE INDEX "ResearchFinding_projectId_code_key" ON "ResearchFinding"("projectId", "code");

-- Backfill: interview group A–G for questions added with a "A1 — …" style prefix,
-- and for the six starter questions.
UPDATE "Question" SET "interviewGroup" = 'A' WHERE "interviewGroup" IS NULL AND ("text" LIKE 'A_ —%' OR "text" LIKE 'A__ —%');
UPDATE "Question" SET "interviewGroup" = 'B' WHERE "interviewGroup" IS NULL AND ("text" LIKE 'B_ —%' OR "text" LIKE 'B__ —%');
UPDATE "Question" SET "interviewGroup" = 'C' WHERE "interviewGroup" IS NULL AND ("text" LIKE 'C_ —%' OR "text" LIKE 'C__ —%');
UPDATE "Question" SET "interviewGroup" = 'D' WHERE "interviewGroup" IS NULL AND ("text" LIKE 'D_ —%' OR "text" LIKE 'D__ —%');
UPDATE "Question" SET "interviewGroup" = 'E' WHERE "interviewGroup" IS NULL AND ("text" LIKE 'E_ —%' OR "text" LIKE 'E__ —%');
UPDATE "Question" SET "interviewGroup" = 'F' WHERE "interviewGroup" IS NULL AND ("text" LIKE 'F_ —%' OR "text" LIKE 'F__ —%');
UPDATE "Question" SET "interviewGroup" = 'G' WHERE "interviewGroup" IS NULL AND ("text" LIKE 'G_ —%' OR "text" LIKE 'G__ —%');
UPDATE "Question" SET "interviewGroup" = 'C' WHERE "interviewGroup" IS NULL AND "text" = 'Kako se proizvod zove i kako biste ga ukratko opisali?';
UPDATE "Question" SET "interviewGroup" = 'D' WHERE "interviewGroup" IS NULL AND "text" = 'Kako izgleda vidljiva prednja površina panela (tekstura, završna obrada, boja)?';
UPDATE "Question" SET "interviewGroup" = 'E' WHERE "interviewGroup" IS NULL AND "text" = 'Kako izgledaju ivice i spojevi panela posmatrano spolja?';
UPDATE "Question" SET "interviewGroup" = 'D' WHERE "interviewGroup" IS NULL AND "text" = 'Koje dimenzije i proporcije panel ima?';
UPDATE "Question" SET "interviewGroup" = 'F' WHERE "interviewGroup" IS NULL AND "text" = 'Da li postoji više varijanti izgleda (boje, teksture, dimenzije)?';
UPDATE "Question" SET "interviewGroup" = 'B' WHERE "interviewGroup" IS NULL AND "text" = 'Ko je autor (dizajner) izgleda proizvoda?';

