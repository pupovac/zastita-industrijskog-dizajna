-- Items needed only for filing ("ODLOŽENO ZA PODNOŠENJE") never block drafting steps.
ALTER TABLE "Question" ADD COLUMN "deferredToFiling" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OpenQuestion" ADD COLUMN "deferredToFiling" BOOLEAN NOT NULL DEFAULT false;

-- Filing steps follow drafting: "Nezavisna provera" moves before "Podaci za D-1".
UPDATE "ProjectStep" SET "position" = 11 WHERE "stepKey" = 'INDEPENDENT_REVIEW';
UPDATE "ProjectStep" SET "position" = 12 WHERE "stepKey" = 'D1_FORM_DATA';

-- Anything already asked in a filing step is deferred to filing.
UPDATE "Question" SET "deferredToFiling" = true
  WHERE "stepKey" IN ('D1_FORM_DATA', 'FINAL_PACKAGE', 'FINAL_APPLICANT_REVIEW');
UPDATE "OpenQuestion" SET "deferredToFiling" = true
  WHERE "stepKey" IN ('D1_FORM_DATA', 'FINAL_PACKAGE', 'FINAL_APPLICANT_REVIEW');
