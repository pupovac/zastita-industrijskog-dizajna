import Anthropic from '@anthropic-ai/sdk';
import { INestApplication } from '@nestjs/common';
import mammoth from 'mammoth';
import request from 'supertest';
import { App } from 'supertest/types';
import { AiConfig } from '../src/ai/ai-config';
import { AI_DRAFT_DISCLAIMER } from '../src/ai/ai-draft-prompt';
import { PrismaService } from '../src/prisma/prisma.service';
import { createAiTestApp, fakeMessage, MockModelClient } from './ai-mock';

const asUser = { 'X-Actor-Type': 'USER' };
const asAgent = { 'X-Actor-Type': 'AGENT' };

/** A valid 1×1 PNG; the upload checks the signature, the draft sends it to the model as an image block. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><text>v1</text></svg>');

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

const okResponse = (overrides: { sections?: { key: string; content: string; placeholders: number }[]; notes?: string[] } = {}) =>
  JSON.stringify({
    sections: overrides.sections ?? [
      ...Object.entries(SECTION_TEXT).map(([key, content]) => ({ key, content, placeholders: 0 })),
      { key: 'NEPOZNATA', content: 'x', placeholders: 0 },
    ],
    notes: overrides.notes ?? ['Boja završnog sloja nije navedena u odgovorima.'],
  });

describe('AI draft of the description (e2e, mocked SDK)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
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

  beforeAll(async () => {
    app = await createAiTestApp(new AiConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_MAX_CALLS_PER_PROJECT_PER_DAY: '50', AI_DRAFT_TARGET_PAGES: '7' }), mock);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mock.requests = [];
    mock.queue = [];
  });

  it('reports the default target length without the key', async () => {
    const status = await http().get('/api/ai/status').expect(200);
    expect(status.body).toMatchObject({ configured: true, draftTargetPages: 7 });
    expect(JSON.stringify(status.body)).not.toContain('sk-test');
  });

  it('lets only the user start a draft and refuses an unknown project', async () => {
    const projectId = await createProject('Samo korisnik');
    const agent = await http().post(`/api/projects/${projectId}/ai-drafts`).set(asAgent).send({ mode: 'GENERATE' }).expect(403);
    expect(agent.body.code).toBe('AI_DRAFT_REQUIRES_USER');
    await http().post(`/api/projects/${projectId}/ai-drafts`).send({}).expect(403);
    await http().post(`/api/projects/00000000-0000-0000-0000-000000000000/ai-drafts`).set(asUser).send({}).expect(404);
    await http().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({ mode: 'NEPOZNAT' }).expect(400);
    expect(mock.requests).toHaveLength(0);
  });

  it('records a refusal, a cut-off answer and invalid JSON as REFUSED/ERROR without writing versions', async () => {
    const projectId = await createProject('Greške modela');
    mock.answer(fakeMessage({ stopReason: 'refusal', refusalCategory: 'cyber' }));
    const refused = await http().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({}).expect(201);
    expect(refused.body).toMatchObject({ status: 'REFUSED', sections: [] });
    expect(refused.body.errorMessage).toContain('AI nije mogao da napiše nacrt');

    mock.answer(fakeMessage({ text: '{"sections": [', stopReason: 'max_tokens' }));
    const cut = await http().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({}).expect(201);
    expect(cut.body.status).toBe('ERROR');
    expect(cut.body.errorMessage).toContain('max_tokens');

    mock.answer(fakeMessage({ text: '{"sections": [' }));
    const invalid = await http().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({}).expect(201);
    expect(invalid.body.errorMessage).toContain('nije validan JSON');

    mock.fail(new Anthropic.AuthenticationError(401, { error: { message: 'bad key' } }, 'bad key', new Headers()));
    const failed = await http().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({}).expect(201);
    expect(failed.body.status).toBe('ERROR');
    expect(failed.body.errorMessage).not.toContain('sk-test');

    const sections = await sectionsOf(projectId);
    expect(sections.every((s) => s.versions.length === 0)).toBe(true);
    const list = await http().get(`/api/projects/${projectId}/ai-drafts`).expect(200);
    expect(list.body).toHaveLength(4);
  });

  describe('generate → versions for every section → accept / reject → confirm → DOCX draft → final package', () => {
    let projectId: string;
    let draftId: string;
    let descriptionId: string;

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

    it('sends the stable prompt (system + matrix + ZIS example) with one cache breakpoint, the project state and the images', async () => {
      mock.answer(fakeMessage({ text: okResponse(), usage: { input: 9000, output: 4000, cacheCreation: 30000 } }));
      const res = await http().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({ mode: 'GENERATE' }).expect(201);
      draftId = res.body.id;
      expect(res.body).toMatchObject({ status: 'OK', mode: 'GENERATE', targetPages: 3, imageCount: 1, disclaimer: AI_DRAFT_DISCLAIMER });
      expect(res.body.estimatedCostUsd).toBeCloseTo((9000 * 4 + 4000 * 20 + 30000 * 5) / 1_000_000, 6);
      expect(res.body.durationMs).toBeGreaterThanOrEqual(0);

      const [req] = mock.requests;
      expect(req.model).toBe('claude-opus-5-5');
      expect(req.maxTokens).toBeGreaterThanOrEqual(16000);
      expect(req.system).toHaveLength(3);
      expect(req.system[0].cache_control).toBeUndefined();
      expect(req.system[1].cache_control).toBeUndefined();
      expect(req.system[2].cache_control).toEqual({ type: 'ephemeral' });
      expect(req.system[0].text).toContain('prijava za priznanje prava na industrijski dizajn');
      expect(req.system[0].text).toContain('[POTREBNA DOPUNA: šta nedostaje]');
      expect(req.system[0].text).not.toMatch(/patentiranje industrijskog/u);
      expect(req.system[1].text).toContain('MZ-048');
      expect(req.system[2].text).toContain('Primer: BOCA');
      expect(req.system[2].text).toContain('uputstvo-novo-PDF.pdf');
      expect(req.schema).toMatchObject({ type: 'object', additionalProperties: false, required: ['sections', 'notes'] });

      expect(req.userText).toContain('Režim: GENERIŠI');
      expect(req.userText).toContain('Ciljna dužina ukupnog teksta: oko 3 strana');
      expect(req.userText).toContain('Panel sa stepenastim ivicama.');
      expect(req.userText).toContain('Perspektivni prikaz');
      expect(req.userText).toContain('- DESCRIPTION: Opis industrijskog dizajna');

      const content = req.userContent!;
      const images = content.filter((b) => b.type === 'image');
      expect(images).toHaveLength(1);
      expect(images[0]).toMatchObject({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: PNG.toString('base64') } });
      const labelIndex = content.findIndex((b) => b.type === 'text' && b.text.includes('prikaz 1.1 — Perspektivni prikaz'));
      expect(labelIndex).toBeGreaterThan(0);
      expect(content[labelIndex + 1].type).toBe('image');
      expect(content[content.length - 1]).toMatchObject({ type: 'text' });
      expect(res.body.notes.some((n: string) => n.includes('skica.svg'))).toBe(true);
    });

    it('writes one AGENT_INFERENCE version per section, counts the markers itself and reports unknown keys', async () => {
      const res = await http().get(`/api/ai-drafts/${draftId}`).expect(200);
      expect(res.body.sections.map((s: { key: string }) => s.key)).toEqual(['TITLE', 'DESCRIPTION', 'CHARACTERISTIC_FEATURES', 'PURPOSE', 'REPRESENTATION_LIST', 'ATTACHMENT_LIST']);
      expect(res.body.sections.every((s: { status: string; draftVersionNumber: number }) => s.status === 'PROPOSED' && s.draftVersionNumber === 1)).toBe(true);
      const description = res.body.sections.find((s: { key: string }) => s.key === 'DESCRIPTION');
      expect(description.placeholders).toBe(1);
      expect(description.wordCount).toBeGreaterThan(20);
      expect(description.pages).toBeGreaterThan(0);
      expect(description.previousContent).toBe('');
      expect(res.body.totals.placeholders).toBe(1);
      expect(res.body.totals.words).toBeGreaterThan(description.wordCount);
      expect(res.body.notes).toContain('Boja završnog sloja nije navedena u odgovorima.');
      expect(res.body.notes.some((n: string) => n.includes('NEPOZNATA'))).toBe(true);

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
      mock.answer(fakeMessage({ text: okResponse({ sections: Object.entries(SECTION_TEXT).map(([key, content]) => ({ key, content: `${content} (v2)`, placeholders: 0 })), notes: [] }) }));
      const res = await http().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({ mode: 'EXPAND' }).expect(201);
      expect(mock.requests[0].userText).toContain('Režim: PROŠIRI I DOTERAJ');
      const held = res.body.sections.find((s: { key: string }) => s.key === 'DESCRIPTION');
      expect(held).toMatchObject({ status: 'HELD', draftVersionId: null, sectionConfirmedAtDraft: true });
      expect(res.body.sections.find((s: { key: string }) => s.key === 'TITLE')).toMatchObject({ status: 'PROPOSED', draftVersionNumber: 2, previousContent: 'Fasadni panel' });

      let sections = await sectionsOf(projectId);
      expect(sections.find((s) => s.key === 'DESCRIPTION')!.versions).toHaveLength(2);
      expect(sections.find((s) => s.key === 'DESCRIPTION')!.confirmed).toBe(true);

      await http().post(`/api/ai-drafts/${res.body.id}/sections/DESCRIPTION/accept`).set(asAgent).send({ replaceConfirmed: true }).expect(403);
      const asked = await http().post(`/api/ai-drafts/${res.body.id}/sections/DESCRIPTION/accept`).set(asUser).send({}).expect(409);
      expect(asked.body.code).toBe('AI_DRAFT_SECTION_CONFIRMED');
      expect(asked.body.message).toContain('Zameniti radnom verzijom?');

      const replaced = await http().post(`/api/ai-drafts/${res.body.id}/sections/DESCRIPTION/accept`).set(asUser).send({ replaceConfirmed: true }).expect(201);
      const accepted = replaced.body.sections.find((s: { key: string }) => s.key === 'DESCRIPTION');
      expect(accepted).toMatchObject({ status: 'ACCEPTED', draftVersionNumber: 3, sectionConfirmedAtDraft: true });
      sections = await sectionsOf(projectId);
      const description = sections.find((s) => s.key === 'DESCRIPTION')!;
      expect(description.confirmed).toBe(false);
      expect(description.versions[0]).toMatchObject({ versionNumber: 3, createdByActor: 'AGENT', sourceType: 'AGENT_INFERENCE', sourceReference: `ai-draft:${res.body.id}` });

      await http().post(`/api/ai-drafts/${res.body.id}/sections/DESCRIPTION/accept`).set(asUser).send({ replaceConfirmed: true }).expect(409);
      await http().post(`/api/ai-drafts/${res.body.id}/sections/NEMA/accept`).set(asUser).send({}).expect(404);

      // Reject TITLE v2: the previous text comes back as a new user version; v2 stays in the history.
      const rejected = await http().post(`/api/ai-drafts/${res.body.id}/sections/TITLE/reject`).set(asUser).expect(201);
      expect(rejected.body.sections.find((s: { key: string }) => s.key === 'TITLE').status).toBe('REJECTED');
      const title = (await sectionsOf(projectId)).find((s) => s.key === 'TITLE')!;
      expect(title.versions.map((v) => [v.versionNumber, v.content, v.createdByActor])).toEqual([
        [3, 'Fasadni panel', 'USER'],
        [2, 'Fasadni panel (v2)', 'AGENT'],
        [1, 'Fasadni panel', 'AGENT'],
      ]);
      expect(title.versions[0].sourceReference).toBe(`ai-draft-rejected:${res.body.id}`);

      const decisions = await http().get(`/api/projects/${projectId}/decisions`).expect(200);
      const titles = decisions.body.map((d: { title: string }) => d.title);
      expect(titles.some((t: string) => t.startsWith('Prihvaćen AI nacrt sekcije „Opis industrijskog dizajna"'))).toBe(true);
      expect(titles.some((t: string) => t.startsWith('Odbijen AI nacrt sekcije'))).toBe(true);

      // Generating with replaceConfirmed writes over confirmed sections right away.
      await http().post(`/api/application-sections/${title.id}/confirm`).set(asUser).send({ explicitUserConfirmation: true }).expect(201);
      mock.answer(fakeMessage({ text: okResponse({ sections: [{ key: 'TITLE', content: 'Fasadni termoizolacioni panel', placeholders: 0 }], notes: [] }) }));
      const over = await http().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({ replaceConfirmed: true }).expect(201);
      expect(over.body.sections[0]).toMatchObject({ key: 'TITLE', status: 'PROPOSED', draftVersionNumber: 4 });
      expect(over.body.notes.some((n: string) => n.includes('DESCRIPTION'))).toBe(true);
      expect((await sectionsOf(projectId)).find((s) => s.key === 'TITLE')!.confirmed).toBe(false);
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

    it('shares the usage counters with the step reviews', async () => {
      const usage = await http().get(`/api/projects/${projectId}/ai-usage`).expect(200);
      expect(usage.body).toMatchObject({ calls: 3, draftCalls: 3, reviewCalls: 0, callsToday: 3 });
      expect(usage.body.cacheCreationTokens).toBe(30000);
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

  describe('limits', () => {
    let limited: INestApplication<App>;
    const limitedMock = new MockModelClient();

    beforeAll(async () => {
      limited = await createAiTestApp(new AiConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_MAX_CALLS_PER_PROJECT_PER_DAY: '2', AI_MAX_CONTEXT_CHARS: '400' }), limitedMock);
    });

    afterAll(async () => {
      await limited.close();
    });

    it('refuses a context that is too large instead of cutting it, and shares the daily cap between reviews and drafts', async () => {
      const h = () => request(limited.getHttpServer());
      const created = await h().post('/api/projects').set(asUser).send({ name: 'Limiti' }).expect(201);
      const projectId = created.body.id;
      const big = await h().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({}).expect(422);
      expect(big.body.code).toBe('AI_CONTEXT_TOO_LARGE');
      expect(big.body.message).toContain('Ništa nije skraćeno');
      expect(limitedMock.requests).toHaveLength(0);

      await prisma.aiReview.create({ data: { projectId, stepKey: 'PROJECT_SETUP', model: 'claude-opus-5-5', status: 'OK' } });
      await prisma.aiDraft.create({ data: { projectId, mode: 'GENERATE', model: 'claude-opus-5-5', status: 'ERROR', targetPages: 5 } });
      const capped = await h().post(`/api/projects/${projectId}/ai-drafts`).set(asUser).send({}).expect(409);
      expect(capped.body.code).toBe('AI_DAILY_LIMIT_REACHED');
      const review = await h().post(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(409);
      expect(review.body.code).toBe('AI_DAILY_LIMIT_REACHED');
    });
  });
});
