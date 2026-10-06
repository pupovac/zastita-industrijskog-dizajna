// Mirrors of the API response shapes (enum values are English codes; labels live in lib/labels.ts).

export type StepStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_USER'
  | 'BLOCKED'
  | 'READY_FOR_REVIEW'
  | 'APPROVED';

export type SourceType = 'USER' | 'DOCUMENT' | 'ZIS' | 'WIPO' | 'EUIPO' | 'AGENT_INFERENCE';
export type InformationKind = 'FACT' | 'USER_STATEMENT' | 'LEGAL_REQUIREMENT' | 'AI_INFERENCE' | 'RECOMMENDATION';
export type ActorType = 'USER' | 'AGENT' | 'SYSTEM';
export type FactCategory = 'PRODUCT' | 'VISUAL' | 'APPLICANT' | 'DESIGNER' | 'APPLICATION_FIELD' | 'OTHER';
export type FileRole = 'PHOTO' | 'TECHNICAL_DRAWING' | 'RENDER' | 'CAD_EXPORT' | 'DOCUMENT' | 'OTHER';
export type ExtractionStatus = 'PENDING' | 'EXTRACTED' | 'NOT_SUPPORTED' | 'FAILED';
export type Severity = 'BLOCKER' | 'HIGH' | 'MEDIUM' | 'LOW';
export type FunctionalityRisk = 'LOW_RISK' | 'NEEDS_FURTHER_REVIEW' | 'HIGH_FUNCTIONAL_DEPENDENCE';

export interface Project {
  id: string;
  name: string;
  productName: string;
  productSummary: string;
  applicantName: string;
  applicantAddress: string;
  designerName: string;
  representativeName: string;
  currentStepKey: string;
  /** Demo project with invented data ("[DEMO] … – mock podaci"). */
  isDemo: boolean;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

/** DRAFTING: description and representations up to review. FILING: needed only to submit. */
export type StepPhase = 'DRAFTING' | 'FILING';

export interface ProjectStep {
  id: string;
  stepKey: string;
  title: string;
  position: number;
  phase: StepPhase;
  status: StepStatus;
  blockedReason: string | null;
  openBlockingItems: number;
  /** Step 13 only: unresolved BLOCKER findings that keep the final package closed. */
  blockedByBlockerFindings: number;
  updatedAt: string;
}

export interface UploadedFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  role: FileRole;
  extractionStatus: ExtractionStatus;
  extractedText?: string | null;
  metadataJson: string;
  summary: string;
  extractionError: string | null;
  replacedById?: string | null;
  createdAt: string;
}

export interface UserAnswer {
  id: string;
  value: string;
  attachmentFileId: string | null;
  attachment: UploadedFile | null;
  updatedAt: string;
}

export interface Question {
  id: string;
  stepKey: string;
  position: number;
  text: string;
  whyNeeded: string;
  exampleAnswer: string;
  required: boolean;
  deferredToFiling: boolean;
  allowsAttachment: boolean;
  interviewGroup: string | null;
  answer: UserAnswer | null;
}

export interface Fact {
  id: string;
  category: FactCategory;
  kind: InformationKind;
  originKind: InformationKind;
  statement: string;
  value: string;
  sourceType: SourceType;
  sourceReference: string | null;
  userAnswerId: string | null;
  uploadedFileId: string | null;
  confidence: number | null;
  verified: boolean;
  confirmedAt: string | null;
  confirmedBy: ActorType | null;
  confirmedUserFact: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewIssue {
  id: string;
  stepKey: string | null;
  type: 'CONFLICT' | 'RISK' | 'FINDING';
  severity: Severity;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  title: string;
  description: string;
  conflictAttribute: string | null;
  fileAId: string | null;
  fileBId: string | null;
  chosenFileId: string | null;
  resolutionNote: string | null;
  resolvedBy: ActorType | null;
  resolvedAt: string | null;
  checkKey: string | null;
  sourceType: SourceType;
  sourceReference: string | null;
  createdByActor: ActorType;
  fileA?: UploadedFile | null;
  fileB?: UploadedFile | null;
  chosenFile?: UploadedFile | null;
  createdAt: string;
}

export interface Decision {
  id: string;
  stepKey: string | null;
  title: string;
  rationale: string;
  decidedBy: ActorType;
  sourceReference: string | null;
  createdAt: string;
}

export interface OpenQuestion {
  id: string;
  stepKey: string | null;
  text: string;
  whyNeeded: string;
  blocking: boolean;
  deferredToFiling: boolean;
  status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  answer: string | null;
  createdAt: string;
}

export interface DesignFeature {
  id: string;
  name: string;
  description: string;
  functionalityRisk: FunctionalityRisk | null;
  kind: InformationKind;
  sourceType: SourceType;
  sourceReference: string | null;
  verified: boolean;
  variant: { id: string; name: string } | null;
}

export interface SourceRequirement {
  id: string;
  requirementText: string;
  section: string;
  impactOnApplication: string;
  kind: InformationKind;
  sourceType: SourceType;
  sourceReference: string;
  verified: boolean;
  sourceDocument: {
    title: string;
    url: string | null;
    section: string | null;
    accessedAt: string | null;
    source: { name: string; url: string };
  };
}

export interface PriorDesign {
  id: string;
  title: string;
  registrationNumber: string | null;
  holder: string | null;
  url: string | null;
  similarityNotes: string;
  kind: InformationKind;
  sourceType: SourceType;
  sourceReference: string | null;
  verified: boolean;
}

export interface ApplicationSection {
  id: string;
  key: string;
  title: string;
  required: boolean;
  confirmed: boolean;
  latestVersion: { versionNumber: number; content: string; createdAt: string } | null;
}

export type MissingInfoType =
  | 'PROJECT_FIELD'
  | 'REQUIRED_QUESTION'
  | 'UNCONFIRMED_INFORMATION'
  | 'OPEN_QUESTION'
  | 'CONFLICT'
  | 'DOCUMENT_NEEDS_MANUAL_REVIEW'
  | 'DEFERRED_TO_FILING';

export interface MissingInfoItem {
  type: MissingInfoType;
  label: string;
  stepKey: string | null;
  refId: string | null;
  blocking: boolean;
}

export interface Knowledge {
  project: Project;
  sections: {
    productFacts: Fact[];
    visualFeatures: { features: DesignFeature[]; facts: Fact[] };
    applicant: { name: string; address: string; representative: string; facts: Fact[] };
    designer: { name: string; facts: Fact[] };
    documents: UploadedFile[];
    zisRules: SourceRequirement[];
    priorDesigns: PriorDesign[];
    decisions: Decision[];
    openQuestions: OpenQuestion[];
    risks: ReviewIssue[];
    applicationFields: { sections: ApplicationSection[]; facts: Fact[] };
    otherFacts: Fact[];
  };
  missingInfo: MissingInfoItem[];
}

// ---------------------------------------------------------------------------
// FUZZ-130: data of steps 2–14
// ---------------------------------------------------------------------------

export type FeatureCategory = 'A_VISUAL' | 'B_MIXED' | 'C_TECHNICAL' | 'D_UNCLEAR';
export type SimilarityLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type SearchCoverageStatus = 'COMPLETED' | 'PARTIAL' | 'BLOCKED' | 'SKIPPED';
export type RepresentationRequirement = 'MANDATORY' | 'RECOMMENDED';
export type RepresentationMedium = 'RENDER' | 'CAD' | 'PHOTO' | 'LINE_DRAWING';
export type RepresentationAssessment = 'ACCEPTABLE' | 'NEEDS_REWORK' | 'UNSUITABLE';
export type ReviewIssueStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';
export type StrategyItemKey = 'FILING_TYPE' | 'VARIANT_RESOLUTION' | 'DEFERRED_PUBLICATION' | 'PRIORITY_CLAIM';
export type SignoffRole = 'APPLICANT' | 'REPRESENTATIVE';
export type GeneratedDocumentType =
  | 'DESCRIPTION'
  | 'PACKAGE_DOCX'
  | 'PACKAGE_PDF'
  | 'D1_DATA'
  | 'REPRESENTATION_INDEX'
  | 'FILING_CHECKLIST'
  | 'ATTACHMENT_LIST'
  | 'SOURCES_REPORT'
  | 'OPEN_LEGAL_QUESTIONS';

/** Fields every agent-writable record carries. */
export interface Provenance {
  id: string;
  sourceType: SourceType;
  sourceReference: string | null;
  confidence: number | null;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchFinding extends Provenance {
  code: string | null;
  summary: string;
  details: string;
  kind: InformationKind;
}

export interface SourceDocument {
  id: string;
  title: string;
  url: string | null;
  section: string | null;
  localCopyPath: string | null;
  accessedAt: string | null;
  researchFindings: ResearchFinding[];
}

export interface Source {
  id: string;
  code: string | null;
  name: string;
  url: string;
  sourceType: SourceType;
  priority: number;
  institution: string;
  documentKind: string;
  documentVersion: string;
  relevantSections: string;
  significance: string;
  localCopiesJson: string;
  accessedAt: string | null;
  documents: SourceDocument[];
}

export interface RequirementCitation {
  id: string;
  location: string;
  sourceDocument: { id: string; title: string; url: string | null; source: { id: string; code: string | null; name: string; url: string } };
}

export interface MatrixRequirement {
  id: string;
  code: string | null;
  requirementText: string;
  section: string;
  impactOnApplication: string;
  kind: InformationKind;
  sourceType: SourceType;
  sourceReference: string;
  status: 'CONFIRMED' | 'UNVERIFIED';
  area: string;
  areaCode: string;
  phases: { number: number; name: string }[];
  isDiscrepancy: boolean;
  precedence: string;
  openItems: string[];
  accessDate: string;
  verified: boolean;
  citations: RequirementCitation[];
}

export interface ResearchReportSection {
  id: string;
  code: string;
  position: number;
  heading: string;
  body: string;
  sourceReference: string;
}

export interface ResearchImportSummary {
  sources: number;
  sourceDocuments: number;
  findings: number;
  requirements: number;
  citations: number;
  reportSections: number;
}

export interface InterviewGroup {
  key: string;
  title: string;
  highPriority: boolean;
}

export interface FunctionAnalysisAnswer extends Provenance {
  questionNumber: number;
  answer: string;
  kind: InformationKind;
}

export interface DesignVariant extends Provenance {
  name: string;
  description: string;
}

export interface DesignFeatureRecord extends Provenance {
  variantId: string | null;
  name: string;
  description: string;
  category: FeatureCategory | null;
  categoryRationale: string;
  functionalityRisk: FunctionalityRisk | null;
  riskRationale: string;
  kind: InformationKind;
  variant: DesignVariant | null;
  functionAnalysis: FunctionAnalysisAnswer[];
}

export interface PriorDesignRecord extends Provenance {
  title: string;
  registrationNumber: string | null;
  holder: string | null;
  url: string | null;
  country: string | null;
  designDate: string | null;
  locarnoClass: string | null;
  database: string | null;
  imageFileId: string | null;
  imageFile: UploadedFile | null;
  similarFeatures: string;
  differingFeatures: string;
  similarityLevel: SimilarityLevel | null;
  similarityNotes: string;
  searchResult: string;
  legalConclusion: string;
  kind: InformationKind;
}

export interface SearchCoverage extends Provenance {
  database: string;
  query: string;
  searchedAt: string | null;
  status: SearchCoverageStatus;
  resultSummary: string;
  blockedReason: string;
  coverageGap: string;
}

export interface StrategyItem extends Provenance {
  key: StrategyItemKey;
  value: string;
  details: string;
  rationale: string;
  requirementRefs: string;
  kind: InformationKind;
}

export interface StrategyEntry {
  key: StrategyItemKey;
  title: string;
  allowedValues: string[] | null;
  item: StrategyItem | null;
  requirements: (Omit<MatrixRequirement, 'phases' | 'openItems'> & { citations: RequirementCitation[] })[];
  unknownRequirementRefs: string[];
}

export interface Representation extends Provenance {
  uploadedFileId: string | null;
  uploadedFile: UploadedFile | null;
  position: number;
  viewName: string;
  notes: string;
  purpose: string;
  featureShown: string;
  requirement: RepresentationRequirement;
  medium: RepresentationMedium | null;
  mediumRationale: string;
  assessment: RepresentationAssessment | null;
  assessmentNote: string;
}

export interface PatentTermMatch {
  term: string;
  match: string;
  index: number;
}

export interface DraftVersion {
  id: string;
  versionNumber: number;
  content: string;
  createdByActor: ActorType;
  sourceType: SourceType;
  sourceReference: string | null;
  verified: boolean;
  createdAt: string;
  terminologyIssues: PatentTermMatch[];
}

export interface ApplicationSectionRecord {
  id: string;
  key: string;
  title: string;
  required: boolean;
  confirmed: boolean;
  position: number;
  versions: DraftVersion[];
}

export interface D1Field {
  key: string;
  number: string;
  label: string;
  legalBasis: string;
  requirementRefs: string[];
  conditional: boolean;
  deferredToFiling: boolean;
  hint: string;
  missing: boolean;
  value: (Provenance & { fieldKey: string; value: string; notes: string; deferredToFiling: boolean | null }) | null;
}

export interface ReviewCheck {
  key: string;
  label: string;
}

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
  detail: string;
}

export interface GeneratedDocument {
  id: string;
  type: GeneratedDocumentType;
  versionNumber: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  isFinal: boolean;
  isDemo: boolean;
  missingJson: string;
  createdByActor: ActorType;
  createdAt: string;
}

export interface PackageStatus {
  checklist: ChecklistItem[];
  openBlockers: number;
  terminology: { sectionTitle: string; matches: PatentTermMatch[] }[];
  gate: { canGenerate: boolean; blockedCode: string | null; blockedReason: string | null; isFinal: boolean; missing: string[] };
  latestVersion: number | null;
  documents: { type: GeneratedDocumentType; versions: GeneratedDocument[] }[];
}

export interface FinalSignoff {
  id: string;
  reviewerName: string;
  role: SignoffRole;
  note: string;
  packageVersion: number | null;
  confirmedAt: string;
}

export interface AgentTask {
  id: string;
  stepKey: string | null;
  agentName: string;
  title: string;
  status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
  resultSummary: string;
  createdAt: string;
}
