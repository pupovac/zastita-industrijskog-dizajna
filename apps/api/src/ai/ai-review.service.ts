import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AiReview, AiSuggestion, Prisma } from '@prisma/client';
import { DomainError } from '../domain/domain-error';
import { findPatentTerms, PatentTermMatch } from '../domain/patent-terms';
import { isAllowedTarget, stepGuide } from '../domain/step-guides';
import { isStepKey, StepKey, stepPosition, stepTitle } from '../domain/steps';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { AiConfig } from './ai-config';
import { estimateCostUsd } from './ai-pricing';
import { AI_DISCLAIMER, renderRequirementsMatrix, renderStepContext, SYSTEM_PROMPT } from './ai-prompt';
import { AI_REVIEW_JSON_SCHEMA, AiReviewResponse, parseAiReviewResponse } from './ai-review.schema';
import { AI_MODEL_CLIENT, AiModelClient, describeApiError } from './anthropic-client';
import { StepContextService } from './step-context.service';

/** Room for a long structured answer; streaming means the limit is not a timeout concern. */
const MAX_OUTPUT_TOKENS = 16_000;

export const NOT_CONFIGURED_MESSAGE = 'AI provera nije konfigurisana.';
export const REFUSED_MESSAGE = 'AI nije mogao da obradi zahtev.';

export interface RequirementRef {
  code: string;
  text: string;
  status: 'CONFIRMED' | 'UNVERIFIED';
  url: string | null;
  sourceReference: string;
}

export interface AiSuggestionView {
  id: string;
  position: number;
  target: { entity: string; id: string | null; field: string };
  currentValue: string;
  proposedValue: string;
  rationale: string;
  requirementRef: string | null;
  requirement: RequirementRef | null;
  status: AiSuggestion['status'];
  decidedAt: Date | null;
  appliedReference: string | null;
}

export interface AiReviewView {
  id: string;
  projectId: string;
  stepKey: string;
  model: string;
  status: AiReview['status'];
  requestSummary: string;
  errorMessage: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  estimatedCostUsd: number | null;
  createdAt: Date;
  summary: string;
  findings: (AiReviewResponse['findings'][number] & { requirement: RequirementRef | null })[];
  openQuestions: string[];
  suggestions: AiSuggestionView[];
  /** Patent terminology slipped into the answer despite the prompt; shown to the user. */
  terminologyIssues: PatentTermMatch[];
  disclaimer: string;
}

type ReviewWithSuggestions = AiReview & { suggestions: AiSuggestion[] };

/**
 * „Proveri sa AI" for one step. Reads the step's state, asks the model for findings and
 * suggestions, and stores the result with its tokens and cost. The model's output is an
 * AI inference; it never changes a status and never becomes a fact by itself —
 * see AiSuggestionsService for the only path into the project memory.
 */
@Injectable()
export class AiReviewService {
  private readonly logger = new Logger(AiReviewService.name);
  /** One call per step at a time (single API replica — see deploy notes). */
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly config: AiConfig,
    private readonly context: StepContextService,
    @Inject(AI_MODEL_CLIENT) private readonly model: AiModelClient,
  ) {}

  status() {
    return this.config.publicStatus();
  }

  async list(projectId: string, stepKey: string): Promise<AiReviewView[]> {
    this.assertStep(stepKey);
    await this.projects.assertExists(projectId);
    const reviews = await this.prisma.aiReview.findMany({
      where: { projectId, stepKey },
      orderBy: { createdAt: 'desc' },
      include: { suggestions: { orderBy: { position: 'asc' } } },
    });
    return this.views(projectId, reviews);
  }

  async usage(projectId: string) {
    await this.projects.assertExists(projectId);
    const [totals, today] = await Promise.all([
      this.prisma.aiReview.aggregate({
        where: { projectId },
        _count: { _all: true },
        _sum: { inputTokens: true, outputTokens: true, cacheReadTokens: true, cacheCreationTokens: true, estimatedCostUsd: true },
      }),
      this.prisma.aiReview.count({ where: { projectId, createdAt: { gte: startOfTodayUtc() } } }),
    ]);
    return {
      calls: totals._count._all,
      callsToday: today,
      maxCallsPerDay: this.config.maxCallsPerProjectPerDay,
      inputTokens: totals._sum.inputTokens ?? 0,
      outputTokens: totals._sum.outputTokens ?? 0,
      cacheReadTokens: totals._sum.cacheReadTokens ?? 0,
      cacheCreationTokens: totals._sum.cacheCreationTokens ?? 0,
      estimatedCostUsd: totals._sum.estimatedCostUsd ?? 0,
    };
  }

  /** Runs one review. Returns the stored record, also when the model refused or failed. */
  async review(projectId: string, stepKey: string): Promise<AiReviewView> {
    const key = this.assertStep(stepKey);
    await this.projects.assertExists(projectId);
    if (!this.config.configured) {
      throw new DomainError('AI_NOT_CONFIGURED', NOT_CONFIGURED_MESSAGE, 'CONFLICT');
    }
    const lock = `${projectId}:${key}`;
    if (this.inFlight.has(lock)) {
      throw new DomainError('AI_REVIEW_IN_PROGRESS', 'AI provera ovog koraka je već u toku. Sačekajte da se završi.', 'CONFLICT');
    }
    const today = await this.prisma.aiReview.count({ where: { projectId, createdAt: { gte: startOfTodayUtc() } } });
    if (today >= this.config.maxCallsPerProjectPerDay) {
      throw new DomainError(
        'AI_DAILY_LIMIT_REACHED',
        `Dostignut je dnevni limit AI provera za ovaj projekat (${this.config.maxCallsPerProjectPerDay}). Pokušajte sutra ili povećajte AI_MAX_CALLS_PER_PROJECT_PER_DAY.`,
        'CONFLICT',
      );
    }

    this.inFlight.add(lock);
    try {
      const guide = stepGuide(key);
      const context = await this.context.build(projectId, key, guide, this.config.maxContextChars);
      const requirements = await this.prisma.sourceRequirement.findMany({ where: { projectId } });
      const system: Anthropic.Beta.BetaTextBlockParam[] = [
        { type: 'text', text: SYSTEM_PROMPT },
        // Stable per project → cached; everything after it varies per call.
        { type: 'text', text: renderRequirementsMatrix(requirements), cache_control: { type: 'ephemeral' } },
      ];
      const userText = renderStepContext(guide, stepTitle(key), stepPosition(key), context);

      let message: Anthropic.Beta.BetaMessage;
      try {
        message = await this.model.complete({
          model: this.config.model,
          system,
          userText,
          schema: AI_REVIEW_JSON_SCHEMA as unknown as Record<string, unknown>,
          maxTokens: MAX_OUTPUT_TOKENS,
        });
      } catch (error) {
        this.logger.warn(`AI review failed for ${lock}: ${describeApiError(error)}`);
        return this.store(projectId, key, {
          model: this.config.model,
          status: 'ERROR',
          requestSummary: context.summary,
          errorMessage: describeApiError(error),
        });
      }

      const usage = {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
        cacheCreationTokens: message.usage.cache_creation_input_tokens ?? 0,
      };
      const base = {
        model: message.model,
        requestSummary: context.summary,
        ...usage,
        estimatedCostUsd: estimateCostUsd(message.model, usage),
      };

      if (message.stop_reason === 'refusal') {
        const category = message.stop_details?.category ?? null;
        return this.store(projectId, key, {
          ...base,
          status: 'REFUSED',
          errorMessage: `${REFUSED_MESSAGE}${category ? ` (kategorija: ${category})` : ''}`,
        });
      }
      const text = message.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      if (message.stop_reason === 'max_tokens') {
        return this.store(projectId, key, { ...base, status: 'ERROR', responseJson: text, errorMessage: 'Odgovor modela je prekinut (dostignut max_tokens); rezultat nije sačuvan kao nalaz.' });
      }
      const parsed = parseAiReviewResponse(text);
      if (!parsed.ok) {
        return this.store(projectId, key, { ...base, status: 'ERROR', responseJson: text, errorMessage: parsed.error });
      }

      const response = parsed.response;
      const proposals = [
        ...response.suggestions,
        ...response.openQuestions
          .filter((q) => q.trim())
          .map((q) => ({ target: { entity: 'OpenQuestion' as const, id: null, field: 'text' }, proposedValue: q.trim(), rationale: '', requirementRef: null })),
      ].filter((s) => isAllowedTarget(guide, s.target.entity, s.target.field, Boolean(s.target.id)));

      return this.store(projectId, key, {
        ...base,
        status: 'OK',
        responseJson: JSON.stringify(response),
        suggestions: {
          create: proposals.map((s, position) => ({
            position,
            targetEntity: s.target.entity,
            targetId: s.target.id,
            targetField: s.target.field,
            currentValue: context.currentValue(s.target.entity, s.target.id, s.target.field),
            proposedValue: s.proposedValue,
            rationale: s.rationale,
            requirementRef: s.requirementRef,
          })),
        },
      });
    } finally {
      this.inFlight.delete(lock);
    }
  }

  private async store(projectId: string, stepKey: StepKey, data: Omit<Prisma.AiReviewCreateInput, 'project' | 'stepKey'>): Promise<AiReviewView> {
    const review = await this.prisma.aiReview.create({
      data: { ...data, stepKey, project: { connect: { id: projectId } } },
      include: { suggestions: { orderBy: { position: 'asc' } } },
    });
    const [view] = await this.views(projectId, [review]);
    return view;
  }

  async view(review: ReviewWithSuggestions): Promise<AiReviewView> {
    const [view] = await this.views(review.projectId, [review]);
    return view;
  }

  private async views(projectId: string, reviews: ReviewWithSuggestions[]): Promise<AiReviewView[]> {
    const parsed = reviews.map((r) => (r.status === 'OK' ? parseAiReviewResponse(r.responseJson) : null));
    const codes = new Set<string>();
    parsed.forEach((p) => {
      if (p?.ok) p.response.findings.forEach((f) => f.relatedRequirement && codes.add(f.relatedRequirement));
    });
    reviews.forEach((r) => r.suggestions.forEach((s) => s.requirementRef && codes.add(s.requirementRef)));
    const refs = await this.requirementRefs(projectId, codes);

    return reviews.map((review, i) => {
      const response = parsed[i]?.ok ? (parsed[i] as { ok: true; response: AiReviewResponse }).response : null;
      const texts = response
        ? [response.summary, ...response.findings.flatMap((f) => [f.title, f.detail]), ...review.suggestions.flatMap((s) => [s.proposedValue, s.rationale])]
        : [];
      return {
        id: review.id,
        projectId: review.projectId,
        stepKey: review.stepKey,
        model: review.model,
        status: review.status,
        requestSummary: review.requestSummary,
        errorMessage: review.errorMessage,
        inputTokens: review.inputTokens,
        outputTokens: review.outputTokens,
        cacheReadTokens: review.cacheReadTokens,
        cacheCreationTokens: review.cacheCreationTokens,
        estimatedCostUsd: review.estimatedCostUsd,
        createdAt: review.createdAt,
        summary: response?.summary ?? '',
        findings: (response?.findings ?? []).map((f) => ({ ...f, requirement: f.relatedRequirement ? (refs.get(f.relatedRequirement) ?? null) : null })),
        openQuestions: response?.openQuestions ?? [],
        suggestions: review.suggestions.map((s) => ({
          id: s.id,
          position: s.position,
          target: { entity: s.targetEntity, id: s.targetId, field: s.targetField },
          currentValue: s.currentValue,
          proposedValue: s.proposedValue,
          rationale: s.rationale,
          requirementRef: s.requirementRef,
          requirement: s.requirementRef ? (refs.get(s.requirementRef) ?? null) : null,
          status: s.status,
          decidedAt: s.decidedAt,
          appliedReference: s.appliedReference,
        })),
        terminologyIssues: findPatentTerms(texts.join('\n')),
        disclaimer: AI_DISCLAIMER,
      };
    });
  }

  /** „Prikaži izvor": the matrix rows the answer refers to, with the first cited document's URL. */
  private async requirementRefs(projectId: string, codes: Set<string>): Promise<Map<string, RequirementRef>> {
    if (codes.size === 0) return new Map();
    const rows = await this.prisma.sourceRequirement.findMany({
      where: { projectId, code: { in: [...codes] } },
      include: { citations: { orderBy: { position: 'asc' }, take: 1, include: { sourceDocument: { include: { source: true } } } } },
    });
    return new Map(
      rows.map((r) => [
        r.code!,
        {
          code: r.code!,
          text: r.requirementText,
          status: r.status,
          url: r.citations[0]?.sourceDocument.url ?? r.citations[0]?.sourceDocument.source.url ?? null,
          sourceReference: r.sourceReference,
        },
      ]),
    );
  }

  private assertStep(stepKey: string): StepKey {
    if (!isStepKey(stepKey)) throw new DomainError('STEP_NOT_FOUND', 'Nepoznat korak.', 'NOT_FOUND');
    return stepKey;
  }
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
