import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { DEFAULT_QUESTIONS } from '../src/projects/default-questions';

const asUser = { 'X-Actor-Type': 'USER' };
const asAgent = { 'X-Actor-Type': 'AGENT' };

/** FUZZ-144: rich example answers, refresh of default questions on existing projects, template markers. */
describe('Interview guidance (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createProject(name: string): Promise<string> {
    const res = await http().post('/api/projects').set(asUser).send({ name }).expect(201);
    return res.body.id;
  }

  it('creates a project with the question bank: hints as arrays, example answers with [markers], G marked high priority', async () => {
    const projectId = await createProject('Banka pitanja');
    const res = await http().get(`/api/projects/${projectId}/questions?stepKey=PRODUCT_INTERVIEW`).expect(200);
    expect(res.body).toHaveLength(DEFAULT_QUESTIONS.length);
    for (const q of res.body) {
      expect(q.defaultKey).toBeTruthy();
      expect(Array.isArray(q.includeHints) && q.includeHints.length).toBeGreaterThan(0);
      expect(Array.isArray(q.avoidHints) && q.avoidHints.length).toBeGreaterThan(0);
      expect(q.exampleAnswer).toMatch(/\[[^\]]+\]/);
      expect(q).not.toHaveProperty('includeHintsJson');
    }
    const g = res.body.filter((q: { interviewGroup: string }) => q.interviewGroup === 'G');
    expect(g.length).toBeGreaterThan(0);
    expect(g.every((q: { highPriority: boolean }) => q.highPriority)).toBe(true);
  });

  describe('POST /projects/:id/questions/refresh-defaults', () => {
    let projectId: string;
    let legacyId: string;
    let answeredId: string;

    beforeAll(async () => {
      projectId = await createProject('Postojeći projekat');
      // Simulate a project created before this release: one-sentence examples, no keys, no hints,
      // and no G question — exactly the state of the production projects.
      await prisma.question.deleteMany({ where: { projectId } });
      const legacy = await prisma.question.create({
        data: {
          projectId,
          stepKey: 'PRODUCT_INTERVIEW',
          position: 1,
          interviewGroup: 'D',
          text: 'Kako izgleda vidljiva prednja površina panela (tekstura, završna obrada, boja)?',
          whyNeeded: 'Spoljašnji izgled je ono što se beleži.',
          exampleAnswer: 'Fina zrnasta tekstura, mat završni sloj, svetlosiva boja.',
          required: true,
        },
      });
      legacyId = legacy.id;
      const answered = await prisma.question.create({
        data: {
          projectId,
          stepKey: 'PRODUCT_INTERVIEW',
          position: 2,
          interviewGroup: 'E',
          text: 'Kako izgledaju ivice i spojevi panela posmatrano spolja?',
          exampleAnswer: 'Stepenasti profil na dužim ivicama, sa ravnim kratkim ivicama.',
          required: true,
        },
      });
      answeredId = answered.id;
      await http()
        .put(`/api/projects/${projectId}/answers/${answeredId}`)
        .set(asUser)
        .send({ value: 'Duže ivice su stepenaste sa dva stepenika; kraće su ravne.' })
        .expect(200);
    });

    it('is reserved for the user', async () => {
      const res = await http().post(`/api/projects/${projectId}/questions/refresh-defaults`).set(asAgent).expect(403);
      expect(res.body.code).toBe('REFRESH_REQUIRES_USER');
    });

    it('updates guidance of legacy questions by wording, adds missing bank questions, keeps answers', async () => {
      const res = await http().post(`/api/projects/${projectId}/questions/refresh-defaults`).set(asUser).expect(201);
      expect(res.body).toMatchObject({ updated: 2, added: DEFAULT_QUESTIONS.length - 2, unchanged: 0 });

      const questions = await http().get(`/api/projects/${projectId}/questions?stepKey=PRODUCT_INTERVIEW`).expect(200);
      expect(questions.body).toHaveLength(DEFAULT_QUESTIONS.length);

      const legacy = questions.body.find((q: { id: string }) => q.id === legacyId);
      expect(legacy).toMatchObject({ defaultKey: 'front-surface', position: 1 });
      expect(legacy.exampleAnswer).toMatch(/\[/);
      expect(legacy.includeHints.length).toBeGreaterThan(0);
      expect(legacy.text).toBe('Kako izgleda vidljiva prednja površina panela (tekstura, završna obrada, boja)?');

      // The already given answer is byte-identical after the refresh.
      const answered = questions.body.find((q: { id: string }) => q.id === answeredId);
      expect(answered.defaultKey).toBe('edges-joints');
      expect(answered.answer.value).toBe('Duže ivice su stepenaste sa dva stepenika; kraće su ravne.');
      expect(await prisma.userAnswer.count({ where: { projectId } })).toBe(1);

      // New questions come after the existing ones and the G question is high priority.
      const added = questions.body.filter((q: { id: string }) => ![legacyId, answeredId].includes(q.id));
      expect(Math.min(...added.map((q: { position: number }) => q.position))).toBe(3);
      expect(added.find((q: { defaultKey: string }) => q.defaultKey === 'prior-disclosure')).toMatchObject({ highPriority: true, interviewGroup: 'G' });
    });

    it('is idempotent: a second run changes nothing', async () => {
      const res = await http().post(`/api/projects/${projectId}/questions/refresh-defaults`).set(asUser).expect(201);
      expect(res.body).toMatchObject({ updated: 0, added: 0, unchanged: DEFAULT_QUESTIONS.length });
      expect(await prisma.question.count({ where: { projectId } })).toBe(DEFAULT_QUESTIONS.length);
    });
  });

  it('refuses to confirm a fact whose answer still contains template markers', async () => {
    const projectId = await createProject('Oznake u odgovoru');
    const questions = await http().get(`/api/projects/${projectId}/questions?stepKey=PRODUCT_INTERVIEW`).expect(200);
    const question = questions.body[0];
    const answer = await http()
      .put(`/api/projects/${projectId}/answers/${question.id}`)
      .set(asUser)
      .send({ value: 'Panel je [pravougaona] ploča.' })
      .expect(200);
    const fact = await http()
      .post(`/api/projects/${projectId}/facts`)
      .set(asAgent)
      .send({ kind: 'AI_INFERENCE', sourceType: 'AGENT_INFERENCE', statement: 'Panel je pravougaon.', userAnswerId: answer.body.id })
      .expect(201);

    const blocked = await http().post(`/api/facts/${fact.body.id}/confirm`).set(asUser).send({ explicitUserConfirmation: true }).expect(409);
    expect(blocked.body.code).toBe('ANSWER_HAS_PLACEHOLDERS');

    await http().put(`/api/projects/${projectId}/answers/${question.id}`).set(asUser).send({ value: 'Panel je pravougaona ploča.' }).expect(200);
    const confirmed = await http().post(`/api/facts/${fact.body.id}/confirm`).set(asUser).send({ explicitUserConfirmation: true }).expect(201);
    expect(confirmed.body).toMatchObject({ verified: true, kind: 'FACT' });
  });
});
