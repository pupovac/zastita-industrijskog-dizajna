import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ActorType, AiDraft, AiDraftSection, Prisma } from '@prisma/client';
import { orNotFound } from '../common/not-found';
import { DomainError } from '../domain/domain-error';
import { DraftEstimate, estimateDraft } from '../domain/draft-estimate';
import { countPlaceholders } from '../domain/draft-rules';
import { countWords, estimatePages } from '../domain/draft-length';
import { PlannedSection, planDraftSections } from '../domain/draft-plan';
import { findPatentTerms, PatentTermMatch } from '../domain/patent-terms';
import { DraftingService } from '../drafting/drafting.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { AiConfig } from './ai-config';
import { AI_DRAFT_DISCLAIMER, DRAFT_SYSTEM_PROMPT, renderSectionTask, TRUNCATED_MARKER, ZIS_BOTTLE_EXAMPLE } from './ai-draft-prompt';
import { AI_DRAFT_SECTION_JSON_SCHEMA, parseAiDraftResponse, parseAiDraftSectionResponse } from './ai-draft.schema';
import { DecideDraftSectionDto, EstimateDraftDto, GenerateDraftDto } from './ai-draft.dto';
import { estimateCostUsd, TokenUsage } from './ai-pricing';
import { renderRequirementsMatrix } from './ai-prompt';
import { callsToday } from './ai-quota';
import { AI_MODEL_CLIENT, AiModelClient, describeApiError } from './anthropic-client';
import { DraftContext, DraftContextService } from './draft-context.service';

export const DRAFT_NOT_CONFIGURED_MESSAGE = 'AI generisanje nacrta nije konfigurisano.';
export const DRAFT_REFUSED_MESSAGE = 'AI nije mogao da napiše nacrt.';
export const DRAFT_INTERRUPTED_BY_RESTART_MESSAGE = 'Generisanje je prekinuto restartom servera; završene sekcije su sačuvane.';
export const DRAFT_CANCELLED_MESSAGE = 'Generisanje je prekinuto na zahtev korisnika; završene sekcije su sačuvane.';

const ACTIVE_STATUSES: AiDraft['status'][] = ['QUEUED', 'RUNNING'];
const WRITTEN_GENERATIONS: AiDraftSection['generation'][] = ['DONE', 'TRUNCATED'];

export interface AiDraftSectionView {
  id: string;
  sectionId: string;
  key: string;
  title: string;
  position: number;
  /** Progress of the model call for this section. */
  generation: AiDraftSection['generation'];
  targetWords: number;
  errorMessage: string | null;
  /** The user's decision about the text (meaningful once `generation` is DONE or TRUNCATED). */
  status: AiDraftSection['status'];
  content: string;
  placeholders: number;
  wordCount: number;
  pages: number;
  draftVersionId: string | null;
  draftVersionNumber: number | null;
  previousVersionId: string | null;
  previousContent: string;
  /** The section was confirmed at draft time; accepting needs `replaceConfirmed: true`. */
  sectionConfirmedAtDraft: boolean;
  terminologyIssues: PatentTermMatch[];
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  estimatedCostUsd: number | null;
  durationMs: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  decidedAt: Date | null;
}

export interface AiDraftView {
  id: string;
  projectId: string;
  mode: AiDraft['mode'];
  model: string;
  effort: string;
  status: AiDraft['status'];
  /** The job is still queued or writing; the client polls. */
  active: boolean;
  cancelRequested: boolean;
  targetPages: number;
  imageCount: number;
  requestSummary: string;
  errorMessage: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  estimatedCostUsd: number | null;
  durationMs: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  notes: string[];
  progress: { total: number; written: number; current: string | null };
  sections: AiDraftSectionView[];
  totals: { words: number; pages: number; placeholders: number };
  disclaimer: string;
}

export interface AiDraftEstimateView extends DraftEstimate {
  model: string;
  effort: string;
  targetPages: number;
  contextChars: number;
  imageCount: number;
  skippedImages: string[];
  sections: { key: string; title: string; targetWords: number }[];
  /** Serbian hints for the user (large context, images not sent). */
  warnings: string[];
}

type DraftWithSections = AiDraft & { sections: AiDraftSection[] };

/** Why the section loop stopped before the end of the plan. */
type StopReason = 'CANCELLED' | 'FAILED' | 'REFUSED';

/**
 * „Generiši nacrt opisa" (step 10, FUZZ-142; background job since FUZZ-145). Reads
 * everything collected in steps 1–9 and asks the model for the text of every section —
 * one call per section, in a fixed order, each with the sections written so far as
 * context. Every finished section is written as a DraftVersion at once (sourceType
 * AGENT_INFERENCE, reference `ai-draft:<id>`), so nothing paid for is lost when a later
 * section fails. The HTTP request returns as soon as the job is queued; the client polls.
 * A confirmed section is never overwritten unless the user explicitly asked for it; a
 * section with a „[POTREBNA DOPUNA]" marker cannot be confirmed (DraftingService). Only
 * the user may start or cancel a draft or decide on its sections.
 */
@Injectable()
export class AiDraftService implements OnModuleInit {
  private readonly logger = new Logger(AiDraftService.name);
  /** One draft per project at a time (single API replica — see deploy notes): projectId → draftId. */
  private readonly inFlight = new Map<string, string>();
  /** Running jobs, so scripts and tests can await one instead of polling. */
  private readonly jobs = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly config: AiConfig,
    private readonly context: DraftContextService,
    private readonly drafting: DraftingService,
    @Inject(AI_MODEL_CLIENT) private readonly model: AiModelClient,
  ) {}

  /** A job that was running when the process stopped cannot be resumed: close it, keep its sections. */
  async onModuleInit() {
    const interrupted = await this.prisma.aiDraft.findMany({ where: { status: { in: ACTIVE_STATUSES } }, include: { sections: true } });
    for (const draft of interrupted) {
      await this.prisma.aiDraftSection.updateMany({ where: { aiDraftId: draft.id, generation: 'WRITING' }, data: { generation: 'FAILED', errorMessage: DRAFT_INTERRUPTED_BY_RESTART_MESSAGE, finishedAt: new Date() } });
      await this.prisma.aiDraftSection.updateMany({ where: { aiDraftId: draft.id, generation: 'PENDING' }, data: { generation: 'SKIPPED' } });
      const written = draft.sections.filter((s) => WRITTEN_GENERATIONS.includes(s.generation)).length;
      await this.prisma.aiDraft.update({
        where: { id: draft.id },
        data: { status: written > 0 ? 'PARTIAL' : 'FAILED', errorMessage: DRAFT_INTERRUPTED_BY_RESTART_MESSAGE, finishedAt: new Date() },
      });
      this.logger.warn(`AI draft ${draft.id} was interrupted by a restart; ${written} finished section(s) kept.`);
    }
  }

  async list(projectId: string): Promise<AiDraftView[]> {
    await this.projects.assertExists(projectId);
    const drafts = await this.prisma.aiDraft.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { sections: { orderBy: { position: 'asc' } } },
    });
    return Promise.all(drafts.map((d) => this.view(d)));
  }

  async get(draftId: string): Promise<AiDraftView> {
    return this.view(await this.load(draftId));
  }

  /** Effective target length: request → project setting → server default. */
  async targetPages(projectId: string, requested?: number): Promise<number> {
    if (requested) return requested;
    const project = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { targetDescriptionPages: true } });
    return project.targetDescriptionPages ?? this.config.draftTargetPages;
  }

  /** „Procena pre pokretanja": calls, duration, cost and context size for the given target length. Needs no key. */
  async estimate(projectId: string, dto: EstimateDraftDto): Promise<AiDraftEstimateView> {
    await this.projects.assertExists(projectId);
    const targetPages = await this.targetPages(projectId, dto.targetPages);
    await this.drafting.ensureDefaultSections(projectId);
    const context = await this.context.build(projectId, { maxChars: this.config.maxContextChars, maxImages: this.config.draftMaxImages });
    const requirements = await this.prisma.sourceRequirement.findMany({ where: { projectId } });
    const plan = planDraftSections(context.applicationSections, targetPages);
    const systemChars = DRAFT_SYSTEM_PROMPT.length + renderRequirementsMatrix(requirements).length + ZIS_BOTTLE_EXAMPLE.length;
    const estimate = estimateDraft({ model: this.config.model, systemChars, contextChars: context.totalChars, imageCount: context.images.length, plan });
    const warnings: string[] = [];
    if (estimate.largeContext) {
      warnings.push(
        `Kontekst je velik (oko ${estimate.inputTokensPerCall.toLocaleString('sr-Latn-RS')} ulaznih tokena po pozivu). Smanjite broj priloženih dokumenata ili slika u projektu da bi generisanje bilo brže i jeftinije.`,
      );
    }
    if (context.skippedImages.length) warnings.push(`Slike koje neće biti poslate modelu: ${context.skippedImages.join('; ')}.`);
    return {
      ...estimate,
      model: this.config.model,
      effort: this.config.draftEffort,
      targetPages,
      contextChars: context.totalChars,
      imageCount: context.images.length,
      skippedImages: context.skippedImages,
      sections: plan.map((p) => ({ key: p.key, title: p.title, targetWords: p.targetWords })),
      warnings,
    };
  }

  /**
   * Starts one generation in the background and returns the queued record at once. The
   * context is collected synchronously (a context that is too large is refused here, as 422);
   * the model calls run after the response. A second start while one runs returns 409
   * with the running draft's id.
   */
  async start(projectId: string, dto: GenerateDraftDto, actor: ActorType): Promise<AiDraftView> {
    if (actor !== 'USER') {
      throw new DomainError('AI_DRAFT_REQUIRES_USER', 'Samo korisnik može da pokrene AI generisanje nacrta opisa.', 'FORBIDDEN');
    }
    await this.projects.assertExists(projectId);
    if (!this.config.configured) {
      throw new DomainError('AI_NOT_CONFIGURED', DRAFT_NOT_CONFIGURED_MESSAGE, 'CONFLICT');
    }
    const running = this.inFlight.get(projectId);
    if (running) {
      throw new DomainError('AI_DRAFT_IN_PROGRESS', 'AI generisanje nacrta za ovaj projekat je već u toku. Sačekajte da se završi ili ga prekinite.', 'CONFLICT', { draftId: running });
    }
    const today = await callsToday(this.prisma, projectId);
    if (today >= this.config.maxCallsPerProjectPerDay) {
      throw new DomainError(
        'AI_DAILY_LIMIT_REACHED',
        `Dostignut je dnevni limit AI poziva za ovaj projekat (${this.config.maxCallsPerProjectPerDay}). Pokušajte sutra ili povećajte AI_MAX_CALLS_PER_PROJECT_PER_DAY.`,
        'CONFLICT',
      );
    }

    const targetPages = await this.targetPages(projectId, dto.targetPages);
    await this.drafting.ensureDefaultSections(projectId);
    const context = await this.context.build(projectId, { maxChars: this.config.maxContextChars, maxImages: this.config.draftMaxImages });
    const plan = planDraftSections(context.applicationSections, targetPages);
    const byKey = new Map(context.applicationSections.map((s) => [s.key, s]));
    const notes = context.skippedImages.length ? [`Slike koje nisu poslate modelu: ${context.skippedImages.join('; ')}.`] : [];

    const draft = await this.prisma.aiDraft.create({
      data: {
        project: { connect: { id: projectId } },
        mode: dto.mode,
        model: this.config.model,
        effort: this.config.draftEffort,
        status: 'QUEUED',
        targetPages,
        imageCount: context.images.length,
        requestSummary: context.summary,
        notesJson: JSON.stringify(notes),
        sections: {
          create: plan.map((p, i) => {
            const section = byKey.get(p.key)!;
            return {
              applicationSectionId: section.id,
              sectionKey: section.key,
              position: i,
              content: '',
              generation: 'PENDING' as const,
              targetWords: p.targetWords,
              sectionWasConfirmed: section.confirmed,
              previousVersionId: section.latest?.id ?? null,
            };
          }),
        },
      },
    });

    this.inFlight.set(projectId, draft.id);
    const job = this.run(draft.id, projectId, context, plan, dto).finally(() => {
      this.inFlight.delete(projectId);
      this.jobs.delete(draft.id);
    });
    this.jobs.set(draft.id, job);
    return this.view(await this.load(draft.id));
  }

  /** Resolves when the job finished (for the smoke script and tests); at once when it is not running here. */
  async awaitJob(draftId: string): Promise<AiDraftView> {
    await (this.jobs.get(draftId) ?? Promise.resolve());
    return this.get(draftId);
  }

  /** „Prekini": the job stops after the section it is writing; finished sections stay. */
  async cancel(draftId: string, actor: ActorType): Promise<AiDraftView> {
    if (actor !== 'USER') {
      throw new DomainError('AI_DRAFT_REQUIRES_USER', 'Samo korisnik može da prekine AI generisanje nacrta.', 'FORBIDDEN');
    }
    const draft = await this.load(draftId);
    if (!ACTIVE_STATUSES.includes(draft.status)) {
      throw new DomainError('AI_DRAFT_NOT_ACTIVE', 'Ovo generisanje nije u toku.', 'CONFLICT');
    }
    if (!draft.cancelRequested) {
      await this.prisma.aiDraft.update({ where: { id: draftId }, data: { cancelRequested: true } });
    }
    return this.view(await this.load(draftId));
  }

  /**
   * „Prihvati kao radnu verziju" / „Odbaci" for one section of a draft. Accepting a HELD
   * section (confirmed at draft time) writes the version now and needs `replaceConfirmed`.
   * Rejecting a written version restores the previous text as a new version when there was
   * one; the rejected version stays in the history (versions are never deleted).
   */
  async decide(draftId: string, sectionKey: string, decision: 'accept' | 'reject', dto: DecideDraftSectionDto, actor: ActorType): Promise<AiDraftView> {
    if (actor !== 'USER') {
      throw new DomainError('AI_DRAFT_REQUIRES_USER', 'Samo korisnik može da prihvati ili odbije AI nacrt sekcije.', 'FORBIDDEN');
    }
    const draft = await this.load(draftId);
    const section = orNotFound(draft.sections.find((s) => s.sectionKey === sectionKey), 'Sekcija AI nacrta');
    if (!WRITTEN_GENERATIONS.includes(section.generation)) {
      throw new DomainError('AI_DRAFT_SECTION_NOT_WRITTEN', 'Ova sekcija nacrta nije napisana, pa nema o čemu da se odluči.', 'CONFLICT');
    }
    if (section.status === 'ACCEPTED' || section.status === 'REJECTED') {
      throw new DomainError('AI_DRAFT_SECTION_ALREADY_DECIDED', 'O ovoj sekciji nacrta je već odlučeno.', 'CONFLICT');
    }
    const appSection = orNotFound(await this.prisma.applicationSection.findUnique({ where: { id: section.applicationSectionId } }), 'Sekcija opisa');

    if (decision === 'accept') {
      let draftVersionId = section.draftVersionId;
      if (section.status === 'HELD') {
        if (appSection.confirmed && dto.replaceConfirmed !== true) {
          throw new DomainError(
            'AI_DRAFT_SECTION_CONFIRMED',
            `Sekcija „${appSection.title}" je potvrđena. Zameniti radnom verzijom? Potvrdite izbor (replaceConfirmed) da bi AI tekst postao nova, nepotvrđena verzija.`,
            'CONFLICT',
          );
        }
        const version = await this.drafting.addVersion(
          appSection.id,
          { content: section.content, sourceType: 'AGENT_INFERENCE', sourceReference: `ai-draft:${draft.id}` },
          'AGENT',
          { explicitUserReplacement: dto.replaceConfirmed === true },
        );
        draftVersionId = version.id;
      }
      await this.prisma.aiDraftSection.update({ where: { id: section.id }, data: { status: 'ACCEPTED', draftVersionId, decidedAt: new Date() } });
      await this.recordDecision(draft, `Prihvaćen AI nacrt sekcije „${appSection.title}" kao radna verzija`, `draft-version/${draftVersionId}`);
    } else {
      let restored: string | null = null;
      if (section.draftVersionId && section.previousVersionId) {
        const previous = await this.prisma.draftVersion.findUnique({ where: { id: section.previousVersionId } });
        const latest = await this.prisma.draftVersion.findFirst({ where: { applicationSectionId: appSection.id }, orderBy: { versionNumber: 'desc' } });
        // Restore only if the AI version is still the latest text; a later user edit stays.
        if (previous?.content.trim() && latest?.id === section.draftVersionId) {
          const version = await this.drafting.addVersion(
            appSection.id,
            { content: previous.content, sourceType: previous.sourceType, sourceReference: `ai-draft-rejected:${draft.id}` },
            'USER',
          );
          restored = `draft-version/${version.id}`;
        }
      }
      await this.prisma.aiDraftSection.update({ where: { id: section.id }, data: { status: 'REJECTED', decidedAt: new Date() } });
      await this.recordDecision(draft, `Odbijen AI nacrt sekcije „${appSection.title}"`, restored);
    }
    return this.view(await this.load(draftId));
  }

  // --- the background job -------------------------------------------------------------

  /** The section loop. Never throws: every outcome ends in a stored status. */
  private async run(draftId: string, projectId: string, context: DraftContext, plan: PlannedSection[], dto: GenerateDraftDto): Promise<void> {
    const started = Date.now();
    let stop: StopReason | null = null;
    let stopMessage: string | null = null;
    try {
      await this.prisma.aiDraft.update({ where: { id: draftId }, data: { status: 'RUNNING', startedAt: new Date() } });
      const requirements = await this.prisma.sourceRequirement.findMany({ where: { projectId } });
      const system: Anthropic.Beta.BetaTextBlockParam[] = [
        { type: 'text', text: DRAFT_SYSTEM_PROMPT },
        { type: 'text', text: renderRequirementsMatrix(requirements) },
        { type: 'text', text: ZIS_BOTTLE_EXAMPLE, cache_control: { type: 'ephemeral' } },
      ];
      const byKey = new Map(context.applicationSections.map((s) => [s.key, s]));
      const { targetPages } = await this.prisma.aiDraft.findUniqueOrThrow({ where: { id: draftId }, select: { targetPages: true } });
      const written: { key: string; title: string; content: string }[] = [];

      for (const [index, planned] of plan.entries()) {
        const fresh = await this.prisma.aiDraft.findUnique({ where: { id: draftId }, select: { cancelRequested: true } });
        if (!fresh) return; // the project (and the draft with it) was deleted meanwhile
        if (fresh.cancelRequested) {
          stop = 'CANCELLED';
          stopMessage = DRAFT_CANCELLED_MESSAGE;
          break;
        }
        const row = await this.prisma.aiDraftSection.findFirstOrThrow({ where: { aiDraftId: draftId, sectionKey: planned.key } });
        const section = byKey.get(planned.key)!;
        await this.prisma.aiDraftSection.update({ where: { id: row.id }, data: { generation: 'WRITING', startedAt: new Date() } });
        const sectionStarted = Date.now();

        const task = renderSectionTask({
          mode: dto.mode,
          targetPages,
          section: { key: planned.key, title: planned.title, targetWords: planned.targetWords },
          written,
          remaining: plan.slice(index + 1).map((p) => ({ key: p.key, title: p.title })),
          imageCount: context.images.length,
        });
        const { userText, userContent } = buildUserMessage(context, task);

        let message: Anthropic.Beta.BetaMessage;
        try {
          message = await this.model.complete({
            model: this.config.model,
            system,
            userText,
            userContent,
            schema: AI_DRAFT_SECTION_JSON_SCHEMA as unknown as Record<string, unknown>,
            maxTokens: planned.maxTokens,
            effort: this.config.draftEffort,
          });
        } catch (error) {
          const reason = describeApiError(error);
          this.logger.warn(`AI draft ${draftId}, section ${planned.key} failed: ${reason}`);
          await this.finishSection(draftId, row.id, { generation: 'FAILED', errorMessage: reason, durationMs: Date.now() - sectionStarted }, started);
          stop = 'FAILED';
          stopMessage = `Poziv za sekciju „${planned.title}" nije uspeo: ${reason}`;
          break;
        }

        const usage: TokenUsage = {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
          cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
          cacheCreationTokens: message.usage.cache_creation_input_tokens ?? 0,
        };
        const measured = { ...usage, estimatedCostUsd: estimateCostUsd(message.model, usage), durationMs: Date.now() - sectionStarted };
        await this.prisma.aiDraft.update({ where: { id: draftId }, data: { model: message.model } });

        if (message.stop_reason === 'refusal') {
          const category = message.stop_details?.category ?? null;
          const reason = `${DRAFT_REFUSED_MESSAGE}${category ? ` (kategorija: ${category})` : ''}`;
          await this.finishSection(draftId, row.id, { ...measured, generation: 'FAILED', errorMessage: reason }, started);
          stop = 'REFUSED';
          stopMessage = `${reason} Sekcija „${planned.title}" nije napisana.`;
          break;
        }

        const text = message.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('');
        const truncated = message.stop_reason === 'max_tokens';
        let content: string;
        let notes: string[] = [];
        if (truncated) {
          const salvaged = salvageTruncatedContent(text);
          if (!salvaged) {
            await this.finishSection(draftId, row.id, { ...measured, generation: 'FAILED', errorMessage: 'Odgovor modela je prekinut (max_tokens) pre nego što je stigao tekst sekcije.' }, started);
            continue;
          }
          content = `${salvaged}\n\n${TRUNCATED_MARKER}`;
          notes = [`Sekcija „${planned.title}" je prekinuta na granici izlaznih tokena (${planned.maxTokens.toLocaleString('sr-Latn-RS')}); sačuvan je tekst koji je stigao.`];
        } else {
          const parsed = parseAiDraftSectionResponse(text);
          if (!parsed.ok) {
            await this.finishSection(draftId, row.id, { ...measured, generation: 'FAILED', errorMessage: parsed.error }, started);
            stop = 'FAILED';
            stopMessage = `Odgovor za sekciju „${planned.title}" nije upotrebljiv: ${parsed.error}`;
            break;
          }
          content = parsed.response.content.trim();
          notes = parsed.response.notes.map((n) => `${planned.title}: ${n}`);
          if (!content) {
            await this.finishSection(draftId, row.id, { ...measured, generation: 'FAILED', errorMessage: 'Model je vratio praznu sekciju; verzija nije upisana.' }, started);
            continue;
          }
        }

        // Paid for → stored at once, before the next call starts.
        let draftVersionId: string | null = null;
        let status: AiDraftSection['status'] = 'PROPOSED';
        if (section.confirmed && !dto.replaceConfirmed) {
          status = 'HELD';
        } else {
          const version = await this.drafting.addVersion(
            section.id,
            { content, sourceType: 'AGENT_INFERENCE', sourceReference: `ai-draft:${draftId}` },
            'AGENT',
            { explicitUserReplacement: section.confirmed && dto.replaceConfirmed },
          );
          draftVersionId = version.id;
        }
        await this.finishSection(
          draftId,
          row.id,
          {
            ...measured,
            generation: truncated ? 'TRUNCATED' : 'DONE',
            content,
            placeholders: countPlaceholders(content),
            wordCount: countWords(content),
            status,
            draftVersionId,
          },
          started,
          notes,
        );
        written.push({ key: planned.key, title: planned.title, content });
      }
    } catch (error) {
      this.logger.error(`AI draft ${draftId} crashed: ${(error as Error).message}`);
      stop = 'FAILED';
      stopMessage = `Neočekivana greška: ${(error as Error).message}`;
    }
    await this.finishDraft(draftId, stop, stopMessage, started);
  }

  private async finishSection(
    draftId: string,
    rowId: string,
    data: Partial<TokenUsage> & { estimatedCostUsd?: number | null; durationMs: number } & Omit<Prisma.AiDraftSectionUpdateInput, 'draft'>,
    jobStarted: number,
    notes: string[] = [],
  ) {
    await this.prisma.aiDraftSection.update({ where: { id: rowId }, data: { ...data, finishedAt: new Date() } });
    const draft = await this.prisma.aiDraft.findUniqueOrThrow({ where: { id: draftId }, select: { estimatedCostUsd: true, notesJson: true } });
    const cost = data.estimatedCostUsd ?? null;
    await this.prisma.aiDraft.update({
      where: { id: draftId },
      data: {
        inputTokens: { increment: data.inputTokens ?? 0 },
        outputTokens: { increment: data.outputTokens ?? 0 },
        cacheReadTokens: { increment: data.cacheReadTokens ?? 0 },
        cacheCreationTokens: { increment: data.cacheCreationTokens ?? 0 },
        estimatedCostUsd: cost === null ? draft.estimatedCostUsd : Math.round(((draft.estimatedCostUsd ?? 0) + cost) * 1_000_000) / 1_000_000,
        durationMs: Date.now() - jobStarted,
        notesJson: notes.length ? JSON.stringify([...parseNotes(draft.notesJson), ...notes]) : undefined,
      },
    });
  }

  /** Closes the job: skips what was not started and derives the final status from what was written. */
  private async finishDraft(draftId: string, stop: StopReason | null, stopMessage: string | null, started: number) {
    try {
      const sections = await this.prisma.aiDraftSection.findMany({ where: { aiDraftId: draftId } });
      if (!sections.length && !(await this.prisma.aiDraft.findUnique({ where: { id: draftId }, select: { id: true } }))) return;
      await this.prisma.aiDraftSection.updateMany({ where: { aiDraftId: draftId, generation: { in: ['PENDING', 'WRITING'] } }, data: { generation: 'SKIPPED' } });
      const written = sections.filter((s) => WRITTEN_GENERATIONS.includes(s.generation));
      const incomplete = sections.filter((s) => s.generation === 'TRUNCATED' || s.generation === 'FAILED' || s.generation === 'PENDING' || s.generation === 'WRITING');
      let status: AiDraft['status'];
      let errorMessage = stopMessage;
      if (stop === 'REFUSED') status = written.length ? 'PARTIAL' : 'REFUSED';
      else if (stop) status = written.length ? 'PARTIAL' : 'FAILED';
      else if (incomplete.length === 0) status = 'DONE';
      else {
        status = written.length ? 'PARTIAL' : 'FAILED';
        errorMessage = `Nacrt je delimičan: ${incomplete.map((s) => `${s.sectionKey} (${s.generation === 'TRUNCATED' ? 'prekinut tekst' : (s.errorMessage ?? 'nije napisana')})`).join('; ')}.`;
      }
      await this.prisma.aiDraft.update({ where: { id: draftId }, data: { status, errorMessage, durationMs: Date.now() - started, finishedAt: new Date() } });
    } catch (error) {
      this.logger.error(`AI draft ${draftId} could not be closed: ${(error as Error).message}`);
    }
  }

  // --- views ---------------------------------------------------------------------------

  private async load(draftId: string): Promise<DraftWithSections> {
    return orNotFound(await this.prisma.aiDraft.findUnique({ where: { id: draftId }, include: { sections: { orderBy: { position: 'asc' } } } }), 'AI nacrt');
  }

  private async view(draft: DraftWithSections): Promise<AiDraftView> {
    const sectionIds = draft.sections.map((s) => s.applicationSectionId);
    const versionIds = draft.sections.flatMap((s) => [s.draftVersionId, s.previousVersionId]).filter((id): id is string => Boolean(id));
    const [appSections, versions] = await Promise.all([
      this.prisma.applicationSection.findMany({ where: { id: { in: sectionIds } } }),
      this.prisma.draftVersion.findMany({ where: { id: { in: versionIds } } }),
    ]);
    const sectionById = new Map(appSections.map((s) => [s.id, s]));
    const versionById = new Map(versions.map((v) => [v.id, v]));
    const sections: AiDraftSectionView[] = draft.sections.map((s) => {
      const app = sectionById.get(s.applicationSectionId);
      const writtenVersion = s.draftVersionId ? versionById.get(s.draftVersionId) : undefined;
      const previous = s.previousVersionId ? versionById.get(s.previousVersionId) : undefined;
      return {
        id: s.id,
        sectionId: s.applicationSectionId,
        key: s.sectionKey,
        title: app?.title ?? s.sectionKey,
        position: s.position,
        generation: s.generation,
        targetWords: s.targetWords,
        errorMessage: s.errorMessage,
        status: s.status,
        content: s.content,
        placeholders: s.placeholders,
        wordCount: s.wordCount,
        pages: estimatePages(s.wordCount),
        draftVersionId: s.draftVersionId,
        draftVersionNumber: writtenVersion?.versionNumber ?? null,
        previousVersionId: s.previousVersionId,
        previousContent: previous?.content ?? '',
        sectionConfirmedAtDraft: s.sectionWasConfirmed,
        terminologyIssues: findPatentTerms(s.content),
        inputTokens: s.inputTokens,
        outputTokens: s.outputTokens,
        cacheReadTokens: s.cacheReadTokens,
        cacheCreationTokens: s.cacheCreationTokens,
        estimatedCostUsd: s.estimatedCostUsd,
        durationMs: s.durationMs,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        decidedAt: s.decidedAt,
      };
    });
    const words = sections.reduce((n, s) => n + s.wordCount, 0);
    const writtenCount = sections.filter((s) => WRITTEN_GENERATIONS.includes(s.generation)).length;
    const current = sections.find((s) => s.generation === 'WRITING')?.key ?? null;
    return {
      id: draft.id,
      projectId: draft.projectId,
      mode: draft.mode,
      model: draft.model,
      effort: draft.effort,
      status: draft.status,
      active: ACTIVE_STATUSES.includes(draft.status),
      cancelRequested: draft.cancelRequested,
      targetPages: draft.targetPages,
      imageCount: draft.imageCount,
      requestSummary: draft.requestSummary,
      errorMessage: draft.errorMessage,
      inputTokens: draft.inputTokens,
      outputTokens: draft.outputTokens,
      cacheReadTokens: draft.cacheReadTokens,
      cacheCreationTokens: draft.cacheCreationTokens,
      estimatedCostUsd: draft.estimatedCostUsd,
      durationMs: draft.durationMs,
      startedAt: draft.startedAt,
      finishedAt: draft.finishedAt,
      createdAt: draft.createdAt,
      notes: draftNotes(draft),
      progress: { total: sections.length, written: writtenCount, current },
      sections,
      totals: { words, pages: estimatePages(words), placeholders: sections.reduce((n, s) => n + s.placeholders, 0) },
      disclaimer: AI_DRAFT_DISCLAIMER,
    };
  }

  private async recordDecision(draft: AiDraft, title: string, reference: string | null) {
    await this.prisma.decision.create({
      data: {
        projectId: draft.projectId,
        stepKey: 'DESCRIPTION_DRAFTING',
        title,
        rationale: reference ? `Upisano: ${reference}.` : '',
        decidedBy: 'USER',
        sourceType: 'USER',
        sourceReference: `ai-draft:${draft.id}`,
      },
    });
  }
}

/** Notes of a draft: the per-section notes, or — for a draft made before FUZZ-145 — those of its single response. */
function draftNotes(draft: AiDraft): string[] {
  const notes = parseNotes(draft.notesJson);
  if (notes.length || !draft.responseJson) return notes;
  const legacy = parseAiDraftResponse(draft.responseJson);
  return legacy.ok ? legacy.response.notes : [];
}

function parseNotes(json: string): string[] {
  try {
    const value: unknown = JSON.parse(json || '[]');
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * The text of `content` from a JSON answer that was cut off by `max_tokens`. The JSON is
 * incomplete, so the string is taken up to the cut and unescaped as far as it goes;
 * returns '' when nothing usable arrived.
 */
export function salvageTruncatedContent(text: string): string {
  const whole = parseAiDraftSectionResponse(text);
  if (whole.ok) return whole.response.content.trim();
  const match = /"content"\s*:\s*"((?:[^"\\]|\\.)*)/u.exec(text);
  if (!match) return '';
  let raw = match[1];
  if (/(?:^|[^\\])(?:\\\\)*\\$/u.test(raw)) raw = raw.slice(0, -1); // a lone trailing backslash from a cut escape
  raw = raw.replace(/\\u[0-9a-fA-F]{0,3}$/u, ''); // a cut \uXXXX escape
  try {
    return (JSON.parse(`"${raw}"`) as string).trim();
  } catch {
    return '';
  }
}

/**
 * Text blocks of the context, then each image preceded by its label — this part is the
 * same in every call of a draft and carries the second cache breakpoint — then the task.
 */
function buildUserMessage(context: DraftContext, task: string): { userText: string; userContent: Anthropic.Beta.BetaContentBlockParam[] } {
  const body = context.sections.map((s) => `## ${s.heading}\n${s.body || '(nema podataka)'}`).join('\n\n');
  const head = '# Stanje projekta (koraci 1–9)';
  const userContent: Anthropic.Beta.BetaContentBlockParam[] = [{ type: 'text', text: `${head}\n\n${body}` }];
  for (const image of context.images) {
    userContent.push({ type: 'text', text: image.label });
    userContent.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } });
  }
  const last = userContent[userContent.length - 1] as Anthropic.Beta.BetaTextBlockParam | Anthropic.Beta.BetaImageBlockParam;
  last.cache_control = { type: 'ephemeral' };
  userContent.push({ type: 'text', text: task });
  const imageLabels = context.images.map((i) => i.label).join('\n');
  return { userText: `${head}\n\n${body}\n\n${imageLabels}\n\n${task}`, userContent };
}
