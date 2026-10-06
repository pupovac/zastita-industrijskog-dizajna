import { ActorType, Prisma } from '@prisma/client';
import { ZodTypeAny } from 'zod';
import { StepKey } from '../domain/steps';

/** The subset of a Prisma model delegate the generic collection service uses. */
export interface CrudDelegate {
  findMany(args: object): Promise<Record<string, unknown>[]>;
  findUnique(args: object): Promise<Record<string, unknown> | null>;
  findFirst(args: object): Promise<Record<string, unknown> | null>;
  create(args: object): Promise<Record<string, unknown>>;
  update(args: object): Promise<Record<string, unknown>>;
  updateMany(args: object): Promise<{ count: number }>;
  delete(args: object): Promise<Record<string, unknown>>;
}

export type ModelName =
  | 'designVariant'
  | 'designFeature'
  | 'source'
  | 'sourceDocument'
  | 'sourceRequirement'
  | 'researchFinding'
  | 'priorDesign'
  | 'searchCoverage'
  | 'representation'
  | 'agentTask';

/** A reference field that must point to a record of the same project. */
export interface OwnedReference {
  field: string;
  model: 'uploadedFile' | 'designVariant' | 'source' | 'sourceDocument';
  label: string;
}

export interface CollectionContext {
  actor: ActorType;
  projectId: string;
  db: Prisma.TransactionClient;
}

/**
 * Describes one agent-writable entity of the project memory. Every collection gets
 * the same routes: list + create under the project, update / delete / confirm by id.
 */
export interface CollectionConfig {
  /** URL segment, e.g. "design-features". */
  path: string;
  model: ModelName;
  /** User-facing name for errors (Serbian). */
  label: string;
  /** Step the records belong to; used for decisions recorded on confirmation. */
  stepKey: StepKey | null;
  createSchema: ZodTypeAny;
  updateSchema: ZodTypeAny;
  /** false when the table has no projectId (ownership goes through `projectWhere`). */
  hasProjectId: boolean;
  projectWhere?: (projectId: string) => object;
  /** Resolves the project of a stored record (default: its projectId). */
  projectIdOf?: (record: Record<string, unknown>, db: Prisma.TransactionClient) => Promise<string>;
  references: OwnedReference[];
  /** Has `verified`: confirmation and edit-locking rules apply. */
  provenance: boolean;
  /** Fields whose change counts as a content change (drops the user's confirmation). */
  contentFields: string[];
  deletable: boolean;
  orderBy: object | object[];
  include?: object;
  /** Extra invariants on create/update input (after schema validation). */
  validate?: (dto: Record<string, unknown>, stored: Record<string, unknown> | null) => void;
  /** Adds computed values (e.g. next position) before create. */
  prepareCreate?: (dto: Record<string, unknown>, ctx: CollectionContext) => Promise<Record<string, unknown>>;
  /** Title of the decision recorded when the user adopts a recommendation. */
  decisionTitle?: (record: Record<string, unknown>) => string;
}
