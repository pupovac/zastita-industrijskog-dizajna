import Anthropic from '@anthropic-ai/sdk';
import { INestApplication } from '@nestjs/common';
import mammoth from 'mammoth';
import request from 'supertest';
import { App } from 'supertest/types';
import { AiConfig } from '../src/ai/ai-config';
import { AI_DRAFT_DISCLAIMER, TRUNCATED_MARKER } from '../src/ai/ai-draft-prompt';
import { AiDraftService, DRAFT_CANCELLED_MESSAGE, DRAFT_INTERRUPTED_BY_RESTART_MESSAGE, salvageTruncatedContent } from '../src/ai/ai-draft.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createAiTestApp, fakeMessage, Message, MockModelClient } from './ai-mock';

const asUser = { 'X-Actor-Type': 'USER' };
const asAgent = { 'X-Actor-Type': 'AGENT' };

/** A valid 1×1 PNG; the upload checks the signature, the draft sends it to the model as an image block. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><text>v1</text></svg>');

/** Call order of the job (domain/draft-plan.ts). */
const ORDER = ['TITLE', 'CHARACTERISTIC_FEATURES', 'DESCRIPTION', 'PURPOSE', 'REPRESENTATION_LIST', 'ATTACHMENT_LIST'];

const SECTION_TEXT: Record<string, string> = {
  TITLE: 'Fasadni panel',
  DESCRIPTION:
    '## Oblik u celini\n\nPrijavljeni proizvod je fasadni panel pravougaonog oblika (1) sa stepenasto profilisanim ivicama (2).\n\n## Prednja površina\n\nNa prikazu 1.1 vidi se prednja površina (3) sa reljefnom teksturom [POTREBNA DOPUNA: boja završnog sloja].',
  CHARACTERISTIC_FEATURES: '- stepenasti profil ivica (2)\n- reljefna tekstura prednje površine (3)',
  PURPOSE: 'Panel je namenjen oblaganju fasada.',
  REPRESENTATION_LIST: 'Prikaz 1.1 — perspektivni prikaz panela.',
  ATTACHMENT_LIST: '- Prikaz 1.1 (render.png)',
};

/** supertest does not buffer binary bodies by default. */
const binary = (res: request.Response, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c: Buffer) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

const sectionAnswer = (content: string, notes: string[] = [], usage?: Parameters<typeof fakeMessage>[0]['usage']): Message =>
  fakeMessage({ text: JSON.stringify({ content, placeholders: 0, notes }), usage });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('AI draft of the description (e2e, mocked SDK, background job)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let service: AiDraftService;
  const mock = new MockModelClient();
  const http = () => request(app.getHttpServer());

  async function createProject(name: string): Promise<string> {
    const res = await http().post('/api/projects').set(asUser).send({ name, productName: 'EPS fasadni panel' }).expect(201);
    return res.body.id;
  }

  async function sectionsOf(projectId: string): Promise<{ id: string; key: string; confirmed: boolean; versions: { id: string; versionNumber: number; content: string; createdByActor: string; sourceType: string; sourceReference: string | null; placeholders: number }[] }[]> {
    const res = await http().get(`/api/projects/${projectId}/application-sections`).expect(200);
    return res.body;
  }

  /** Queues the six default answers in call order. */
  function answerAll(suffix = '', usage?: Parameters<typeof fakeMessage>[0]['usage']) {
    for (const key of ORDER) mock.answer(sectionAnswer(`${SECTION_TEXT[key]}${suffix}`, key === 'DESCRIPTION' ? ['Boja završnog sloja nije navedena u odgovorima.'] : [], usage));
  }

  /** Starts a draft (202) and waits for the job to finish, as a script would. */
  async function runDraft(projectId: string, body: Record<string, unknown> = {}) {
    const started = await http().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send(body).expect(202);
    expect(started.body.active).toBe(true);
    return service.awaitJob(started.body.id);
  }

  /** Polls `GET /ai-drafts/:id` as the web client does until the predicate holds. */
  async function pollUntil(draftId: string, predicate: (draft: Record<string, any>) => boolean) {
    for (let i = 0; i < 200; i++) {
      const res = await http().get(`/api/ai-drafts/${draftId}`).expect(200);
      if (predicate(res.body)) return res.body;
      await sleep(10);
    }
    throw new Error(`draft ${draftId} did not reach the expected state`);
  }

  beforeAll(async () => {
    app = await createAiTestApp(new AiConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_MAX_CALLS_PER_PROJECT_PER_DAY: '50', AI_DRAFT_TARGET_PAGES: '7' }), mock);
    prisma = app.get(PrismaService);
    service = app.get(AiDraftService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mock.requests = [];
    mock.queue = [];
  });

  it('reports the default target length and the draft effort without the key', async () => {
    const status = await http().get('/api/ai/status').expect(200);
    expect(status.body).toMatchObject({ configured: true, draftTargetPages: 7, draftEffort: 'medium' });
    expect(JSON.stringify(status.body)).not.toContain('sk-test');
  });

  it('lets only the user start a draft and refuses an unknown project', async () => {
    const projectId = await createProject('Samo korisnik');
    const agent = await http().post(`/api/projects/${projectId}/ai-drafts`).set(asAgent).send({ mode: 'GENERATE' }).expect(403);
    expect(agent.body.code).toBe('AI_DRAFT_REQUIRES_USER');
    await http().post(`/api/projects/${projectId}/ai-drafts`).send({}).expect(403);
    await http().post(`/api/projects/00000000-0000-0000-0000-000000000000/ai-drafts`).set(asUser).send({}).expect(404);
    await http().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({ mode: 'NEPOZNAT' }).expect(400);
    await http().get(`/api/projects/${projectId}/ai-drafts/estimate?targetPages=0`).expect(400);
    expect(mock.requests).toHaveLength(0);
  });

  it('estimates calls, duration, cost and context size before the start', async () => {
    const projectId = await createProject('Procena');
    const res = await http().get(`/api/projects/${projectId}/ai-drafts/estimate?targetPages=4`).expect(200);
    expect(res.body).toMatchObject({ calls: 6, targetPages: 4, model: 'claude-opus-5-5', effort: 'medium', imageCount: 0, largeContext: false, warnings: [] });
    expect(res.body.sections.map((s: { key: string }) => s.key)).toEqual(ORDER);
    expect(res.body.sections.find((s: { key: string }) => s.key === 'DESCRIPTION').targetWords).toBe(1400);
    expect(res.body.inputTokensPerCall).toBeGreaterThan(1000);
    expect(res.body.outputTokens).toBeGreaterThan(2000);
    expect(res.body.durationSeconds.max).toBeGreaterThan(res.body.durationSeconds.min);
    expect(res.body.estimatedCostUsd).toBeGreaterThan(0);
    const dflt = await http().get(`/api/projects/${projectId}/ai-drafts/estimate`).expect(200);
    expect(dflt.body.targetPages).toBe(7);
    expect(mock.requests).toHaveLength(0);
  });

  it('keeps every finished section when a later call is refused, cut off or fails', async () => {
    const projectId = await createProject('Greške modela');

    // Refusal on the very first section: nothing written → REFUSED, every section closed.
    mock.answer(fakeMessage({ stopReason: 'refusal', refusalCategory: 'cyber' }));
    const refused = await runDraft(projectId);
    expect(refused).toMatchObject({ status: 'REFUSED', active: false, progress: { total: 6, written: 0, current: null } });
    expect(refused.errorMessage).toContain('AI nije mogao da napiše nacrt');
    expect(refused.errorMessage).toContain('cyber');
    expect(refused.sections.map((s: { generation: string }) => s.generation)).toEqual(['FAILED', 'SKIPPED', 'SKIPPED', 'SKIPPED', 'SKIPPED', 'SKIPPED']);
    expect(refused.sections[0].errorMessage).toContain('kategorija: cyber');

    // A cut-off description keeps the text that arrived, marked; the next answer is invalid JSON → the job stops as PARTIAL.
    mock.answer(sectionAnswer(SECTION_TEXT.TITLE));
    mock.answer(sectionAnswer(SECTION_TEXT.CHARACTERISTIC_FEATURES));
    mock.answer(fakeMessage({ text: '{"content": "## Oblik u celini\\n\\nPanel (1) je pravougaon i ima \\u010de', stopReason: 'max_tokens' }));
    mock.answer(fakeMessage({ text: '{"content": [' }));
    const cut = await runDraft(projectId);
    expect(cut).toMatchObject({ status: 'PARTIAL', progress: { written: 3 } });
    expect(cut.errorMessage).toContain('nije validan JSON');
    const byKey: Record<string, Record<string, any>> = Object.fromEntries(cut.sections.map((s: { key: string }) => [s.key, s]));
    expect(byKey.TITLE).toMatchObject({ generation: 'DONE', status: 'PROPOSED', draftVersionNumber: 1 });
    expect(byKey.DESCRIPTION).toMatchObject({ generation: 'TRUNCATED', status: 'PROPOSED', draftVersionNumber: 1 });
    expect(byKey.DESCRIPTION.content).toBe(`## Oblik u celini\n\nPanel (1) je pravougaon i ima če\n\n${TRUNCATED_MARKER}`);
    expect(byKey.PURPOSE).toMatchObject({ generation: 'FAILED', status: 'PROPOSED', draftVersionId: null });
    expect(byKey.REPRESENTATION_LIST.generation).toBe('SKIPPED');
    expect(cut.notes.some((n: string) => n.includes('prekinuta na granici izlaznih tokena'))).toBe(true);
    const written = await sectionsOf(projectId);
    expect(written.find((s) => s.key === 'DESCRIPTION')!.versions[0].content).toContain(TRUNCATED_MARKER);
    expect(written.find((s) => s.key === 'PURPOSE')!.versions).toHaveLength(0);
    // A failed or skipped section cannot be accepted or rejected.
    const notWritten = await http().post(`/api/ai-drafts/${cut.id}/sections/PURPOSE/accept`).set(asUser).send({}).expect(409);
    expect(notWritten.body.code).toBe('AI_DRAFT_SECTION_NOT_WRITTEN');

    // A network/auth error on the first section: FAILED, no key in the message.
    mock.fail(new Anthropic.AuthenticationError(401, { error: { message: 'bad key' } }, 'bad key', new Headers()));
    const failed = await runDraft(projectId);
    expect(failed.status).toBe('FAILED');
    expect(failed.errorMessage).toContain('ANTHROPIC_API_KEY');
    expect(failed.errorMessage).not.toContain('sk-test');
    expect(failed.sections[0]).toMatchObject({ generation: 'FAILED', errorMessage: expect.stringContaining('ključ') });

    const list = await http().get(`/api/projects/${projectId}/ai-drafts`).expect(200);
    expect(list.body.map((d: { status: string }) => d.status)).toEqual(['FAILED', 'PARTIAL', 'REFUSED']);
  });

  it('salvages the text of a cut-off JSON answer', () => {
    expect(salvageTruncatedContent('{"content": "Panel (1) je pravougaon.\\nDrugi red', )).toBe('Panel (1) je pravougaon.\nDrugi red');
    expect(salvageTruncatedContent('{"content": "Ivica je \\')).toBe('Ivica je');
    expect(salvageTruncatedContent('{"content": "Ivica \\u010d')).toBe('Ivica č');
    expect(salvageTruncatedContent('{"content": "Ivica \\u01')).toBe('Ivica');
    expect(salvageTruncatedContent('{"content": "Ceo tekst", "placeholders": 0, "notes": []}')).toBe('Ceo tekst');
    expect(salvageTruncatedContent('{"notes": [')).toBe('');
    expect(salvageTruncatedContent('')).toBe('');
  });

  describe('generate → sections one by one → accept / reject → confirm → DOCX draft → final package', () => {
    let projectId: string;
    let draftId: string;
    let descriptionId: string;
    let requests: typeof mock.requests = [];

    beforeAll(async () => {
      projectId = await createProject('Puni tok nacrta');
      await http().post(`/api/projects/${projectId}/research/import`).set(asAgent).expect(201);
      await http().patch(`/api/projects/${projectId}`).set(asUser).send({ targetDescriptionPages: 3, productSummary: 'Panel sa stepenastim ivicama.' }).expect(200);
      const png = await http().post(`/api/projects/${projectId}/files`).set(asUser).field('role', 'RENDER').attach('file', PNG, 'render.png').expect(201);
      await http().post(`/api/projects/${projectId}/files`).set(asUser).field('role', 'PHOTO').attach('file', SVG, 'skica.svg').expect(201);
      await http()
        .post(`/api/projects/${projectId}/representations`)
        .set(asUser)
        .send({ position: 1, viewName: 'Perspektivni prikaz', purpose: 'Celina', featureShown: 'Ceo panel', requirement: 'MANDATORY', uploadedFileId: png.body.id, sourceType: 'USER' })
        .expect(201);
    });

    it('answers 202 at once, writes each section as soon as its call ends, and refuses a second start meanwhile', async () => {
      const resolvers = ORDER.map(() => mock.answerLater());
      const started = await http().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({ mode: 'GENERATE' }).expect(202);
      draftId = started.body.id;
      expect(started.body).toMatchObject({ active: true, mode: 'GENERATE', targetPages: 3, imageCount: 1, effort: 'medium', disclaimer: AI_DRAFT_DISCLAIMER });
      expect(['QUEUED', 'RUNNING']).toContain(started.body.status);
      expect(started.body.sections.map((s: { key: string }) => s.key)).toEqual(ORDER);
      expect(started.body.sections.every((s: { content: string; draftVersionId: null }) => s.content === '' && s.draftVersionId === null)).toBe(true);
      expect(started.body.notes.some((n: string) => n.includes('skica.svg'))).toBe(true);

      const busy = await http().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({}).expect(409);
      expect(busy.body).toMatchObject({ code: 'AI_DRAFT_IN_PROGRESS', draftId });

      let draft = await pollUntil(draftId, (d) => d.status === 'RUNNING' && d.progress.current === 'TITLE');
      expect(draft.progress).toEqual({ total: 6, written: 0, current: 'TITLE' });
      expect(draft.sections[0]).toMatchObject({ generation: 'WRITING', targetWords: 12 });
      expect((await sectionsOf(projectId)).every((s) => s.versions.length === 0)).toBe(true);

      resolvers[0](sectionAnswer(SECTION_TEXT.TITLE, [], { input: 9000, output: 50, cacheCreation: 30000 }));
      draft = await pollUntil(draftId, (d) => d.progress.written === 1 && d.progress.current === 'CHARACTERISTIC_FEATURES');
      expect(draft.sections[0]).toMatchObject({ generation: 'DONE', status: 'PROPOSED', content: 'Fasadni panel', wordCount: 2, draftVersionNumber: 1, inputTokens: 9000, outputTokens: 50, cacheCreationTokens: 30000 });
      expect(draft.sections[0].estimatedCostUsd).toBeCloseTo((9000 * 4 + 50 * 20 + 30000 * 5) / 1_000_000, 6);
      expect(draft).toMatchObject({ inputTokens: 9000, outputTokens: 50, cacheCreationTokens: 30000 });
      expect(draft.sections[1].generation).toBe('WRITING');
      expect(draft.sections[2].generation).toBe('PENDING');
      // The title is already in the project while the rest is being written.
      expect((await sectionsOf(projectId)).find((s) => s.key === 'TITLE')!.versions[0]).toMatchObject({ content: 'Fasadni panel', sourceType: 'AGENT_INFERENCE', sourceReference: `ai-draft:${draftId}` });

      for (const [i, key] of ORDER.entries()) {
        if (i === 0) continue;
        resolvers[i](sectionAnswer(SECTION_TEXT[key], key === 'DESCRIPTION' ? ['Boja završnog sloja nije navedena u odgovorima.'] : [], { input: 100, output: 400, cacheRead: 30000 }));
        await pollUntil(draftId, (d) => d.progress.written === i + 1);
      }
      draft = await pollUntil(draftId, (d) => !d.active);
      expect(draft).toMatchObject({ status: 'DONE', errorMessage: null, progress: { total: 6, written: 6, current: null }, cacheReadTokens: 150000 });
      expect(draft.durationMs).toBeGreaterThanOrEqual(0);
      expect(draft.finishedAt).not.toBeNull();
      expect(draft.estimatedCostUsd).toBeCloseTo((9000 * 4 + 50 * 20 + 30000 * 5 + 5 * (100 * 4 + 400 * 20 + 30000 * 0.2)) / 1_000_000, 6);
      requests = [...mock.requests];
    });

    it('sends the cached prefix (system + matrix + ZIS example + project state) and one section task per call, in order', async () => {
      expect(requests).toHaveLength(6);
      for (const [i, req] of requests.entries()) {
        const key = ORDER[i];
        expect(req.model).toBe('claude-opus-5-5');
        expect(req.effort).toBe('medium');
        expect(req.maxTokens).toBe(key === 'DESCRIPTION' ? 32000 : 12000);
        expect(req.system).toHaveLength(3);
        expect(req.system[0].cache_control).toBeUndefined();
        expect(req.system[1].cache_control).toBeUndefined();
        expect(req.system[2].cache_control).toEqual({ type: 'ephemeral' });
        expect(req.schema).toMatchObject({ type: 'object', additionalProperties: false, required: ['content', 'placeholders', 'notes'] });
        expect(req.userText).toContain(`SADA NAPIŠI SEKCIJU ${key}:`);
        expect(req.userText).toContain('Režim: GENERIŠI');
        expect(req.userText).toContain('Ceo dokument cilja oko 3 strana');
        expect(req.userText).toContain('Panel sa stepenastim ivicama.');
        const content = req.userContent as unknown as Record<string, unknown>[];
        // The project state and the images carry the second cache breakpoint; the task after it varies per call.
        expect(content[content.length - 2].cache_control).toEqual({ type: 'ephemeral' });
        expect(content[content.length - 1]).toMatchObject({ type: 'text' });
        expect(content[content.length - 1].cache_control).toBeUndefined();
        expect(content.filter((b) => b.type === 'image')).toHaveLength(1);
      }
      const [title, features, description, , , attachments] = requests;
      expect(title.system[0].text).toContain('prijava za priznanje prava na industrijski dizajn');
      expect(title.system[0].text).toContain('[POTREBNA DOPUNA: šta nedostaje]');
      expect(title.system[0].text).not.toMatch(/patentiranje industrijskog/u);
      expect(title.system[1].text).toContain('MZ-048');
      expect(title.system[2].text).toContain('Primer: BOCA');
      expect(title.userText).toContain('Ovo je prva sekcija nacrta');
      expect(title.userText).toContain('Ciljni obim ove sekcije: oko 12 reči');
      expect(features.userText).toContain('### TITLE');
      expect(features.userText).toContain('Fasadni panel');
      expect(description.userText).toMatch(/Ciljni obim ove sekcije: oko 1[.,]?050 reči/u);
      expect(description.userText).toContain(SECTION_TEXT.CHARACTERISTIC_FEATURES);
      expect(description.userText).toContain('Sekcije koje slede u narednim pozivima (ne piši njihov sadržaj sada): PURPOSE');
      expect(attachments.userText).toContain('Ovo je poslednja sekcija nacrta.');
      expect(attachments.userText).toContain(SECTION_TEXT.DESCRIPTION);
      const labelIndex = title.userContent!.findIndex((b) => b.type === 'text' && b.text.includes('prikaz 1.1 — Perspektivni prikaz'));
      expect(labelIndex).toBeGreaterThan(0);
      expect(title.userContent![labelIndex + 1].type).toBe('image');
    });

    it('wrote one AGENT_INFERENCE version per section and counted the markers itself', async () => {
      const res = await http().get(`/api/ai-drafts/${draftId}`).expect(200);
      expect(res.body.sections.map((s: { key: string }) => s.key)).toEqual(ORDER);
      expect(res.body.sections.every((s: { status: string; draftVersionNumber: number; generation: string }) => s.status === 'PROPOSED' && s.draftVersionNumber === 1 && s.generation === 'DONE')).toBe(true);
      const description = res.body.sections.find((s: { key: string }) => s.key === 'DESCRIPTION');
      expect(description.placeholders).toBe(1);
      expect(description.wordCount).toBeGreaterThan(20);
      expect(description.pages).toBeGreaterThan(0);
      expect(description.previousContent).toBe('');
      expect(res.body.totals.placeholders).toBe(1);
      expect(res.body.totals.words).toBeGreaterThan(description.wordCount);
      expect(res.body.notes).toContain('Opis industrijskog dizajna: Boja završnog sloja nije navedena u odgovorima.');

      const sections = await sectionsOf(projectId);
      descriptionId = sections.find((s) => s.key === 'DESCRIPTION')!.id;
      for (const section of sections) {
        expect(section.versions).toHaveLength(1);
        expect(section.versions[0]).toMatchObject({ createdByActor: 'AGENT', sourceType: 'AGENT_INFERENCE', sourceReference: `ai-draft:${draftId}`, content: SECTION_TEXT[section.key] });
        expect(section.confirmed).toBe(false);
      }
      expect(sections.find((s) => s.key === 'DESCRIPTION')!.versions[0].placeholders).toBe(1);
      const stored = await prisma.draftVersion.findMany({ where: { sourceReference: `ai-draft:${draftId}` } });
      expect(stored.every((v) => !v.verified)).toBe(true);
    });

    it('refuses to confirm a section while a „[POTREBNA DOPUNA]" marker is in it', async () => {
      const blocked = await http().post(`/api/application-sections/${descriptionId}/confirm`).set(asUser).send({ explicitUserConfirmation: true }).expect(409);
      expect(blocked.body.code).toBe('SECTION_HAS_PLACEHOLDERS');
      const fixed = SECTION_TEXT.DESCRIPTION.replace('[POTREBNA DOPUNA: boja završnog sloja]', 'u svetlosivoj boji');
      await http().put(`/api/application-sections/${descriptionId}/working-draft`).set(asUser).send({ content: fixed }).expect(200);
      await http().post(`/api/application-sections/${descriptionId}/confirm`).set(asUser).send({ explicitUserConfirmation: true }).expect(201);
      const sections = await sectionsOf(projectId);
      const description = sections.find((s) => s.key === 'DESCRIPTION')!;
      expect(description.confirmed).toBe(true);
      expect(description.versions.map((v) => [v.versionNumber, v.createdByActor])).toEqual([
        [2, 'USER'],
        [1, 'AGENT'],
      ]);
    });

    it('holds the text of a confirmed section instead of overwriting it; the user decides, explicitly', async () => {
      answerAll(' (v2)');
      const res = await runDraft(projectId, { mode: 'EXPAND' });
      expect(res.status).toBe('DONE');
      expect(mock.requests[0].userText).toContain('Režim: PROŠIRI I DOTERAJ');
      const held = res.sections.find((s: { key: string }) => s.key === 'DESCRIPTION');
      expect(held).toMatchObject({ generation: 'DONE', status: 'HELD', draftVersionId: null, sectionConfirmedAtDraft: true });
      expect(res.sections.find((s: { key: string }) => s.key === 'TITLE')).toMatchObject({ status: 'PROPOSED', draftVersionNumber: 2, previousContent: 'Fasadni panel' });

      let sections = await sectionsOf(projectId);
      expect(sections.find((s) => s.key === 'DESCRIPTION')!.versions).toHaveLength(2);
      expect(sections.find((s) => s.key === 'DESCRIPTION')!.confirmed).toBe(true);

      await http().post(`/api/ai-drafts/${res.id}/sections/DESCRIPTION/accept`).set(asAgent).send({ replaceConfirmed: true }).expect(403);
      const asked = await http().post(`/api/ai-drafts/${res.id}/sections/DESCRIPTION/accept`).set(asUser).send({}).expect(409);
      expect(asked.body.code).toBe('AI_DRAFT_SECTION_CONFIRMED');
      expect(asked.body.message).toContain('Zameniti radnom verzijom?');

      const replaced = await http().post(`/api/ai-drafts/${res.id}/sections/DESCRIPTION/accept`).set(asUser).send({ replaceConfirmed: true }).expect(201);
      const accepted = replaced.body.sections.find((s: { key: string }) => s.key === 'DESCRIPTION');
      expect(accepted).toMatchObject({ status: 'ACCEPTED', draftVersionNumber: 3, sectionConfirmedAtDraft: true });
      sections = await sectionsOf(projectId);
      const description = sections.find((s) => s.key === 'DESCRIPTION')!;
      expect(description.confirmed).toBe(false);
      expect(description.versions[0]).toMatchObject({ versionNumber: 3, createdByActor: 'AGENT', sourceType: 'AGENT_INFERENCE', sourceReference: `ai-draft:${res.id}` });

      await http().post(`/api/ai-drafts/${res.id}/sections/DESCRIPTION/accept`).set(asUser).send({ replaceConfirmed: true }).expect(409);
      await http().post(`/api/ai-drafts/${res.id}/sections/NEMA/accept`).set(asUser).send({}).expect(404);

      // Reject TITLE v2: the previous text comes back as a new user version; v2 stays in the history.
      const rejected = await http().post(`/api/ai-drafts/${res.id}/sections/TITLE/reject`).set(asUser).expect(201);
      expect(rejected.body.sections.find((s: { key: string }) => s.key === 'TITLE').status).toBe('REJECTED');
      const title = (await sectionsOf(projectId)).find((s) => s.key === 'TITLE')!;
      expect(title.versions.map((v) => [v.versionNumber, v.content, v.createdByActor])).toEqual([
        [3, 'Fasadni panel', 'USER'],
        [2, 'Fasadni panel (v2)', 'AGENT'],
        [1, 'Fasadni panel', 'AGENT'],
      ]);
      expect(title.versions[0].sourceReference).toBe(`ai-draft-rejected:${res.id}`);

      const decisions = await http().get(`/api/projects/${projectId}/decisions`).expect(200);
      const titles = decisions.body.map((d: { title: string }) => d.title);
      expect(titles.some((t: string) => t.startsWith('Prihvaćen AI nacrt sekcije „Opis industrijskog dizajna"'))).toBe(true);
      expect(titles.some((t: string) => t.startsWith('Odbijen AI nacrt sekcije'))).toBe(true);

      // Generating with replaceConfirmed writes over confirmed sections right away; a cancel after the title keeps only the title.
      await http().post(`/api/application-sections/${title.id}/confirm`).set(asUser).send({ explicitUserConfirmation: true }).expect(201);
      const resolvers = ORDER.map(() => mock.answerLater());
      const over = await http().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({ replaceConfirmed: true }).expect(202);
      await pollUntil(over.body.id, (d) => d.progress.current === 'TITLE');
      resolvers[0](sectionAnswer('Fasadni termoizolacioni panel'));
      await pollUntil(over.body.id, (d) => d.progress.written === 1);
      await http().post(`/api/ai-drafts/${over.body.id}/cancel`).set(asAgent).expect(403);
      const cancelling = await http().post(`/api/ai-drafts/${over.body.id}/cancel`).set(asUser).expect(201);
      expect(cancelling.body).toMatchObject({ active: true, cancelRequested: true });
      // The section being written is still finished and kept; the rest is skipped.
      resolvers[1](sectionAnswer('- stepenasti profil ivica (2) (v3)'));
      const cancelled = await pollUntil(over.body.id, (d) => !d.active);
      expect(cancelled).toMatchObject({ status: 'PARTIAL', errorMessage: DRAFT_CANCELLED_MESSAGE, progress: { written: 2, current: null } });
      expect(cancelled.sections.map((s: { generation: string }) => s.generation)).toEqual(['DONE', 'DONE', 'SKIPPED', 'SKIPPED', 'SKIPPED', 'SKIPPED']);
      expect(cancelled.sections[0]).toMatchObject({ key: 'TITLE', status: 'PROPOSED', draftVersionNumber: 4 });
      expect((await sectionsOf(projectId)).find((s) => s.key === 'TITLE')!.confirmed).toBe(false);
      const notActive = await http().post(`/api/ai-drafts/${over.body.id}/cancel`).set(asUser).expect(409);
      expect(notActive.body.code).toBe('AI_DRAFT_NOT_ACTIVE');
      expect(mock.queue).toHaveLength(4);
      mock.queue = [];
    });

    it('serves the DOCX draft over the latest versions, watermarked and with sub-headings and lists', async () => {
      const res = await http().get(`/api/projects/${projectId}/description-draft.docx`).buffer(true).parse(binary).expect(200);
      expect(res.headers['content-type']).toContain('wordprocessingml');
      expect(res.headers['content-disposition']).toContain('nacrt-opisa-');
      const body = res.body as Buffer;
      expect(body.subarray(0, 2).toString('latin1')).toBe('PK');
      const text = (await mammoth.extractRawText({ buffer: body })).value;
      expect(text).toContain('NACRT – nije za podnošenje');
      expect(text).toContain('Fasadni termoizolacioni panel');
      expect(text).toContain('Oblik u celini');
      expect(text).toContain('stepenasto profilisanim ivicama (2)');
      expect(text).toContain('[POTREBNA DOPUNA: boja završnog sloja]. (v2)');
      expect(text).toContain('marker „[POTREBNA DOPUNA]"');
      expect(text).toContain('Tekst sekcije nije potvrđen');
      expect(text).toContain('ne garantuje da će prijava biti prihvaćena');
      expect(text).not.toContain('## ');
    });

    it('shares the usage counters with the step reviews, summed over all section calls', async () => {
      const usage = await http().get(`/api/projects/${projectId}/ai-usage`).expect(200);
      expect(usage.body).toMatchObject({ calls: 3, draftCalls: 3, reviewCalls: 0, callsToday: 3 });
      expect(usage.body.cacheCreationTokens).toBe(30000);
      expect(usage.body.cacheReadTokens).toBe(150000);
    });

    it('carries the accepted text into the final package', async () => {
      for (const section of await sectionsOf(projectId)) {
        if (section.confirmed) continue;
        if (section.versions[0].placeholders > 0) {
          // The user fills the gap the AI marked; only then can the section be confirmed.
          const fixed = section.versions[0].content.replace('[POTREBNA DOPUNA: boja završnog sloja]', 'u svetlosivoj boji');
          await http().put(`/api/application-sections/${section.id}/working-draft`).set(asUser).send({ content: fixed }).expect(200);
        }
        await http().post(`/api/application-sections/${section.id}/confirm`).set(asUser).send({ explicitUserConfirmation: true }).expect(201);
      }
      const pkg = await http().post(`/api/projects/${projectId}/package/generate`).set(asUser).expect(201);
      expect(pkg.body.gate.canGenerate).toBe(true);
      const description = pkg.body.documents.find((d: { type: string }) => d.type === 'DESCRIPTION').versions[0];
      const md = await http().get(`/api/generated-documents/${description.id}/content`).expect(200);
      expect(md.text).toContain('### Oblik u celini');
      expect(md.text).toContain('stepenasto profilisanim ivicama (2)');
      expect(md.text).toContain('u svetlosivoj boji. (v2)');
      expect(md.text).toContain('- stepenasti profil ivica (2)');
      expect(md.text).not.toContain('POTREBNA DOPUNA');
      const docx = pkg.body.documents.find((d: { type: string }) => d.type === 'PACKAGE_DOCX').versions[0];
      const bin = await http().get(`/api/generated-documents/${docx.id}/content`).buffer(true).parse(binary).expect(200);
      const text = (await mammoth.extractRawText({ buffer: bin.body as Buffer })).value;
      expect(text).toContain('Oblik u celini');
      expect(text).toContain('Fasadni termoizolacioni panel');
    });
  });

  it('closes a job that a restart interrupted, keeping its finished sections', async () => {
    const projectId = await createProject('Restart');
    const sections = await sectionsOf(projectId);
    const draft = await prisma.aiDraft.create({
      data: {
        projectId,
        mode: 'GENERATE',
        model: 'claude-opus-5-5',
        status: 'RUNNING',
        targetPages: 5,
        startedAt: new Date(),
        sections: {
          create: [
            { applicationSectionId: sections[0].id, sectionKey: sections[0].key, position: 0, content: 'Fasadni panel', wordCount: 2, generation: 'DONE' },
            { applicationSectionId: sections[1].id, sectionKey: sections[1].key, position: 1, content: '', generation: 'WRITING' },
            { applicationSectionId: sections[2].id, sectionKey: sections[2].key, position: 2, content: '', generation: 'PENDING' },
          ],
        },
      },
    });
    await service.onModuleInit();
    const closed = await http().get(`/api/ai-drafts/${draft.id}`).expect(200);
    expect(closed.body).toMatchObject({ status: 'PARTIAL', active: false, errorMessage: DRAFT_INTERRUPTED_BY_RESTART_MESSAGE });
    expect(closed.body.sections.map((s: { generation: string }) => s.generation)).toEqual(['DONE', 'FAILED', 'SKIPPED']);
    expect(closed.body.sections[1].errorMessage).toBe(DRAFT_INTERRUPTED_BY_RESTART_MESSAGE);
    // A new start is possible again.
    answerAll();
    const next = await runDraft(projectId);
    expect(next.status).toBe('DONE');
  });

  describe('limits', () => {
    let limited: INestApplication<App>;
    const limitedMock = new MockModelClient();

    beforeAll(async () => {
      limited = await createAiTestApp(new AiConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_MAX_CALLS_PER_PROJECT_PER_DAY: '2', AI_MAX_CONTEXT_CHARS: '400', AI_DRAFT_EFFORT: 'nepoznat' }), limitedMock);
    });

    afterAll(async () => {
      await limited.close();
    });

    it('refuses a context that is too large instead of cutting it, and shares the daily cap between reviews and drafts', async () => {
      const h = () => request(limited.getHttpServer());
      expect((await h().get('/api/ai/status').expect(200)).body.draftEffort).toBe('medium');
      const created = await h().post('/api/projects').set(asUser).send({ name: 'Limiti' }).expect(201);
      const projectId = created.body.id;
      const big = await h().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({}).expect(422);
      expect(big.body.code).toBe('AI_CONTEXT_TOO_LARGE');
      expect(big.body.message).toContain('Ništa nije skraćeno');
      const bigEstimate = await h().get(`/api/projects/${projectId}/ai-drafts/estimate`).expect(422);
      expect(bigEstimate.body.code).toBe('AI_CONTEXT_TOO_LARGE');
      expect(limitedMock.requests).toHaveLength(0);
      expect((await h().get(`/api/projects/${projectId}/ai-drafts`).expect(200)).body).toHaveLength(0);

      await prisma.aiReview.create({ data: { projectId, stepKey: 'PROJECT_SETUP', model: 'claude-opus-5-5', status: 'OK' } });
      await prisma.aiDraft.create({ data: { projectId, mode: 'GENERATE', model: 'claude-opus-5-5', status: 'FAILED', targetPages: 5 } });
      const capped = await h().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({}).expect(409);
      expect(capped.body.code).toBe('AI_DAILY_LIMIT_REACHED');
      const review = await h().post(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(409);
      expect(review.body.code).toBe('AI_DAILY_LIMIT_REACHED');
    });
  });
});
