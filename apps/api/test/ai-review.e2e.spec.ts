import Anthropic from '@anthropic-ai/sdk';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AiConfig } from '../src/ai/ai-config';
import { AI_DISCLAIMER } from '../src/ai/ai-prompt';
import { PrismaService } from '../src/prisma/prisma.service';
import { createAiTestApp, fakeMessage, Message, MockModelClient } from './ai-mock';

const asUser = { 'X-Actor-Type': 'USER' };
const asAgent = { 'X-Actor-Type': 'AGENT' };

const okResponse = (overrides: Partial<Record<'summary' | 'findings' | 'suggestions' | 'openQuestions', unknown>> = {}) =>
  JSON.stringify({
    summary: 'Korak je delimično popunjen; nedostaje adresa podnosioca.',
    findings: [
      { severity: 'VISOK', title: 'Nedostaje adresa podnosioca', detail: 'Polje applicantAddress je prazno.', relatedRequirement: 'MZ-146', relatedField: 'Project.applicantAddress' },
      { severity: 'NIZAK', title: 'Opis proizvoda je kratak', detail: 'Dopuniti.', relatedRequirement: 'MZ-999', relatedField: null },
    ],
    suggestions: [
      { target: { entity: 'Project', id: null, field: 'applicantAddress' }, proposedValue: 'Izmišljena 1, 11000 Beograd', rationale: 'Iz odgovora na pitanje A1.', requirementRef: 'MZ-146' },
      { target: { entity: 'Fact', id: null, field: 'statement' }, proposedValue: 'Panel ima stepenaste ivice.', rationale: 'Iz opisa proizvoda.', requirementRef: null },
      { target: { entity: 'D1FieldValue', id: null, field: 'APPLICANT' }, proposedValue: 'ne sme u koraku 1', rationale: '', requirementRef: null },
    ],
    openQuestions: ['Da li podnosilac ima zastupnika?'],
    ...overrides,
  });

describe('AI review of a step (e2e, mocked SDK)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const mock = new MockModelClient();
  const http = () => request(app.getHttpServer());

  async function createProject(name: string): Promise<string> {
    const res = await http().post('/api/projects').set(asUser).send({ name, productName: 'EPS panel' }).expect(201);
    return res.body.id;
  }

  beforeAll(async () => {
    app = await createAiTestApp(new AiConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_MAX_CALLS_PER_PROJECT_PER_DAY: '50' }), mock);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mock.requests = [];
    mock.queue = [];
  });

  it('reports the configuration without ever returning the key', async () => {
    const health = await http().get('/api/healthz').expect(200);
    expect(health.body).toMatchObject({ status: 'ok', ai: 'configured' });
    const status = await http().get('/api/ai/status').expect(200);
    expect(status.body).toMatchObject({ configured: true, model: 'claude-opus-5-5', maxCallsPerProjectPerDay: 50 });
    expect(JSON.stringify(status.body)).not.toContain('sk-test');
  });

  it('turns invalid JSON from the model into an ERROR record instead of failing the request', async () => {
    const projectId = await createProject('Nevalidan JSON');
    mock.answer(fakeMessage({ text: '{"summary": "nedovr' }));
    const res = await http().post(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(201);
    expect(res.body).toMatchObject({ status: 'ERROR', suggestions: [], findings: [] });
    expect(res.body.errorMessage).toContain('nije validan JSON');
    expect(res.body.inputTokens).toBe(1200);

    mock.answer(fakeMessage({ text: JSON.stringify({ summary: 'x' }) }));
    const schema = await http().post(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(201);
    expect(schema.body.status).toBe('ERROR');
    expect(schema.body.errorMessage).toContain('ne odgovara šemi');
  });

  it('records a refusal and an API error without crashing', async () => {
    const projectId = await createProject('Odbijanje');
    mock.answer(fakeMessage({ stopReason: 'refusal', refusalCategory: 'cyber' }));
    const refused = await http().post(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(201);
    expect(refused.body.status).toBe('REFUSED');
    expect(refused.body.errorMessage).toContain('AI nije mogao da obradi zahtev');

    mock.fail(new Anthropic.AuthenticationError(401, { error: { message: 'bad key' } }, 'bad key', new Headers()));
    const failed = await http().post(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(201);
    expect(failed.body.status).toBe('ERROR');
    expect(failed.body.errorMessage).toContain('ANTHROPIC_API_KEY');
    expect(failed.body.errorMessage).not.toContain('sk-test');

    mock.answer(fakeMessage({ text: '{"summary":', stopReason: 'max_tokens' }));
    const cut = await http().post(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(201);
    expect(cut.body.errorMessage).toContain('max_tokens');
  });

  it('rejects an unknown step and a missing project', async () => {
    const projectId = await createProject('Nepoznat korak');
    await http().post(`/api/projects/${projectId}/steps/NOPE/ai-reviews`).set(asUser).expect(404);
    await http().post(`/api/projects/00000000-0000-0000-0000-000000000000/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(404);
    expect(mock.requests).toHaveLength(0);
  });

  describe('review → suggestion → user decision → value written with the user\'s provenance', () => {
    let projectId: string;
    let reviewId: string;
    let suggestions: { id: string; target: { entity: string; field: string }; status: string }[];

    beforeAll(async () => {
      projectId = await createProject('Puni tok');
      await http().post(`/api/projects/${projectId}/research/import`).set(asAgent).expect(201);
    });

    it('sends the stable system prompt + matrix with a cache breakpoint, then the step state', async () => {
      mock.answer(fakeMessage({ text: okResponse(), usage: { cacheCreation: 20000 } }));
      const res = await http().post(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(201);
      reviewId = res.body.id;
      expect(res.body.status).toBe('OK');
      expect(res.body.disclaimer).toBe(AI_DISCLAIMER);
      expect(res.body.summary).toContain('delimično');
      expect(res.body.cacheCreationTokens).toBe(20000);
      expect(res.body.estimatedCostUsd).toBeCloseTo((1200 * 4 + 300 * 20 + 20000 * 5) / 1_000_000, 6);

      const [req] = mock.requests;
      expect(req.model).toBe('claude-opus-5-5');
      expect(req.system).toHaveLength(2);
      expect(req.system[0].cache_control).toBeUndefined();
      expect(req.system[1].cache_control).toEqual({ type: 'ephemeral' });
      expect(req.system[1].text).toContain('MZ-001');
      expect(req.system[1].text).toContain('Matrica zahteva ZIS-a (128 zahteva)');
      expect(req.system[0].text).toContain('prijava za priznanje prava na industrijski dizajn');
      expect(req.system[0].text).not.toMatch(/patentiranje industrijskog/u);
      expect(req.userText).toContain('Korak 1: Podešavanje projekta (PROJECT_SETUP)');
      expect(req.userText).toContain('"productName": "EPS panel"');
      expect(req.userText).toContain('Dozvoljeni ciljevi predloga');
      expect(req.schema).toMatchObject({ type: 'object', additionalProperties: false });
    });

    it('resolves matrix references for „Prikaži izvor" and marks unknown codes', async () => {
      const res = await http().get(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).expect(200);
      expect(res.body).toHaveLength(1);
      const [review] = res.body;
      expect(review.findings[0].requirement).toMatchObject({ code: 'MZ-146', status: 'CONFIRMED' });
      expect(review.findings[0].requirement.text.length).toBeGreaterThan(10);
      expect(review.findings[1].relatedRequirement).toBe('MZ-999');
      expect(review.findings[1].requirement).toBeNull();
    });

    it('keeps only suggestions the step allows and snapshots the current value', async () => {
      const res = await http().get(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).expect(200);
      suggestions = res.body[0].suggestions;
      expect(suggestions.map((s) => `${s.target.entity}.${s.target.field}`)).toEqual([
        'Project.applicantAddress',
        'Fact.statement',
        'OpenQuestion.text',
      ]);
      expect(suggestions.every((s) => s.status === 'PROPOSED')).toBe(true);
      expect(res.body[0].suggestions[0].currentValue).toBe('');
      expect(res.body[0].suggestions[0].requirement.code).toBe('MZ-146');
    });

    it('lets only the user accept or reject', async () => {
      await http().post(`/api/ai-suggestions/${suggestions[0].id}/accept`).set(asAgent).expect(403);
      await http().post(`/api/ai-suggestions/${suggestions[0].id}/reject`).set(asAgent).expect(403);
      await http().post(`/api/ai-suggestions/${suggestions[0].id}/accept`).expect(403);
      const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
      expect(project.applicantAddress).toBe('');
    });

    it('writes an accepted value with sourceType USER and a reference to the suggestion — never as a verified fact', async () => {
      const accepted = await http().post(`/api/ai-suggestions/${suggestions[0].id}/accept`).set(asUser).expect(201);
      expect(accepted.body.id).toBe(reviewId);
      const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
      expect(project.applicantAddress).toBe('Izmišljena 1, 11000 Beograd');
      expect(accepted.body.suggestions[0]).toMatchObject({ status: 'ACCEPTED', appliedReference: `project/${projectId}#applicantAddress` });

      await http().post(`/api/ai-suggestions/${suggestions[1].id}/accept`).set(asUser).expect(201);
      const fact = await prisma.fact.findFirstOrThrow({ where: { projectId, statement: 'Panel ima stepenaste ivice.' } });
      expect(fact).toMatchObject({
        kind: 'USER_STATEMENT',
        sourceType: 'USER',
        sourceReference: `ai-suggestion:${suggestions[1].id}`,
        verified: false,
        createdByActor: 'USER',
        category: 'PRODUCT',
      });

      await http().post(`/api/ai-suggestions/${suggestions[2].id}/reject`).set(asUser).expect(201);
      const question = await prisma.openQuestion.findFirst({ where: { projectId, text: 'Da li podnosilac ima zastupnika?' } });
      expect(question).toBeNull();

      const decisions = await http().get(`/api/projects/${projectId}/decisions`).expect(200);
      const titles = decisions.body.map((d: { title: string }) => d.title);
      expect(titles.some((t: string) => t.startsWith('Prihvaćen AI predlog'))).toBe(true);
      expect(titles.some((t: string) => t.startsWith('Odbijen AI predlog'))).toBe(true);
    });

    it('decides each suggestion only once', async () => {
      await http().post(`/api/ai-suggestions/${suggestions[0].id}/accept`).set(asUser).expect(409);
      await http().post(`/api/ai-suggestions/${suggestions[2].id}/accept`).set(asUser).expect(409);
      await http().post(`/api/ai-suggestions/00000000-0000-0000-0000-000000000000/accept`).set(asUser).expect(404);
    });

    it('sends a byte-identical stable prefix on the next call and records the cache read', async () => {
      mock.answer(fakeMessage({ text: okResponse({ suggestions: [], openQuestions: [] }), usage: { cacheRead: 20000, input: 900 } }));
      const res = await http().post(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(201);
      expect(res.body.cacheReadTokens).toBe(20000);
      expect(mock.requests[0].system).toEqual(mock.requests[0].system);
      const first = await http().get(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).expect(200);
      expect(first.body).toHaveLength(2);
      expect(first.body[0].id).toBe(res.body.id);

      const usage = await http().get(`/api/projects/${projectId}/ai-usage`).expect(200);
      expect(usage.body).toMatchObject({ calls: 2, callsToday: 2, maxCallsPerDay: 50, cacheReadTokens: 20000, cacheCreationTokens: 20000 });
      expect(usage.body.estimatedCostUsd).toBeGreaterThan(0);
    });

    it('keeps the stable prefix identical between two calls (prompt-cache precondition)', async () => {
      mock.answer(fakeMessage({ text: okResponse({ suggestions: [], openQuestions: [] }) }));
      await http().post(`/api/projects/${projectId}/steps/PRODUCT_INTERVIEW/ai-reviews`).set(asUser).expect(201);
      mock.answer(fakeMessage({ text: okResponse({ suggestions: [], openQuestions: [] }) }));
      await http().post(`/api/projects/${projectId}/steps/VISUAL_ANALYSIS/ai-reviews`).set(asUser).expect(201);
      const [a, b] = mock.requests;
      expect(a.system[0].text).toBe(b.system[0].text);
      expect(a.system[1].text).toBe(b.system[1].text);
      expect(a.userText).not.toBe(b.userText);
    });
  });

  describe('step-specific targets', () => {
    let projectId: string;
    beforeAll(async () => {
      projectId = await createProject('Ciljevi po koracima');
    });

    it('updates a design feature as the user\'s statement and drops a previous confirmation', async () => {
      const feature = await http()
        .post(`/api/projects/${projectId}/design-features`)
        .set(asAgent)
        .send({ name: 'Stepenasti profil', kind: 'AI_INFERENCE', sourceType: 'AGENT_INFERENCE', category: 'D_UNCLEAR' })
        .expect(201);
      await http().post(`/api/design-features/${feature.body.id}/confirm`).set(asUser).send({ explicitUserConfirmation: true }).expect(201);

      mock.answer(
        fakeMessage({
          text: okResponse({
            findings: [],
            openQuestions: [],
            suggestions: [
              { target: { entity: 'DesignFeature', id: feature.body.id, field: 'category' }, proposedValue: 'B_MIXED', rationale: 'Profil služi spajanju ali je i vidljiv.', requirementRef: 'MZ-200' },
              { target: { entity: 'DesignFeature', id: feature.body.id, field: 'functionalityRisk' }, proposedValue: 'NEPOSTOJEĆA_VREDNOST', rationale: '', requirementRef: null },
              { target: { entity: 'DesignFeature', id: null, field: 'name' }, proposedValue: 'Zakošenje uglova', rationale: 'Vidi se na renderu.', requirementRef: null },
              { target: { entity: 'DesignFeature', id: '00000000-0000-0000-0000-000000000000', field: 'name' }, proposedValue: 'x', rationale: '', requirementRef: null },
            ],
          }),
        }),
      );
      const res = await http().post(`/api/projects/${projectId}/steps/VISUAL_ANALYSIS/ai-reviews`).set(asUser).expect(201);
      const [category, invalid, created, missing] = res.body.suggestions;
      expect(category.currentValue).toBe('D_UNCLEAR');
      expect(mock.requests[0].userText).toContain(feature.body.id);

      await http().post(`/api/ai-suggestions/${category.id}/accept`).set(asUser).expect(201);
      const updated = await prisma.designFeature.findUniqueOrThrow({ where: { id: feature.body.id } });
      expect(updated).toMatchObject({ category: 'B_MIXED', kind: 'USER_STATEMENT', sourceType: 'USER', verified: false, sourceReference: `ai-suggestion:${category.id}` });

      const bad = await http().post(`/api/ai-suggestions/${invalid.id}/accept`).set(asUser).expect(422);
      expect(bad.body.code).toBe('AI_SUGGESTION_INVALID_VALUE');
      const back = await prisma.aiSuggestion.findUniqueOrThrow({ where: { id: invalid.id } });
      expect(back.status).toBe('PROPOSED');

      await http().post(`/api/ai-suggestions/${created.id}/accept`).set(asUser).expect(201);
      const newFeature = await prisma.designFeature.findFirstOrThrow({ where: { projectId, name: 'Zakošenje uglova' } });
      expect(newFeature).toMatchObject({ kind: 'USER_STATEMENT', sourceType: 'USER', verified: false });

      await http().post(`/api/ai-suggestions/${missing.id}/accept`).set(asUser).expect(404);
    });

    it('adds a description version, a D-1 value, a strategy item and an open question with the user\'s provenance', async () => {
      const sections = await http().get(`/api/projects/${projectId}/application-sections`).expect(200);
      const description = sections.body.find((s: { key: string }) => s.key === 'DESCRIPTION');
      mock.answer(
        fakeMessage({
          text: okResponse({
            findings: [],
            openQuestions: ['Koje boje završnog sloja se traže?'],
            suggestions: [
              { target: { entity: 'ApplicationSection', id: description.id, field: 'content' }, proposedValue: 'Panel pravougaonog oblika sa stepenastim ivicama.', rationale: 'Usklađeno sa karakteristikama.', requirementRef: 'MZ-040' },
            ],
          }),
        }),
      );
      const drafting = await http().post(`/api/projects/${projectId}/steps/DESCRIPTION_DRAFTING/ai-reviews`).set(asUser).expect(201);
      const [content, question] = drafting.body.suggestions;
      await http().post(`/api/ai-suggestions/${content.id}/accept`).set(asUser).expect(201);
      const version = await prisma.draftVersion.findFirstOrThrow({ where: { applicationSectionId: description.id }, orderBy: { versionNumber: 'desc' } });
      expect(version).toMatchObject({ content: 'Panel pravougaonog oblika sa stepenastim ivicama.', createdByActor: 'USER', sourceType: 'USER', sourceReference: `ai-suggestion:${content.id}`, verified: false });
      await http().post(`/api/ai-suggestions/${question.id}/accept`).set(asUser).expect(201);
      const open = await prisma.openQuestion.findFirstOrThrow({ where: { projectId, text: 'Koje boje završnog sloja se traže?' } });
      expect(open).toMatchObject({ stepKey: 'DESCRIPTION_DRAFTING', createdBy: 'USER', sourceType: 'USER', status: 'OPEN', blocking: false });

      mock.answer(
        fakeMessage({
          text: okResponse({
            findings: [],
            openQuestions: [],
            suggestions: [
              { target: { entity: 'D1FieldValue', id: null, field: 'PRODUCT_TITLE' }, proposedValue: 'Fasadni panel', rationale: 'Kratak i stvaran naziv.', requirementRef: 'MZ-063' },
              { target: { entity: 'D1FieldValue', id: null, field: 'NEPOSTOJECE', proposedValue: 'x' }, proposedValue: 'x', rationale: '', requirementRef: null },
            ],
          }),
        }),
      );
      const d1 = await http().post(`/api/projects/${projectId}/steps/D1_FORM_DATA/ai-reviews`).set(asUser).expect(201);
      expect(d1.body.suggestions).toHaveLength(1);
      await http().post(`/api/ai-suggestions/${d1.body.suggestions[0].id}/accept`).set(asUser).expect(201);
      const field = await prisma.d1FieldValue.findUniqueOrThrow({ where: { projectId_fieldKey: { projectId, fieldKey: 'PRODUCT_TITLE' } } });
      expect(field).toMatchObject({ value: 'Fasadni panel', sourceType: 'USER', verified: false });

      mock.answer(
        fakeMessage({
          text: okResponse({
            findings: [],
            openQuestions: [],
            suggestions: [{ target: { entity: 'ProtectionStrategyItem', id: null, field: 'FILING_TYPE' }, proposedValue: 'SINGLE', rationale: 'Jedan predmet zaštite.', requirementRef: 'MZ-120' }],
          }),
        }),
      );
      const strategy = await http().post(`/api/projects/${projectId}/steps/PROTECTION_STRATEGY/ai-reviews`).set(asUser).expect(201);
      await http().post(`/api/ai-suggestions/${strategy.body.suggestions[0].id}/accept`).set(asUser).expect(201);
      const item = await prisma.protectionStrategyItem.findUniqueOrThrow({ where: { projectId_key: { projectId, key: 'FILING_TYPE' } } });
      expect(item).toMatchObject({ value: 'SINGLE', kind: 'USER_STATEMENT', sourceType: 'USER', requirementRefs: 'MZ-120', verified: false });
    });

    it('flags patent terminology that slipped into the answer', async () => {
      mock.answer(fakeMessage({ text: okResponse({ summary: 'Ovo je pronalazak sa tehničkim efektom.', findings: [], suggestions: [], openQuestions: [] }) }));
      const res = await http().post(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(201);
      expect(res.body.terminologyIssues.map((t: { term: string }) => t.term)).toEqual(['pronalazak', 'tehnički efekat']);
    });

    it('refuses a second review of the same step while one is running', async () => {
      let release!: (m: Message) => void;
      mock.queue.push(() => new Promise<Message>((resolve) => (release = resolve)));
      const first = http().post(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).set(asUser);
      const started = first.then((r) => r);
      while (mock.requests.length === 0) await new Promise((r) => setTimeout(r, 5));
      const second = await http().post(`/api/projects/${projectId}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(409);
      expect(second.body.code).toBe('AI_REVIEW_IN_PROGRESS');
      release(fakeMessage({ text: okResponse({ findings: [], suggestions: [], openQuestions: [] }) }));
      expect((await started).status).toBe(201);
    });
  });

  describe('without ANTHROPIC_API_KEY', () => {
    let offApp: INestApplication<App>;
    const offMock = new MockModelClient();
    beforeAll(async () => {
      offApp = await createAiTestApp(new AiConfig({}), offMock);
    });
    afterAll(async () => {
      await offApp.close();
    });

    it('is switched off gracefully: status says so, a review is refused and the network is never touched', async () => {
      const health = await request(offApp.getHttpServer()).get('/api/healthz').expect(200);
      expect(health.body.ai).toBe('not_configured');
      const status = await request(offApp.getHttpServer()).get('/api/ai/status').expect(200);
      expect(status.body).toMatchObject({ configured: false, notConfiguredMessage: 'AI provera nije konfigurisana.' });
      const project = await request(offApp.getHttpServer()).post('/api/projects').set(asUser).send({ name: 'Bez ključa' }).expect(201);
      const res = await request(offApp.getHttpServer()).post(`/api/projects/${project.body.id}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(409);
      expect(res.body.code).toBe('AI_NOT_CONFIGURED');
      expect(offMock.requests).toHaveLength(0);
      const list = await request(offApp.getHttpServer()).get(`/api/projects/${project.body.id}/steps/PROJECT_SETUP/ai-reviews`).expect(200);
      expect(list.body).toEqual([]);
    });
  });

  describe('daily limit', () => {
    let limitedApp: INestApplication<App>;
    const limitedMock = new MockModelClient();
    beforeAll(async () => {
      limitedApp = await createAiTestApp(new AiConfig({ ANTHROPIC_API_KEY: 'sk-test', AI_MAX_CALLS_PER_PROJECT_PER_DAY: '1' }), limitedMock);
    });
    afterAll(async () => {
      await limitedApp.close();
    });

    it('stops at AI_MAX_CALLS_PER_PROJECT_PER_DAY per project', async () => {
      const project = await request(limitedApp.getHttpServer()).post('/api/projects').set(asUser).send({ name: 'Limit' }).expect(201);
      limitedMock.answer(fakeMessage({ text: okResponse({ findings: [], suggestions: [], openQuestions: [] }) }));
      await request(limitedApp.getHttpServer()).post(`/api/projects/${project.body.id}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(201);
      const res = await request(limitedApp.getHttpServer()).post(`/api/projects/${project.body.id}/steps/PROJECT_SETUP/ai-reviews`).set(asUser).expect(409);
      expect(res.body.code).toBe('AI_DAILY_LIMIT_REACHED');
      expect(limitedMock.requests).toHaveLength(1);
    });
  });
});
