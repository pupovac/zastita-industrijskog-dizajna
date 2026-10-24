import { Injectable } from '@nestjs/common';
import { ActorType, AiSuggestion, Prisma } from '@prisma/client';
import { COLLECTIONS } from '../collections/collections';
import { CollectionsService } from '../collections/collections.service';
import { orNotFound } from '../common/not-found';
import { D1Service } from '../d1/d1.module';
import { d1Field } from '../domain/d1-fields';
import { DomainError } from '../domain/domain-error';
import { planContentChange } from '../domain/fact-rules';
import { DESIGN_FEATURE_FIELDS, PRIOR_DESIGN_FIELDS, PROJECT_FIELDS, REPRESENTATION_FIELDS, stepGuide } from '../domain/step-guides';
import { isStepKey, stepTitle } from '../domain/steps';
import { DraftingService } from '../drafting/drafting.service';
import { PrismaService } from '../prisma/prisma.service';
import { StrategyService } from '../strategy/strategy.module';
import { AiReviewService, AiReviewView } from './ai-review.service';

type Review = Prisma.AiReviewGetPayload<{ include: { suggestions: true } }>;

/** Provenance every accepted value carries: the user's, with a pointer back to the suggestion. */
export function acceptedProvenance(suggestion: Pick<AiSuggestion, 'id'>) {
  return { sourceType: 'USER' as const, sourceReference: `ai-suggestion:${suggestion.id}` };
}

/**
 * The only path from an AI suggestion into the project memory. Only the user may accept
 * or reject (403 otherwise). An accepted value is written as the user's own input
 * (`sourceType: USER`, reference to the suggestion) — never as a verified fact: confirmation
 * („POTVRDI") stays a separate, explicit step.
 */
@Injectable()
export class AiSuggestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: AiReviewService,
    private readonly collections: CollectionsService,
    private readonly drafting: DraftingService,
    private readonly d1: D1Service,
    private readonly strategy: StrategyService,
  ) {}

  async accept(suggestionId: string, actor: ActorType): Promise<AiReviewView> {
    const { suggestion, review } = await this.claim(suggestionId, actor, 'ACCEPTED');
    let appliedReference: string;
    try {
      appliedReference = await this.apply(review, suggestion);
    } catch (error) {
      // Nothing was written: give the suggestion back to the user.
      await this.prisma.aiSuggestion.update({ where: { id: suggestionId }, data: { status: 'PROPOSED', decidedAt: null } });
      throw error;
    }
    await this.prisma.aiSuggestion.update({ where: { id: suggestionId }, data: { appliedReference } });
    await this.recordDecision(review, suggestion, 'Prihvaćen', appliedReference);
    return this.reload(review.id);
  }

  async reject(suggestionId: string, actor: ActorType): Promise<AiReviewView> {
    const { suggestion, review } = await this.claim(suggestionId, actor, 'REJECTED');
    await this.recordDecision(review, suggestion, 'Odbijen', null);
    return this.reload(review.id);
  }

  /** Marks the suggestion decided, only once and only by the user. */
  private async claim(suggestionId: string, actor: ActorType, status: 'ACCEPTED' | 'REJECTED') {
    if (actor !== 'USER') {
      throw new DomainError('AI_SUGGESTION_REQUIRES_USER', 'Samo korisnik može da prihvati ili odbije AI predlog.', 'FORBIDDEN');
    }
    const suggestion = orNotFound(
      await this.prisma.aiSuggestion.findUnique({ where: { id: suggestionId }, include: { review: { include: { suggestions: true } } } }),
      'AI predlog',
    );
    const claimed = await this.prisma.aiSuggestion.updateMany({
      where: { id: suggestionId, status: 'PROPOSED' },
      data: { status, decidedAt: new Date() },
    });
    if (claimed.count !== 1) {
      throw new DomainError('AI_SUGGESTION_ALREADY_DECIDED', 'O ovom predlogu je već odlučeno.', 'CONFLICT');
    }
    return { suggestion, review: suggestion.review };
  }

  private async recordDecision(review: Review, suggestion: AiSuggestion, verb: string, appliedReference: string | null) {
    const step = isStepKey(review.stepKey) ? stepTitle(review.stepKey) : review.stepKey;
    const target = `${suggestion.targetEntity}${suggestion.targetId ? `#${suggestion.targetId.slice(0, 8)}` : ''}.${suggestion.targetField}`;
    await this.prisma.decision.create({
      data: {
        projectId: review.projectId,
        stepKey: isStepKey(review.stepKey) ? review.stepKey : null,
        title: `${verb} AI predlog (${step}): ${target} → „${truncate(suggestion.proposedValue, 160)}"`,
        rationale: suggestion.rationale,
        decidedBy: 'USER',
        sourceType: 'USER',
        sourceReference: appliedReference ?? `ai-suggestion:${suggestion.id}`,
      },
    });
  }

  private async reload(reviewId: string): Promise<AiReviewView> {
    const review = await this.prisma.aiReview.findUniqueOrThrow({
      where: { id: reviewId },
      include: { suggestions: { orderBy: { position: 'asc' } } },
    });
    return this.reviews.view(review);
  }

  /** Writes the accepted value into its target. Returns where it went. */
  private async apply(review: Review, s: AiSuggestion): Promise<string> {
    const projectId = review.projectId;
    const actor: ActorType = 'USER';
    const provenance = acceptedProvenance(s);
    const guide = isStepKey(review.stepKey) ? stepGuide(review.stepKey) : null;
    const unsupported = () =>
      new DomainError('AI_SUGGESTION_TARGET_UNSUPPORTED', `Predlog cilja na ${s.targetEntity}.${s.targetField}, što se ne može upisati automatski. Unesite vrednost ručno.`);
    const field = s.targetField;
    const value = s.proposedValue;

    switch (s.targetEntity) {
      case 'Project': {
        if (!(PROJECT_FIELDS as readonly string[]).includes(field)) throw unsupported();
        await this.prisma.project.update({ where: { id: projectId }, data: { [field]: value } });
        return `project/${projectId}#${field}`;
      }
      case 'Fact': {
        if (field !== 'statement' && field !== 'value') throw unsupported();
        if (s.targetId) {
          const fact = orNotFound(await this.prisma.fact.findFirst({ where: { id: s.targetId, projectId } }), 'Podatak');
          const next = planContentChange(fact, {
            actor,
            statementChanged: field === 'statement' && value !== fact.statement,
            valueChanged: field === 'value' && value !== fact.value,
          });
          await this.prisma.fact.update({ where: { id: fact.id }, data: { [field]: value, ...next, ...provenance } });
          return `fact/${fact.id}`;
        }
        if (field !== 'statement') throw unsupported();
        const created = await this.prisma.fact.create({
          data: {
            projectId,
            category: guide?.factCategory ?? 'OTHER',
            kind: 'USER_STATEMENT',
            originKind: 'USER_STATEMENT',
            statement: value,
            ...provenance,
            createdByActor: actor,
          },
        });
        return `fact/${created.id}`;
      }
      case 'DesignFeature':
      case 'PriorDesign':
      case 'Representation': {
        const allowed: Record<string, readonly string[]> = {
          DesignFeature: DESIGN_FEATURE_FIELDS,
          PriorDesign: PRIOR_DESIGN_FIELDS,
          Representation: REPRESENTATION_FIELDS,
        };
        if (!allowed[s.targetEntity].includes(field)) throw unsupported();
        const config = COLLECTIONS.find((c) => c.model === lowerFirst(s.targetEntity))!;
        const kind = s.targetEntity === 'Representation' ? {} : { kind: 'USER_STATEMENT' };
        if (s.targetId) {
          const stored = orNotFound(
            await (this.prisma[config.model] as unknown as { findFirst(args: object): Promise<{ id: string } | null> }).findFirst({ where: { id: s.targetId, projectId } }),
            config.label,
          );
          const dto = this.validated(config.updateSchema, { [field]: value, ...kind, ...provenance });
          await this.collections.update(config, stored.id, dto, actor);
          return `${config.path}/${stored.id}`;
        }
        if (s.targetEntity !== 'DesignFeature' || field !== 'name') throw unsupported();
        const dto = this.validated(config.createSchema, { name: value, ...kind, ...provenance });
        const created = (await this.collections.create(config, projectId, dto, actor)) as { id: string };
        return `${config.path}/${created.id}`;
      }
      case 'ApplicationSection': {
        if (field !== 'content' || !s.targetId) throw unsupported();
        const section = orNotFound(await this.prisma.applicationSection.findFirst({ where: { id: s.targetId, projectId } }), 'Sekcija opisa');
        const version = await this.drafting.addVersion(section.id, { content: value, ...provenance }, actor);
        return `draft-version/${version.id}`;
      }
      case 'D1FieldValue': {
        if (!d1Field(field)) throw unsupported();
        const saved = await this.d1.save(projectId, field, { value, ...provenance }, actor);
        return `d1/${saved.fieldKey}`;
      }
      case 'ProtectionStrategyItem': {
        if (!['FILING_TYPE', 'VARIANT_RESOLUTION', 'DEFERRED_PUBLICATION', 'PRIORITY_CLAIM'].includes(field)) throw unsupported();
        const saved = await this.strategy.save(
          projectId,
          field as 'FILING_TYPE',
          { value, rationale: s.rationale, ...(s.requirementRef ? { requirementRefs: s.requirementRef } : {}), kind: 'USER_STATEMENT', ...provenance },
          actor,
        );
        return `strategy/${saved.key}`;
      }
      case 'OpenQuestion': {
        if (field !== 'text') throw unsupported();
        const question = await this.prisma.openQuestion.create({
          data: {
            projectId,
            stepKey: isStepKey(review.stepKey) ? review.stepKey : null,
            text: value,
            whyNeeded: s.rationale,
            blocking: false,
            ...provenance,
            createdBy: actor,
          },
        });
        return `open-question/${question.id}`;
      }
      default:
        throw unsupported();
    }
  }

  private validated<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: { path: (string | number)[]; message: string }[] } } }, dto: Record<string, unknown>): T {
    const result = schema.safeParse(dto);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      throw new DomainError('AI_SUGGESTION_INVALID_VALUE', `Predložena vrednost nije prihvatljiva za ovo polje (${issues}). Unesite vrednost ručno.`);
    }
    return result.data;
  }
}

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
