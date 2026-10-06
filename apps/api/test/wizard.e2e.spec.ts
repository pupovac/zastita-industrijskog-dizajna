import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DemoModule } from '../src/demo/demo.module';
import { DemoSeedService } from '../src/demo/demo-seed.service';
import { DEMO_PROJECT_NAME } from '../src/domain/mock-data';
import { STEP_KEYS } from '../src/domain/steps';
import { PrismaService } from '../src/prisma/prisma.service';

const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><text>v1</text></svg>');
const SVG2 = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><text>v2</text></svg>');
const asUser = { 'X-Actor-Type': 'USER' };
const asAgent = { 'X-Actor-Type': 'AGENT' };

/** Collects a binary response body (supertest only buffers text and JSON by default). */
function binary(res: request.Response, callback: (err: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

describe('Wizard API — all 14 steps (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let demoSeed: DemoSeedService;
  const http = () => request(app.getHttpServer());

  async function createProject(name: string): Promise<string> {
    const res = await http().post('/api/projects').set(asUser).send({ name }).expect(201);
    return res.body.id;
  }

  async function move(projectId: string, stepKey: string, to: string, expected = 201) {
    return http().post(`/api/projects/${projectId}/steps/${stepKey}/transition`).set(asUser).send({ to }).expect(expected);
  }

  /** Walks every step before `untilKey` through IN_PROGRESS → READY_FOR_REVIEW → APPROVED. */
  async function approveUpTo(projectId: string, untilKey: string) {
    for (const key of STEP_KEYS.slice(0, STEP_KEYS.indexOf(untilKey as never))) {
      await move(projectId, key, 'IN_PROGRESS');
      await move(projectId, key, 'READY_FOR_REVIEW');
      await move(projectId, key, 'APPROVED');
    }
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule, DemoModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = moduleRef.get(PrismaService);
    demoSeed = moduleRef.get(DemoSeedService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('import of the phase 1–2 research', () => {
    let projectId: string;
    beforeAll(async () => {
      projectId = await createProject('Uvoz istraživanja');
    });

    it('imports sources, the matrix and the report, and is idempotent', async () => {
      const first = await http().post(`/api/projects/${projectId}/research/import`).set(asAgent).expect(201);
      expect(first.body).toMatchObject({ sources: 16, requirements: 128, sourceDocuments: 16 });
      expect(first.body.reportSections).toBeGreaterThanOrEqual(24);

      // A user confirmation must survive a re-import.
      const req = await prisma.sourceRequirement.findFirstOrThrow({ where: { projectId, code: 'MZ-001' } });
      await http().post(`/api/source-requirements/${req.id}/confirm`).set(asUser).send({ explicitUserConfirmation: true }).expect(201);

      const second = await http().post(`/api/projects/${projectId}/research/import`).set(asAgent).expect(201);
      expect(second.body).toEqual(first.body);
      expect(await prisma.source.count({ where: { projectId } })).toBe(16);
      expect(await prisma.sourceRequirement.count({ where: { projectId } })).toBe(128);
      expect(await prisma.researchFinding.count({ where: { projectId } })).toBe(first.body.findings);
      expect(await prisma.requirementCitation.count({ where: { requirement: { projectId } } })).toBe(first.body.citations);
      expect((await prisma.sourceRequirement.findUniqueOrThrow({ where: { id: req.id } })).verified).toBe(true);
    });

    it('keeps status, classification, area and phases of every requirement', async () => {
      const all = await http().get(`/api/projects/${projectId}/requirements`).expect(200);
      const mz001 = all.body.find((r: { code: string }) => r.code === 'MZ-001');
      expect(mz001).toMatchObject({
        status: 'CONFIRMED',
        kind: 'LEGAL_REQUIREMENT',
        areaCode: 'mandatory_documents',
        phases: [{ number: 8 }, { number: 10 }],
      });
      expect(mz001.citations[0].sourceDocument.source.code).toBe('Z-06');

      const unverified = await http().get(`/api/projects/${projectId}/requirements?status=UNVERIFIED`).expect(200);
      expect(unverified.body).toHaveLength(16);
      const discrepancies = await http().get(`/api/projects/${projectId}/requirements?discrepancy=true`).expect(200);
      expect(discrepancies.body.every((r: { code: string }) => r.code.startsWith('NS-'))).toBe(true);
      const fees = await http().get(`/api/projects/${projectId}/requirements?area=fees&phase=10`).expect(200);
      expect(fees.body.length).toBeGreaterThan(0);
      expect(fees.body.every((r: { areaCode: string }) => r.areaCode === 'fees')).toBe(true);
    });

    it('shows the "Rezultati inicijalnog istraživanja" sections and serves local copies', async () => {
      const report = await http().get(`/api/projects/${projectId}/research-report`).expect(200);
      const headings = report.body.map((s: { heading: string }) => s.heading);
      expect(headings).toEqual(expect.arrayContaining(['Šta je industrijski dizajn', 'Šta ZIS traži', 'Sledeći korak']));

      const sources = await http().get(`/api/projects/${projectId}/sources`).expect(200);
      const z05 = sources.body.find((s: { code: string }) => s.code === 'Z-05');
      expect(z05).toMatchObject({ sourceType: 'ZIS', priority: 1, institution: 'ZIS' });
      expect(JSON.parse(z05.localCopiesJson)[0]).toBe('docs/izvori/dokumenti/uputstvo-novo-PDF.pdf');
      expect(z05.documents[0].researchFindings.length).toBeGreaterThan(5);
      const pdf = await http().get(`/api/sources/${z05.id}/local-copies/0`).buffer(true).parse(binary).expect(200);
      expect((pdf.body as Buffer).subarray(0, 5).toString('latin1')).toBe('%PDF-');
      await http().get(`/api/sources/${z05.id}/local-copies/99`).expect(404);
    });
  });

  describe('agent write API and the provenance invariant', () => {
    let projectId: string;
    beforeAll(async () => {
      projectId = await createProject('Agent API');
    });

    it('lets an agent record a feature but never confirm or pre-verify it', async () => {
      const feature = await http()
        .post(`/api/projects/${projectId}/design-features`)
        .set(asAgent)
        .send({
          name: 'Stepenasti profil',
          kind: 'AI_INFERENCE',
          sourceType: 'AGENT_INFERENCE',
          category: 'B_MIXED',
          functionalityRisk: 'NEEDS_FURTHER_REVIEW',
        })
        .expect(201);
      expect(feature.body).toMatchObject({ verified: false, category: 'B_MIXED' });
      await http()
        .post(`/api/projects/${projectId}/design-features`)
        .set(asAgent)
        .send({ name: 'x', kind: 'AI_INFERENCE', sourceType: 'AGENT_INFERENCE', verified: true })
        .expect(400);
      await http()
        .post(`/api/projects/${projectId}/design-features`)
        .set(asAgent)
        .send({ name: 'x', kind: 'FACT', sourceType: 'AGENT_INFERENCE' })
        .expect(422);
      await http()
        .post(`/api/design-features/${feature.body.id}/confirm`)
        .set(asAgent)
        .send({ explicitUserConfirmation: true })
        .expect(403);

      const confirmed = await http()
        .post(`/api/design-features/${feature.body.id}/confirm`)
        .set(asUser)
        .send({ explicitUserConfirmation: true })
        .expect(201);
      expect(confirmed.body).toMatchObject({ verified: true, kind: 'FACT' });
      await http().patch(`/api/design-features/${feature.body.id}`).set(asAgent).send({ name: 'Drugi profil' }).expect(403);
      const edited = await http().patch(`/api/design-features/${feature.body.id}`).set(asUser).send({ name: 'Profil' }).expect(200);
      expect(edited.body).toMatchObject({ verified: false, kind: 'USER_STATEMENT', sourceType: 'USER' });

      const answer = await http()
        .put(`/api/design-features/${feature.body.id}/function-analysis/3`)
        .set(asAgent)
        .send({ answer: 'Oblik nije jedini moguć.' })
        .expect(200);
      expect(answer.body).toMatchObject({ questionNumber: 3, kind: 'AI_INFERENCE', sourceType: 'AGENT_INFERENCE' });
      await http().put(`/api/design-features/${feature.body.id}/function-analysis/9`).set(asAgent).send({ answer: 'x' }).expect(404);
    });

    it('records the search coverage, including what blocked access', async () => {
      await http()
        .post(`/api/projects/${projectId}/search-coverage`)
        .set(asAgent)
        .send({ database: 'DesignView', status: 'BLOCKED', sourceType: 'AGENT_INFERENCE' })
        .expect(422);
      await http()
        .post(`/api/projects/${projectId}/search-coverage`)
        .set(asAgent)
        .send({ database: 'DesignView', status: 'BLOCKED', blockedReason: 'Captcha', sourceType: 'AGENT_INFERENCE' })
        .expect(201);
    });

    it('adopts a confirmed strategy recommendation as a user decision', async () => {
      await http()
        .put(`/api/projects/${projectId}/strategy/FILING_TYPE`)
        .set(asAgent)
        .send({ value: 'MANY' })
        .expect(422);
      await http()
        .put(`/api/projects/${projectId}/strategy/FILING_TYPE`)
        .set(asAgent)
        .send({ value: 'SINGLE', rationale: 'Jedan predmet.', requirementRefs: 'MZ-120, MZ-123' })
        .expect(200);
      await http().post(`/api/projects/${projectId}/strategy/FILING_TYPE/confirm`).set(asAgent).send({ explicitUserConfirmation: true }).expect(403);
      await http().post(`/api/projects/${projectId}/strategy/FILING_TYPE/confirm`).set(asUser).send({ explicitUserConfirmation: true }).expect(201);
      const decisions = await http().get(`/api/projects/${projectId}/decisions`).expect(200);
      expect(decisions.body[0].title).toContain('Vrsta prijave');
      const strategy = await http().get(`/api/projects/${projectId}/strategy`).expect(200);
      expect(strategy.body[0]).toMatchObject({ key: 'FILING_TYPE', item: { verified: true, kind: 'RECOMMENDATION' } });
    });

    it('assigns interview groups and shows filing questions in their step', async () => {
      const q = await http()
        .post(`/api/projects/${projectId}/questions`)
        .set(asAgent)
        .send({ stepKey: 'PRODUCT_INTERVIEW', text: 'G2 — Da li je panel izlagan na sajmu?' })
        .expect(201);
      expect(q.body.interviewGroup).toBe('G');
      const filing = await http()
        .post(`/api/projects/${projectId}/questions`)
        .set(asAgent)
        .send({ stepKey: 'FINAL_APPLICANT_REVIEW', text: 'Ko potpisuje prijavu?' })
        .expect(201);
      expect(filing.body.deferredToFiling).toBe(true);
      const step14 = await http().get(`/api/projects/${projectId}/questions?stepKey=FINAL_APPLICANT_REVIEW`).expect(200);
      expect(step14.body.map((x: { id: string }) => x.id)).toEqual([filing.body.id]);
    });

    it('deletes and replaces uploaded files, keeping the replaced original', async () => {
      const file = await http().post(`/api/projects/${projectId}/files`).set(asUser).field('role', 'RENDER').attach('file', SVG, 'v1.svg').expect(201);
      const view = await http()
        .post(`/api/projects/${projectId}/representations`)
        .set(asAgent)
        .send({ viewName: 'Pogled spreda', requirement: 'MANDATORY', uploadedFileId: file.body.id, sourceType: 'AGENT_INFERENCE' })
        .expect(201);
      expect(view.body.position).toBe(1);
      await http().post(`/api/files/${file.body.id}/replace`).set(asAgent).attach('file', SVG2, 'v2.svg').expect(403);
      const replaced = await http().post(`/api/files/${file.body.id}/replace`).set(asUser).attach('file', SVG2, 'v2.svg').expect(201);
      const views = await http().get(`/api/projects/${projectId}/representations`).expect(200);
      expect(views.body[0].uploadedFileId).toBe(replaced.body.id);
      const current = await http().get(`/api/projects/${projectId}/files`).expect(200);
      expect(current.body.map((f: { id: string }) => f.id)).toEqual([replaced.body.id]);
      const all = await http().get(`/api/projects/${projectId}/files?includeReplaced=true`).expect(200);
      expect(all.body).toHaveLength(2);

      await http().delete(`/api/files/${replaced.body.id}`).set(asAgent).expect(403);
      await http().delete(`/api/files/${replaced.body.id}`).set(asUser).expect(200);
      await http().get(`/api/files/${replaced.body.id}`).expect(404);
    });
  });

  describe('mock data separation', () => {
    it('never accepts mock records into a real project', async () => {
      const projectId = await createProject('Stvarni projekat');
      for (const [path, body] of [
        ['design-features', { name: 'x', kind: 'AI_INFERENCE', sourceType: 'AGENT_INFERENCE', sourceReference: 'MOCK' }],
        ['facts', { kind: 'AI_INFERENCE', statement: 'x', sourceType: 'AGENT_INFERENCE', sourceReference: 'MOCK' }],
        ['review-issues', { severity: 'LOW', title: 'x', sourceReference: 'MOCK' }],
      ] as const) {
        const res = await http().post(`/api/projects/${projectId}/${path}`).set(asAgent).send(body).expect(422);
        expect(res.body.code).toBe('MOCK_DATA_IN_REAL_PROJECT');
      }
    });

    it('seeds only the demo project and leaves real projects untouched', async () => {
      const realId = await createProject('Stvarni projekat sa odgovorom');
      const questions = await http().get(`/api/projects/${realId}/questions`).expect(200);
      await http().put(`/api/projects/${realId}/answers/${questions.body[0].id}`).set(asUser).send({ value: 'Stvaran odgovor' }).expect(200);
      const before = await prisma.project.findUniqueOrThrow({
        where: { id: realId },
        include: { answers: true, questions: true, steps: true, facts: true },
      });

      const first = await demoSeed.seed();
      const second = await demoSeed.seed();
      expect(second.removedDemoProjects).toBe(1);
      expect(await prisma.project.count({ where: { isDemo: true } })).toBe(1);
      await http().get(`/api/projects/${first.projectId}`).expect(404);

      const after = await prisma.project.findUniqueOrThrow({
        where: { id: realId },
        include: { answers: true, questions: true, steps: true, facts: true },
      });
      expect(after).toEqual(before);

      const demo = await prisma.project.findUniqueOrThrow({ where: { id: second.projectId } });
      expect(demo).toMatchObject({ name: DEMO_PROJECT_NAME, isDemo: true });
      const realMock = await Promise.all([
        prisma.fact.count({ where: { sourceReference: 'MOCK', project: { isDemo: false } } }),
        prisma.designFeature.count({ where: { sourceReference: 'MOCK', project: { isDemo: false } } }),
        prisma.reviewIssue.count({ where: { sourceReference: 'MOCK', project: { isDemo: false } } }),
        prisma.d1FieldValue.count({ where: { sourceReference: 'MOCK', project: { isDemo: false } } }),
      ]);
      expect(realMock).toEqual([0, 0, 0, 0]);
      // Every agent-provided record of the demo project is marked as mock (real ZIS imports aside).
      const unmarked = await prisma.designFeature.count({ where: { projectId: demo.id, NOT: { sourceReference: 'MOCK' } } });
      expect(unmarked).toBe(0);
    });
  });

  describe('BLOCKER gate and patent terminology', () => {
    let projectId: string;
    let blockerId: string;

    beforeAll(async () => {
      projectId = await createProject('Provera blokade');
      await approveUpTo(projectId, 'FINAL_PACKAGE');
      const blocker = await http()
        .post(`/api/projects/${projectId}/review-issues`)
        .set(asAgent)
        .send({ stepKey: 'DESCRIPTION_DRAFTING', severity: 'BLOCKER', title: 'Opis i prikazi se ne slažu', checkKey: 'DESCRIPTION_MATCHES_REPRESENTATIONS' })
        .expect(201);
      blockerId = blocker.body.id;
    });

    it('keeps step 13 closed and refuses to generate while a BLOCKER is open', async () => {
      const res = await move(projectId, 'FINAL_PACKAGE', 'IN_PROGRESS', 409);
      expect(res.body.code).toBe('FINAL_PACKAGE_BLOCKED_BY_BLOCKER');
      const gen = await http().post(`/api/projects/${projectId}/package/generate`).set(asAgent).expect(409);
      expect(gen.body.code).toBe('FINAL_PACKAGE_BLOCKED_BY_BLOCKER');
      const steps = await http().get(`/api/projects/${projectId}/steps`).expect(200);
      expect(steps.body.find((s: { stepKey: string }) => s.stepKey === 'FINAL_PACKAGE').blockedByBlockerFindings).toBe(1);
      const pkg = await http().get(`/api/projects/${projectId}/package`).expect(200);
      expect(pkg.body.checklist.find((i: { key: string }) => i.key === 'NO_BLOCKERS').done).toBe(false);
    });

    it('lets only the user dismiss a BLOCKER; resolving it reopens step 13', async () => {
      await http().post(`/api/review-issues/${blockerId}/status`).set(asAgent).send({ status: 'DISMISSED', note: 'x' }).expect(403);
      await http().post(`/api/review-issues/${blockerId}/status`).set(asAgent).send({ status: 'RESOLVED', note: 'Opis ispravljen' }).expect(201);
      await move(projectId, 'FINAL_PACKAGE', 'IN_PROGRESS');
    });

    it('flags patent terminology in a draft and refuses to package it', async () => {
      const sections = await http().get(`/api/projects/${projectId}/application-sections`).expect(200);
      expect(sections.body.map((s: { key: string }) => s.key)).toEqual([
        'TITLE',
        'DESCRIPTION',
        'CHARACTERISTIC_FEATURES',
        'PURPOSE',
        'REPRESENTATION_LIST',
        'ATTACHMENT_LIST',
      ]);
      const description = sections.body[1];
      const draft = await http()
        .put(`/api/application-sections/${description.id}/working-draft`)
        .set(asAgent)
        .send({ content: 'Predmet pronalaska je panel koji rešava tehnički problem.' })
        .expect(200);
      expect(draft.body.terminologyIssues.map((m: { term: string }) => m.term)).toEqual(['pronalazak', 'tehnički problem']);
      const gen = await http().post(`/api/projects/${projectId}/package/generate`).set(asAgent).expect(409);
      expect(gen.body.code).toBe('PATENT_TERMINOLOGY_IN_DRAFT');

      // The agent's autosave updates its own working version; the user's edit starts a new one.
      await http().put(`/api/application-sections/${description.id}/working-draft`).set(asAgent).send({ content: 'Panel pravougaonog oblika.' }).expect(200);
      await http().put(`/api/application-sections/${description.id}/working-draft`).set(asUser).send({ content: 'Panel pravougaonog oblika sa stepenastim ivicama.' }).expect(200);
      const versions = await http().get(`/api/application-sections/${description.id}/versions`).expect(200);
      expect(versions.body.map((v: { versionNumber: number; createdByActor: string }) => [v.versionNumber, v.createdByActor])).toEqual([
        [2, 'USER'],
        [1, 'AGENT'],
      ]);
      const pkg = await http().post(`/api/projects/${projectId}/package/generate`).set(asAgent).expect(201);
      expect(pkg.body.gate).toMatchObject({ canGenerate: true, isFinal: false });
      expect(pkg.body.documents.every((d: { versions: unknown[] }) => d.versions.length === 1)).toBe(true);
    });
  });

  describe('the whole demo flow through the API', () => {
    let projectId: string;

    beforeAll(async () => {
      projectId = (await demoSeed.seed()).projectId;
    });

    it('has data for every step', async () => {
      const [features, priors, coverage, strategy, views, sections, findings, d1, report] = await Promise.all(
        ['design-features', 'prior-designs', 'search-coverage', 'strategy', 'representations', 'application-sections', 'review-issues', 'd1', 'research-report'].map(
          (path) => http().get(`/api/projects/${projectId}/${path}`).expect(200),
        ),
      );
      expect(features.body.length).toBeGreaterThan(0);
      expect(priors.body.length).toBeGreaterThan(0);
      expect(coverage.body.map((c: { status: string }) => c.status)).toEqual(['COMPLETED', 'BLOCKED', 'SKIPPED']);
      expect(strategy.body).toHaveLength(4);
      expect(views.body.every((v: { uploadedFileId: string | null }) => v.uploadedFileId)).toBe(true);
      expect(sections.body.find((s: { key: string }) => s.key === 'DESCRIPTION').versions).toHaveLength(2);
      expect(findings.body[0]).toMatchObject({ severity: 'HIGH', status: 'OPEN' });
      expect(d1.body.every((f: { missing: boolean }) => !f.missing)).toBe(true);
      expect(report.body.length).toBeGreaterThan(0);
    });

    it('walks steps 1–14 and generates the DOCX and PDF package with a DEMO watermark', async () => {
      for (const key of STEP_KEYS.slice(0, 11)) await move(projectId, key, 'APPROVED');
      for (const to of ['IN_PROGRESS', 'READY_FOR_REVIEW', 'APPROVED']) await move(projectId, 'D1_FORM_DATA', to);
      await move(projectId, 'FINAL_PACKAGE', 'IN_PROGRESS');

      const status = await http().get(`/api/projects/${projectId}/package`).expect(200);
      expect(status.body.checklist).toHaveLength(16);
      expect(status.body.checklist.filter((i: { done: boolean }) => !i.done)).toEqual([]);

      const generated = await http().post(`/api/projects/${projectId}/package/generate`).set(asAgent).expect(201);
      expect(generated.body.gate).toMatchObject({ isFinal: true });
      expect(generated.body.documents).toHaveLength(9);
      const latest = (type: string) =>
        generated.body.documents.find((d: { type: string }) => d.type === type).versions[0] as { id: string; isDemo: boolean; versionNumber: number };
      expect(latest('PACKAGE_PDF')).toMatchObject({ isDemo: true, versionNumber: 1 });

      const pdf = await http().get(`/api/generated-documents/${latest('PACKAGE_PDF').id}/content`).buffer(true).parse(binary).expect(200);
      const pdfText = (await pdfParse(pdf.body as Buffer)).text;
      expect(pdfText).toContain('DEMO');
      expect(pdfText).toContain('ne garantuje');
      expect(pdfText).toContain('Opis industrijskog dizajna');

      const docx = await http().get(`/api/generated-documents/${latest('PACKAGE_DOCX').id}/content`).buffer(true).parse(binary).expect(200);
      const docxText = (await mammoth.extractRawText({ buffer: docx.body as Buffer })).value;
      expect(docxText).toContain('DEMO – izmišljeni podaci, ne koristiti za prijavu');
      expect(docxText).toContain('prijavu ne podnosi automatski');

      const checklist = await http().get(`/api/generated-documents/${latest('FILING_CHECKLIST').id}/content`).expect(200);
      expect(checklist.text).toContain('[x] | Nema BLOCKER problema');

      await move(projectId, 'FINAL_PACKAGE', 'READY_FOR_REVIEW');
      await move(projectId, 'FINAL_PACKAGE', 'APPROVED');
      await move(projectId, 'FINAL_APPLICANT_REVIEW', 'IN_PROGRESS');
      await http().post(`/api/projects/${projectId}/signoffs`).set(asAgent).send({ reviewerName: 'x', role: 'APPLICANT' }).expect(403);
      const signoff = await http()
        .post(`/api/projects/${projectId}/signoffs`)
        .set(asUser)
        .send({ reviewerName: 'Ana Demić (mock)', role: 'APPLICANT', note: 'Pregledano.' })
        .expect(201);
      expect(signoff.body.packageVersion).toBe(1);
      await move(projectId, 'FINAL_APPLICANT_REVIEW', 'READY_FOR_REVIEW');
      const done = await move(projectId, 'FINAL_APPLICANT_REVIEW', 'APPROVED');
      expect(done.body.every((s: { status: string }) => s.status === 'APPROVED')).toBe(true);

      // Every generation adds a version; earlier versions stay available.
      const again = await http().post(`/api/projects/${projectId}/package/generate`).set(asAgent).expect(201);
      expect(again.body.latestVersion).toBe(2);
      expect(again.body.documents.every((d: { versions: unknown[] }) => d.versions.length === 2)).toBe(true);
    });
  });
});
