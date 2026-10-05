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
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStep {
  id: string;
  stepKey: string;
  title: string;
  position: number;
  status: StepStatus;
  blockedReason: string | null;
  openBlockingItems: number;
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
  allowsAttachment: boolean;
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
  | 'DOCUMENT_NEEDS_MANUAL_REVIEW';

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
