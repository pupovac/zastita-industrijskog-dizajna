import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

// 1×1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><title>Presek ivice</title><text>Stepenasti spoj</text></svg>',
);

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  let projectId: string;

  const asUser = () => ({ 'X-Actor-Type': 'USER' });
  const asAgent = () => ({ 'X-Actor-Type': 'AGENT' });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/api/projects')
      .set(asUser())
      .send({ name: 'EPS fasadni panel' })
      .expect(201);
    projectId = res.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a project with 14 steps, all not started', async () => {
    const res = await request(app.getHttpServer()).get(`/api/projects/${projectId}/steps`).expect(200);
    expect(res.body).toHaveLength(14);
    expect(res.body[0]).toMatchObject({ stepKey: 'PROJECT_SETUP', position: 1, status: 'NOT_STARTED' });
    expect(res.body[13]).toMatchObject({ stepKey: 'FINAL_APPLICANT_REVIEW', title: 'Završni pregled podnosioca / zastupnika' });
  });

  it('persists every autosaved field immediately', async () => {
    await request(app.getHttpServer())
      .patch(`/api/projects/${projectId}`)
      .set(asUser())
      .send({ applicantName: 'Firma d.o.o.' })
      .expect(200);
    const res = await request(app.getHttpServer()).get(`/api/projects/${projectId}`).expect(200);
    expect(res.body.applicantName).toBe('Firma d.o.o.');
  });

  it('saves interview answers only for the user', async () => {
    const questions = await request(app.getHttpServer())
      .get(`/api/projects/${projectId}/questions?stepKey=PRODUCT_INTERVIEW`)
      .expect(200);
    const q = questions.body[0];
    await request(app.getHttpServer())
      .put(`/api/projects/${projectId}/answers/${q.id}`)
      .set(asAgent())
      .send({ value: 'x' })
      .expect(403);
    await request(app.getHttpServer())
      .put(`/api/projects/${projectId}/answers/${q.id}`)
      .set(asUser())
      .send({ value: 'Fasadni panel' })
      .expect(200);
    const after = await request(app.getHttpServer())
      .get(`/api/projects/${projectId}/questions?stepKey=PRODUCT_INTERVIEW`)
      .expect(200);
    expect(after.body[0].answer.value).toBe('Fasadni panel');
  });

  describe('fact promotion invariant', () => {
    let inferenceId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/facts`)
        .set(asAgent())
        .send({
          kind: 'AI_INFERENCE',
          category: 'VISUAL',
          statement: 'Prednja površina ima finu zrnastu teksturu',
          sourceType: 'AGENT_INFERENCE',
          sourceReference: 'foto-1.jpg',
          confidence: 0.6,
        })
        .expect(201);
      inferenceId = res.body.id;
      expect(res.body).toMatchObject({ verified: false, confirmedUserFact: false });
    });

    it('rejects an agent writing a FACT or a pre-verified record', async () => {
      await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/facts`)
        .set(asAgent())
        .send({ kind: 'FACT', statement: 'x', sourceType: 'AGENT_INFERENCE' })
        .expect(422);
      await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/facts`)
        .set(asAgent())
        .send({ kind: 'AI_INFERENCE', statement: 'x', sourceType: 'AGENT_INFERENCE', verified: true })
        .expect(400);
    });

    it('rejects confirmation by an agent or without an actor header', async () => {
      await request(app.getHttpServer())
        .post(`/api/facts/${inferenceId}/confirm`)
        .set(asAgent())
        .send({ explicitUserConfirmation: true })
        .expect(403);
      await request(app.getHttpServer())
        .post(`/api/facts/${inferenceId}/confirm`)
        .send({ explicitUserConfirmation: true })
        .expect(403);
    });

    it('rejects confirmation without the explicit flag', async () => {
      await request(app.getHttpServer()).post(`/api/facts/${inferenceId}/confirm`).set(asUser()).send({}).expect(400);
    });

    it('promotes on explicit user confirmation and locks the value against agents', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/facts/${inferenceId}/confirm`)
        .set(asUser())
        .send({ explicitUserConfirmation: true })
        .expect(201);
      expect(res.body).toMatchObject({
        kind: 'FACT',
        originKind: 'AI_INFERENCE',
        verified: true,
        confirmedBy: 'USER',
        confirmedUserFact: true,
      });

      await request(app.getHttpServer())
        .patch(`/api/facts/${inferenceId}`)
        .set(asAgent())
        .send({ statement: 'Druga tekstura' })
        .expect(403);

      const edited = await request(app.getHttpServer())
        .patch(`/api/facts/${inferenceId}`)
        .set(asUser())
        .send({ statement: 'Gruba tekstura' })
        .expect(200);
      expect(edited.body).toMatchObject({ verified: false, confirmedUserFact: false, kind: 'AI_INFERENCE' });
    });
  });

  describe('step status', () => {
    it('does not allow skipping a phase', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/steps/ZIS_RESEARCH/transition`)
        .set(asUser())
        .send({ to: 'IN_PROGRESS' })
        .expect(409);
      expect(res.body.code).toBe('PREVIOUS_STEP_NOT_APPROVED');
    });

    it('records the full path and requires the user to approve', async () => {
      const move = (to: string, headers = asUser()) =>
        request(app.getHttpServer())
          .post(`/api/projects/${projectId}/steps/PROJECT_SETUP/transition`)
          .set(headers)
          .send({ to });
      await move('IN_PROGRESS').expect(201);
      await move('READY_FOR_REVIEW', asAgent()).expect(201);
      await move('APPROVED', asAgent()).expect(403);
      const res = await move('APPROVED').expect(201);
      expect(res.body[0].status).toBe('APPROVED');

      const history = await request(app.getHttpServer())
        .get(`/api/projects/${projectId}/steps/PROJECT_SETUP/history`)
        .expect(200);
      expect(history.body.map((e: { toStatus: string }) => e.toStatus)).toEqual([
        'APPROVED',
        'READY_FOR_REVIEW',
        'IN_PROGRESS',
      ]);
    });
  });

  describe('documents and conflicts', () => {
    let photoId: string;
    let drawingId: string;

    it('stores the original and extracts metadata', async () => {
      const photo = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/files`)
        .set(asUser())
        .field('role', 'PHOTO')
        .attach('file', PNG, 'foto.png')
        .expect(201);
      expect(photo.body).toMatchObject({ extractionStatus: 'EXTRACTED', mimeType: 'image/png', role: 'PHOTO' });
      expect(JSON.parse(photo.body.metadataJson)).toMatchObject({ width: 1, height: 1 });
      photoId = photo.body.id;

      const drawing = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/files`)
        .set(asUser())
        .field('role', 'TECHNICAL_DRAWING')
        .attach('file', SVG, 'crtez.svg')
        .expect(201);
      expect(drawing.body.extractedText).toContain('Stepenasti spoj');
      drawingId = drawing.body.id;

      const content = await request(app.getHttpServer()).get(`/api/files/${photoId}/content`).expect(200);
      expect(Buffer.compare(content.body as Buffer, PNG)).toBe(0);
    });

    it('rejects unsupported or disguised files', async () => {
      await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/files`)
        .set(asUser())
        .attach('file', Buffer.from('not a pdf'), 'fake.pdf')
        .expect(422);
    });

    it('flags a conflict, blocks review of the step and leaves the choice to the user', async () => {
      const conflict = await request(app.getHttpServer())
        .post(`/api/projects/${projectId}/conflicts`)
        .set(asAgent())
        .send({ fileAId: photoId, fileBId: drawingId, attribute: 'profil ivice' })
        .expect(201);
      expect(conflict.body).toMatchObject({ type: 'CONFLICT', status: 'OPEN', stepKey: 'DOCUMENT_UPLOAD' });

      const knowledge = await request(app.getHttpServer()).get(`/api/projects/${projectId}/knowledge`).expect(200);
      expect(knowledge.body.missingInfo[0]).toMatchObject({ type: 'CONFLICT', blocking: true });

      await request(app.getHttpServer())
        .post(`/api/review-issues/${conflict.body.id}/resolve-conflict`)
        .set(asAgent())
        .send({ chosenFileId: drawingId })
        .expect(403);

      const resolved = await request(app.getHttpServer())
        .post(`/api/review-issues/${conflict.body.id}/resolve-conflict`)
        .set(asUser())
        .send({ chosenFileId: drawingId, note: 'Crtež je aktuelan' })
        .expect(201);
      expect(resolved.body).toMatchObject({ status: 'RESOLVED', chosenFileId: drawingId, resolvedBy: 'USER' });

      const after = await request(app.getHttpServer()).get(`/api/projects/${projectId}/knowledge`).expect(200);
      expect(after.body.sections.decisions[0]).toMatchObject({ decidedBy: 'USER', reviewIssueId: conflict.body.id });
    });
  });

  it('returns all knowledge panel sections', async () => {
    const res = await request(app.getHttpServer()).get(`/api/projects/${projectId}/knowledge`).expect(200);
    expect(Object.keys(res.body.sections).sort()).toEqual(
      [
        'applicant',
        'applicationFields',
        'decisions',
        'designer',
        'documents',
        'openQuestions',
        'otherFacts',
        'priorDesigns',
        'productFacts',
        'risks',
        'visualFeatures',
        'zisRules',
      ].sort(),
    );
  });
});
