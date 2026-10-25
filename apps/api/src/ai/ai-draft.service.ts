import Anthropic from '@anthropic-ai/sdk';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ActorType, AiDraft, AiDraftSection, Prisma } from '@prisma/client';
import { orNotFound } from '../common/not-found';
import { DomainError } from '../domain/domain-error';
import { countPlaceholders } from '../domain/draft-rules';
import { countWords, estimatePages } from '../domain/draft-length';
import { findPatentTerms, PatentTermMatch } from '../domain/patent-terms';
import { DraftingService } from '../drafting/drafting.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { AiConfig } from './ai-config';
import { AI_DRAFT_DISCLAIMER, DRAFT_SYSTEM_PROMPT, renderDraftTask, ZIS_BOTTLE_EXAMPLE } from './ai-draft-prompt';
import { AI_DRAFT_JSON_SCHEMA, AiDraftResponse, parseAiDraftResponse } from './ai-draft.schema';
import { DecideDraftSectionDto, GenerateDraftDto } from './ai-draft.dto';
import { estimateCostUsd } from './ai-pricing';
import { renderRequirementsMatrix } from './ai-prompt';
import { callsToday } from './ai-quota';
import { AI_MODEL_CLIENT, AiModelClient, describeApiError } from './anthropic-client';
import { DraftContext, DraftContextService } from './draft-context.service';

/** Five pages of Serbian text plus JSON overhead fit comfortably; a longer target is still cut here. */
const MAX_OUTPUT_TOKENS = 24_000;

export const DRAFT_NOT_CONFIGURED_MESSAGE = 'AI generisanje nacrta nije konfigurisano.';
export const DRAFT_REFUSED_MESSAGE = 'AI nije mogao da napiše nacrt.';

export interface AiDraftSectionView {
  id: string;
  sectionId: string;
  key: string;
  title: string;
  position: number;
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
  decidedAt: Date | null;
}

export interface AiDraftView {
  id: string;
  projectId: string;
  mode: AiDraft['mode'];
  model: string;
  status: AiDraft['status'];
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
  createdAt: Date;
  notes: string[];
  sections: AiDraftSectionView[];
  totals: { words: number; pages: number; placeholders: number };
  disclaimer: string;
}

type DraftWithSections = AiDraft & { sections: AiDraftSection[] };

/**
 * „Generiši nacrt opisa" (step 10, FUZZ-142). Reads everything collected in steps 1–9,
 * asks the model for the text of every section and writes each text as a new DraftVersion
 * (sourceType AGENT_INFERENCE, reference `ai-draft:<id>`). A confirmed section is never
 * overwritten unless the user explicitly asked for it; a section with a
 * „[POTREBNA DOPUNA]" marker cannot be confirmed (DraftingService). Only the user may
 * start a draft or decide on its sections.
 */
@Injectable()
export class AiDraftService {
  private readonly logger = new Logger(AiDraftService.name);
  /** One draft per project at a time (single API replica — see deploy notes). */
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly config: AiConfig,
    private readonly context: DraftContextService,
    private readonly drafting: DraftingService,
    @Inject(AI_MODEL_CLIENT) private readonly model: AiModelClient,
  ) {}

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

  /** Runs one generation. Returns the stored record, also when the model refused or failed. */
  async generate(projectId: string, dto: GenerateDraftDto, actor: ActorType): Promise<AiDraftView> {
    if (actor !== 'USER') {
      throw new DomainError('AI_DRAFT_REQUIRES_USER', 'Samo korisnik može da pokrene AI generisanje nacrta opisa.', 'FORBIDDEN');
    }
    await this.projects.assertExists(projectId);
    if (!this.config.configured) {
      throw new DomainError('AI_NOT_CONFIGURED', DRAFT_NOT_CONFIGURED_MESSAGE, 'CONFLICT');
    }
    if (this.inFlight.has(projectId)) {
      throw new DomainError('AI_DRAFT_IN_PROGRESS', 'AI generisanje nacrta za ovaj projekat je već u toku. Sačekajte da se završi.', 'CONFLICT');
    }
    const today = await callsToday(this.prisma, projectId);
    if (today >= this.config.maxCallsPerProjectPerDay) {
      throw new DomainError(
        'AI_DAILY_LIMIT_REACHED',
        `Dostignut je dnevni limit AI poziva za ovaj projekat (${this.config.maxCallsPerProjectPerDay}). Pokušajte sutra ili povećajte AI_MAX_CALLS_PER_PROJECT_PER_DAY.`,
        'CONFLICT',
      );
    }

    this.inFlight.add(projectId);
    const started = Date.now();
    try {
      const targetPages = await this.targetPages(projectId, dto.targetPages);
      await this.drafting.ensureDefaultSections(projectId);
      const context = await this.context.build(projectId, { maxChars: this.config.maxContextChars, maxImages: this.config.draftMaxImages });
      const requirements = await this.prisma.sourceRequirement.findMany({ where: { projectId } });
      const system: Anthropic.Beta.BetaTextBlockParam[] = [
        { type: 'text', text: DRAFT_SYSTEM_PROMPT },
        { type: 'text', text: renderRequirementsMatrix(requirements) },
        // Last stable block carries the cache breakpoint; everything after it varies per call.
        { type: 'text', text: ZIS_BOTTLE_EXAMPLE, cache_control: { type: 'ephemeral' } },
      ];
      const task = renderDraftTask({
        mode: dto.mode,
        targetPages,
        sectionKeys: context.applicationSections.map((s) => ({ key: s.key, title: s.title })),
        imageCount: context.images.length,
      });
      const { userText, userContent } = buildUserMessage(context, task);
      const base = { mode: dto.mode, targetPages, imageCount: context.images.length, requestSummary: summarize(context) };

      let message: Anthropic.Beta.BetaMessage;
      try {
        message = await this.model.complete({
          model: this.config.model,
          system,
          userText,
          userContent,
          schema: AI_DRAFT_JSON_SCHEMA as unknown as Record<string, unknown>,
          maxTokens: MAX_OUTPUT_TOKENS,
        });
      } catch (error) {
        this.logger.warn(`AI draft failed for ${projectId}: ${describeApiError(error)}`);
        return this.store(projectId, { ...base, model: this.config.model, status: 'ERROR', errorMessage: describeApiError(error), durationMs: Date.now() - started });
      }

      const usage = {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cacheReadTokens: message.usage.cache_read_input_tokens ?? 0,
        cacheCreationTokens: message.usage.cache_creation_input_tokens ?? 0,
      };
      const measured = { ...base, model: message.model, ...usage, estimatedCostUsd: estimateCostUsd(message.model, usage), durationMs: Date.now() - started };

      if (message.stop_reason === 'refusal') {
        const category = message.stop_details?.category ?? null;
        return this.store(projectId, { ...measured, status: 'REFUSED', errorMessage: `${DRAFT_REFUSED_MESSAGE}${category ? ` (kategorija: ${category})` : ''}` });
      }
      const text = message.content
        .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      if (message.stop_reason === 'max_tokens') {
        return this.store(projectId, {
          ...measured,
          status: 'ERROR',
          responseJson: text,
          errorMessage: 'Odgovor modela je prekinut (dostignut max_tokens); nacrt nije sačuvan. Smanjite ciljnu dužinu i pokušajte ponovo.',
        });
      }
      const parsed = parseAiDraftResponse(text);
      if (!parsed.ok) {
        return this.store(projectId, { ...measured, status: 'ERROR', responseJson: text, errorMessage: parsed.error });
      }

      return this.storeSections(projectId, { ...measured, status: 'OK', responseJson: JSON.stringify(parsed.response) }, parsed.response, context, dto.replaceConfirmed);
    } finally {
      this.inFlight.delete(projectId);
    }
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
      await this.recordDecision(draft, appSection.title, `Prihvaćen AI nacrt sekcije „${appSection.title}" kao radna verzija`, `draft-version/${draftVersionId}`);
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
      await this.recordDecision(draft, appSection.title, `Odbijen AI nacrt sekcije „${appSection.title}"`, restored);
    }
    return this.view(await this.load(draftId));
  }

  private async storeSections(projectId: string, data: StoreData, response: AiDraftResponse, context: DraftContext, replaceConfirmed: boolean): Promise<AiDraftView> {
    const draft = await this.prisma.aiDraft.create({ data: { ...data, project: { connect: { id: projectId } } } });
    const notes = [...response.notes];
    const byKey = new Map(context.applicationSections.map((s) => [s.key, s]));
    const returned = new Set<string>();
    let position = 0;
    for (const item of response.sections) {
      const section = byKey.get(item.key.trim().toUpperCase());
      if (!section) {
        notes.push(`Model je vratio nepoznatu sekciju „${item.key}"; tekst nije sačuvan.`);
        continue;
      }
      if (returned.has(section.key)) continue;
      returned.add(section.key);
      const content = item.content.trim();
      if (!content) {
        notes.push(`Model je vratio praznu sekciju „${section.title}"; verzija nije upisana.`);
        continue;
      }
      let draftVersionId: string | null = null;
      let status: AiDraftSection['status'] = 'PROPOSED';
      if (section.confirmed && !replaceConfirmed) {
        status = 'HELD';
      } else {
        const version = await this.drafting.addVersion(
          section.id,
          { content, sourceType: 'AGENT_INFERENCE', sourceReference: `ai-draft:${draft.id}` },
          'AGENT',
          { explicitUserReplacement: section.confirmed && replaceConfirmed },
        );
        draftVersionId = version.id;
      }
      await this.prisma.aiDraftSection.create({
        data: {
          aiDraftId: draft.id,
          applicationSectionId: section.id,
          sectionKey: section.key,
          position: position++,
          content,
          placeholders: countPlaceholders(content),
          wordCount: countWords(content),
          status,
          sectionWasConfirmed: section.confirmed,
          draftVersionId,
          previousVersionId: section.latest?.id ?? null,
        },
      });
    }
    for (const s of context.applicationSections) {
      if (!returned.has(s.key)) notes.push(`Model nije vratio sekciju „${s.title}" (${s.key}).`);
    }
    if (context.skippedImages.length) notes.push(`Slike koje nisu poslate modelu: ${context.skippedImages.join('; ')}.`);
    if (notes.length !== response.notes.length) {
      await this.prisma.aiDraft.update({ where: { id: draft.id }, data: { responseJson: JSON.stringify({ ...response, notes }) } });
    }
    return this.view(await this.load(draft.id));
  }

  private async store(projectId: string, data: StoreData): Promise<AiDraftView> {
    const draft = await this.prisma.aiDraft.create({ data: { ...data, project: { connect: { id: projectId } } }, include: { sections: true } });
    return this.view(draft);
  }

  private async load(draftId: string): Promise<DraftWithSections> {
    return orNotFound(await this.prisma.aiDraft.findUnique({ where: { id: draftId }, include: { sections: { orderBy: { position: 'asc' } } } }), 'AI nacrt');
  }

  private async view(draft: DraftWithSections): Promise<AiDraftView> {
    const response = draft.status === 'OK' ? parseAiDraftResponse(draft.responseJson) : null;
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
      const written = s.draftVersionId ? versionById.get(s.draftVersionId) : undefined;
      const previous = s.previousVersionId ? versionById.get(s.previousVersionId) : undefined;
      return {
        id: s.id,
        sectionId: s.applicationSectionId,
        key: s.sectionKey,
        title: app?.title ?? s.sectionKey,
        position: s.position,
        status: s.status,
        content: s.content,
        placeholders: s.placeholders,
        wordCount: s.wordCount,
        pages: estimatePages(s.wordCount),
        draftVersionId: s.draftVersionId,
        draftVersionNumber: written?.versionNumber ?? null,
        previousVersionId: s.previousVersionId,
        previousContent: previous?.content ?? '',
        sectionConfirmedAtDraft: s.sectionWasConfirmed,
        terminologyIssues: findPatentTerms(s.content),
        decidedAt: s.decidedAt,
      };
    });
    const words = sections.reduce((n, s) => n + s.wordCount, 0);
    return {
      id: draft.id,
      projectId: draft.projectId,
      mode: draft.mode,
      model: draft.model,
      status: draft.status,
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
      createdAt: draft.createdAt,
      notes: response?.ok ? response.response.notes : [],
      sections,
      totals: { words, pages: estimatePages(words), placeholders: sections.reduce((n, s) => n + s.placeholders, 0) },
      disclaimer: AI_DRAFT_DISCLAIMER,
    };
  }

  private async recordDecision(draft: AiDraft, _sectionTitle: string, title: string, reference: string | null) {
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

type StoreData = Omit<Prisma.AiDraftCreateInput, 'project' | 'sections'>;

/** Text blocks of the context, then each image preceded by its label, then the task. */
function buildUserMessage(context: DraftContext, task: string): { userText: string; userContent: Anthropic.Beta.BetaContentBlockParam[] } {
  const body = context.sections.map((s) => `## ${s.heading}\n${s.body || '(nema podataka)'}`).join('\n\n');
  const head = '# Stanje projekta (koraci 1–9)';
  const userContent: Anthropic.Beta.BetaContentBlockParam[] = [{ type: 'text', text: `${head}\n\n${body}` }];
  for (const image of context.images) {
    userContent.push({ type: 'text', text: image.label });
    userContent.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } });
  }
  userContent.push({ type: 'text', text: task });
  const imageLabels = context.images.map((i) => i.label).join('\n');
  return { userText: `${head}\n\n${body}\n\n${imageLabels}\n\n${task}`, userContent };
}

function summarize(context: DraftContext): string {
  return context.summary;
}
