import {
  AgentTaskStatus,
  FeatureCategory,
  FunctionalityRisk,
  InformationKind,
  RepresentationAssessment,
  RepresentationMedium,
  RepresentationRequirement,
  RequirementStatus,
  SearchCoverageStatus,
  SimilarityLevel,
  SourceType,
} from '@prisma/client';
import { z } from 'zod';
import { DomainError } from '../domain/domain-error';
import { assertValidNewFact } from '../domain/fact-rules';
import { STEP_KEYS } from '../domain/steps';
import { CollectionConfig } from './collection-config';

// Note: no input schema has `verified`. Confirmation happens only through POST /<collection>/:id/confirm.

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const id = z.string().uuid();
const stepKey = z.enum(STEP_KEYS as [string, ...string[]]);
const dateTime = z.coerce.date();

const provenance = {
  sourceType: z.nativeEnum(SourceType),
  sourceReference: optionalText(2000),
  confidence: z.number().min(0).max(1).nullable().optional(),
};

/** Kind + source must be a valid combination (an inference is labeled as such, a FACT needs an external source). */
function validateKind(dto: Record<string, unknown>, stored: Record<string, unknown> | null) {
  const kind = (dto.kind ?? stored?.kind) as InformationKind | undefined;
  const sourceType = (dto.sourceType ?? stored?.sourceType) as SourceType | undefined;
  if (!kind || !sourceType) return;
  if (stored && dto.kind === undefined && dto.sourceType === undefined && dto.sourceReference === undefined) return;
  const sourceReference = (dto.sourceReference !== undefined ? dto.sourceReference : stored?.sourceReference) as
    | string
    | null
    | undefined;
  // A user confirmation turns a record into FACT; editing it later must not trip the "no direct FACT" rule.
  if (stored?.verified && kind === 'FACT') return;
  assertValidNewFact({ kind, sourceType, sourceReference });
}

function createAndUpdate(shape: z.ZodRawShape, required: string[]) {
  const createShape = Object.fromEntries(
    Object.entries(shape).map(([key, schema]) => [key, required.includes(key) ? schema : schema.optional()]),
  );
  return { createSchema: z.object(createShape).strict(), updateSchema: z.object(shape).partial().strict() };
}

// ---------------------------------------------------------------------------

const designVariant = createAndUpdate(
  { name: text(300).min(1), description: text(4000), ...provenance },
  ['name', 'sourceType'],
);

const designFeature = createAndUpdate(
  {
    variantId: id.nullable(),
    name: text(300).min(1),
    description: text(4000),
    category: z.nativeEnum(FeatureCategory).nullable(),
    categoryRationale: text(4000),
    functionalityRisk: z.nativeEnum(FunctionalityRisk).nullable(),
    riskRationale: text(4000),
    kind: z.nativeEnum(InformationKind),
    ...provenance,
  },
  ['name', 'kind', 'sourceType'],
);

const source = createAndUpdate(
  {
    code: text(40).nullable(),
    name: text(500).min(1),
    url: text(2000).min(1),
    sourceType: z.nativeEnum(SourceType),
    priority: z.number().int().min(1).max(5),
    institution: text(500),
    documentKind: text(500),
    documentVersion: text(1000),
    relevantSections: text(10000),
    significance: text(10000),
    accessedAt: dateTime.nullable(),
  },
  ['name', 'url', 'sourceType'],
);

const sourceDocument = createAndUpdate(
  {
    sourceId: id,
    title: text(500).min(1),
    url: optionalText(2000),
    section: optionalText(1000),
    localCopyPath: optionalText(1000),
    accessedAt: dateTime.nullable(),
    notes: text(10000),
  },
  ['sourceId', 'title'],
);

const sourceRequirement = createAndUpdate(
  {
    sourceDocumentId: id,
    code: text(40).nullable(),
    requirementText: text(10000).min(1),
    section: text(1000),
    impactOnApplication: text(10000),
    status: z.nativeEnum(RequirementStatus),
    area: text(300),
    areaCode: text(100),
    kind: z.nativeEnum(InformationKind),
    sourceType: z.nativeEnum(SourceType),
    sourceReference: text(2000).min(1),
    confidence: z.number().min(0).max(1).nullable(),
  },
  ['sourceDocumentId', 'requirementText', 'kind', 'sourceType', 'sourceReference'],
);

const researchFinding = createAndUpdate(
  {
    sourceDocumentId: id.nullable(),
    summary: text(4000).min(1),
    details: text(20000),
    kind: z.nativeEnum(InformationKind),
    ...provenance,
  },
  ['summary', 'kind', 'sourceType'],
);

const priorDesign = createAndUpdate(
  {
    title: text(500).min(1),
    registrationNumber: optionalText(200),
    holder: optionalText(500),
    url: optionalText(2000),
    country: optionalText(200),
    designDate: optionalText(100),
    locarnoClass: optionalText(100),
    database: optionalText(300),
    imageFileId: id.nullable(),
    similarFeatures: text(10000),
    differingFeatures: text(10000),
    similarityLevel: z.nativeEnum(SimilarityLevel).nullable(),
    similarityNotes: text(10000),
    searchResult: text(10000),
    legalConclusion: text(10000),
    kind: z.nativeEnum(InformationKind),
    ...provenance,
  },
  ['title', 'sourceType'],
);

const searchCoverage = createAndUpdate(
  {
    database: text(300).min(1),
    query: text(4000),
    searchedAt: dateTime.nullable(),
    status: z.nativeEnum(SearchCoverageStatus),
    resultSummary: text(10000),
    blockedReason: text(4000),
    coverageGap: text(4000),
    ...provenance,
  },
  ['database', 'status'],
);

const representation = createAndUpdate(
  {
    uploadedFileId: id.nullable(),
    position: z.number().int().min(1),
    viewName: text(300).min(1),
    notes: text(4000),
    purpose: text(4000),
    featureShown: text(4000),
    requirement: z.nativeEnum(RepresentationRequirement),
    medium: z.nativeEnum(RepresentationMedium).nullable(),
    mediumRationale: text(4000),
    assessment: z.nativeEnum(RepresentationAssessment).nullable(),
    assessmentNote: text(4000),
    ...provenance,
  },
  ['viewName'],
);

const agentTask = createAndUpdate(
  {
    stepKey: stepKey.nullable(),
    agentName: text(200).min(1),
    title: text(500).min(1),
    status: z.nativeEnum(AgentTaskStatus),
    resultSummary: text(20000),
  },
  ['agentName', 'title'],
);

export const COLLECTIONS: CollectionConfig[] = [
  {
    path: 'design-variants',
    model: 'designVariant',
    label: 'Varijanta',
    stepKey: 'PROTECTION_STRATEGY',
    ...designVariant,
    hasProjectId: true,
    references: [],
    provenance: true,
    contentFields: ['name', 'description'],
    deletable: true,
    orderBy: { createdAt: 'asc' },
  },
  {
    path: 'design-features',
    model: 'designFeature',
    label: 'Vizuelna karakteristika',
    stepKey: 'VISUAL_ANALYSIS',
    ...designFeature,
    hasProjectId: true,
    references: [{ field: 'variantId', model: 'designVariant', label: 'Varijanta' }],
    provenance: true,
    contentFields: ['name', 'description', 'category', 'functionalityRisk'],
    deletable: true,
    orderBy: { createdAt: 'asc' },
    include: { variant: true, functionAnalysis: { orderBy: { questionNumber: 'asc' } } },
    validate: validateKind,
    decisionTitle: (r) => `Usvojena preporuka o karakteristici: ${String(r.name)}`,
  },
  {
    path: 'sources',
    model: 'source',
    label: 'Izvor',
    stepKey: 'ZIS_RESEARCH',
    ...source,
    hasProjectId: true,
    references: [],
    provenance: false,
    contentFields: [],
    deletable: true,
    orderBy: [{ priority: 'asc' }, { code: 'asc' }, { createdAt: 'asc' }],
    include: {
      documents: {
        orderBy: { createdAt: 'asc' },
        include: { researchFindings: { orderBy: { createdAt: 'asc' } } },
      },
    },
  },
  {
    path: 'source-documents',
    model: 'sourceDocument',
    label: 'Izvorni dokument',
    stepKey: 'ZIS_RESEARCH',
    ...sourceDocument,
    hasProjectId: false,
    projectWhere: (projectId) => ({ source: { projectId } }),
    projectIdOf: async (record, db) =>
      (await db.source.findUniqueOrThrow({ where: { id: String(record.sourceId) } })).projectId,
    references: [{ field: 'sourceId', model: 'source', label: 'Izvor' }],
    provenance: false,
    contentFields: [],
    deletable: true,
    orderBy: { createdAt: 'asc' },
  },
  {
    path: 'source-requirements',
    model: 'sourceRequirement',
    label: 'Zahtev iz Matrice',
    stepKey: 'REQUIREMENTS_SUMMARY',
    ...sourceRequirement,
    hasProjectId: true,
    references: [{ field: 'sourceDocumentId', model: 'sourceDocument', label: 'Izvorni dokument' }],
    provenance: true,
    contentFields: ['requirementText', 'kind', 'status'],
    deletable: true,
    orderBy: { createdAt: 'asc' },
    validate: validateKind,
  },
  {
    path: 'research-findings',
    model: 'researchFinding',
    label: 'Nalaz istraživanja',
    stepKey: 'ZIS_RESEARCH',
    ...researchFinding,
    hasProjectId: true,
    references: [{ field: 'sourceDocumentId', model: 'sourceDocument', label: 'Izvorni dokument' }],
    provenance: true,
    contentFields: ['summary', 'details', 'kind'],
    deletable: true,
    orderBy: { createdAt: 'asc' },
    validate: validateKind,
    decisionTitle: (r) => `Usvojena preporuka: ${String(r.summary)}`,
  },
  {
    path: 'prior-designs',
    model: 'priorDesign',
    label: 'Pronađeni dizajn',
    stepKey: 'PRIOR_DESIGN_SEARCH',
    ...priorDesign,
    hasProjectId: true,
    references: [{ field: 'imageFileId', model: 'uploadedFile', label: 'Prikaz' }],
    provenance: true,
    contentFields: ['title', 'searchResult', 'legalConclusion', 'similarityLevel', 'similarFeatures', 'differingFeatures'],
    deletable: true,
    orderBy: { createdAt: 'asc' },
    include: { imageFile: true },
    validate: validateKind,
  },
  {
    path: 'search-coverage',
    model: 'searchCoverage',
    label: 'Zapis o pokrivenosti pretrage',
    stepKey: 'PRIOR_DESIGN_SEARCH',
    ...searchCoverage,
    hasProjectId: true,
    references: [],
    provenance: true,
    contentFields: ['database', 'query', 'status', 'resultSummary', 'blockedReason', 'coverageGap'],
    deletable: true,
    orderBy: { createdAt: 'asc' },
    validate: (dto, stored) => {
      const status = dto.status ?? stored?.status;
      const reason = String(dto.blockedReason ?? stored?.blockedReason ?? '').trim();
      if ((status === 'BLOCKED' || status === 'SKIPPED') && !reason) {
        throw new DomainError(
          'COVERAGE_REASON_REQUIRED',
          'Za blokiranu ili preskočenu pretragu potrebno je navesti šta je blokiralo pristup.',
        );
      }
    },
  },
  {
    path: 'representations',
    model: 'representation',
    label: 'Prikaz',
    stepKey: 'REPRESENTATION_PLAN',
    ...representation,
    hasProjectId: true,
    references: [{ field: 'uploadedFileId', model: 'uploadedFile', label: 'Dokument' }],
    provenance: true,
    // The assessment of a delivered image does not change the confirmed plan item itself.
    contentFields: ['viewName', 'purpose', 'featureShown', 'requirement', 'medium'],
    deletable: true,
    orderBy: { position: 'asc' },
    include: { uploadedFile: true },
    prepareCreate: async (dto, ctx) => {
      if (dto.position !== undefined) return dto;
      const last = await ctx.db.representation.findFirst({
        where: { projectId: ctx.projectId },
        orderBy: { position: 'desc' },
      });
      return { ...dto, position: (last?.position ?? 0) + 1 };
    },
  },
  {
    path: 'agent-tasks',
    model: 'agentTask',
    label: 'Zadatak agenta',
    stepKey: null,
    ...agentTask,
    hasProjectId: true,
    references: [],
    provenance: false,
    contentFields: [],
    deletable: true,
    orderBy: { createdAt: 'desc' },
  },
];
