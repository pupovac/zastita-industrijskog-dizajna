import { Injectable } from '@nestjs/common';
import { Prisma, StepStatus } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_APPLICATION_SECTIONS } from '../domain/application-sections';
import { FUNCTION_ANALYSIS_QUESTIONS } from '../domain/function-analysis';
import { DEMO_PROJECT_NAME, MOCK_REFERENCE } from '../domain/mock-data';
import { STEP_DEFINITIONS, StepKey } from '../domain/steps';
import { uploadRoot } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_QUESTIONS } from '../projects/default-questions';
import { ResearchImportService } from '../research/research-import.service';
import { PlaceholderView, placeholderSvg } from './placeholder-views';

/**
 * Seeds the separate demo project "[DEMO] EPS fasadni panel – mock podaci" with invented
 * data for all 14 steps, so the whole flow — up to the final package — can be shown
 * without a single real answer.
 *
 * Isolation: the seed only ever deletes and creates projects with `isDemo = true`.
 * Every mock record carries `sourceReference: "MOCK"`; answers and texts are marked "(mock)".
 * The real ZIS sources and matrix are imported as well, because they are not mock data.
 */
const M = MOCK_REFERENCE;
const mock = (text: string) => `(mock) ${text}`;

/** Drafting steps are ready for the user's review; the filing steps are left to walk through. */
const DEMO_STEP_STATUS: Partial<Record<StepKey, StepStatus>> = Object.fromEntries(
  STEP_DEFINITIONS.filter((s) => s.phase === 'DRAFTING').map((s) => [s.key, 'READY_FOR_REVIEW']),
);

@Injectable()
export class DemoSeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly research: ResearchImportService,
  ) {}

  async seed(): Promise<{ projectId: string; removedDemoProjects: number }> {
    const old = await this.prisma.project.findMany({ where: { isDemo: true }, select: { id: true } });
    for (const project of old) {
      await this.prisma.project.delete({ where: { id: project.id } });
      await rm(join(uploadRoot(), project.id), { recursive: true, force: true });
      await rm(join(uploadRoot(), 'generated', project.id), { recursive: true, force: true });
    }

    const project = await this.prisma.project.create({
      data: {
        name: DEMO_PROJECT_NAME,
        isDemo: true,
        productName: mock('Fasadni termoizolacioni panel'),
        productSummary: mock('Izmišljen opis: panel od EPS-a sa nanetim završnim slojem i stepenastim ivicama.'),
        applicantName: 'Demo Fasade d.o.o. (mock)',
        applicantAddress: 'Izmišljena 1, 11000 Beograd (mock)',
        designerName: 'Ana Demić (mock)',
        representativeName: '',
        currentStepKey: 'PROJECT_SETUP',
        steps: {
          create: STEP_DEFINITIONS.map((s, i) => ({
            stepKey: s.key,
            position: i + 1,
            status: DEMO_STEP_STATUS[s.key] ?? 'NOT_STARTED',
          })),
        },
      },
      include: { steps: true },
    });
    const projectId = project.id;

    for (const step of project.steps.filter((s) => s.status !== 'NOT_STARTED')) {
      await this.prisma.stepStatusEvent.create({
        data: {
          projectStepId: step.id,
          fromStatus: 'NOT_STARTED',
          toStatus: step.status,
          actorType: 'SYSTEM',
          reason: 'Demo podaci (mock).',
        },
      });
    }

    await this.research.importInto(projectId);
    await this.prisma.$transaction(async (db) => {
      await this.seedInterview(db, projectId);
      const files = await this.seedFiles(db, projectId);
      await this.seedAnalysis(db, projectId);
      await this.seedSearch(db, projectId);
      await this.seedStrategy(db, projectId);
      await this.seedRepresentations(db, projectId, files);
      await this.seedDraft(db, projectId);
      await this.seedReview(db, projectId);
      await this.seedFiling(db, projectId);
    });
    return { projectId, removedDemoProjects: old.length };
  }

  private async seedInterview(db: Prisma.TransactionClient, projectId: string) {
    const questions = [
      ...DEFAULT_QUESTIONS.map((q) => ({ ...q, answer: mock('Odgovor na početno pitanje.') })),
      {
        stepKey: 'PRODUCT_INTERVIEW' as const,
        interviewGroup: 'A' as const,
        text: 'A1 — Ko je podnosilac prijave: fizičko lice, preduzetnik ili privredno društvo?',
        whyNeeded: 'Određuje polje 1 obrasca D-1 (MZ-146).',
        exampleAnswer: 'Privredno društvo, registrovano.',
        required: true,
        answer: mock('Privredno društvo Demo Fasade d.o.o.'),
      },
      {
        stepKey: 'PRODUCT_INTERVIEW' as const,
        interviewGroup: 'B' as const,
        text: 'B1 — Da li je autor zaposlen kod podnosioca i po kom osnovu podnosilac ima pravo na prijavu?',
        whyNeeded: 'Polja 5 i 6 obrasca D-1 (MZ-142).',
        exampleAnswer: 'Autor je zaposlen; osnov je ugovor o radu.',
        required: true,
        answer: mock('Autor je zaposlena; osnov je ugovor o radu.'),
      },
      {
        stepKey: 'PRODUCT_INTERVIEW' as const,
        interviewGroup: 'G' as const,
        text: 'G1 — Da li je panel, njegov render, fotografija, crtež ili prototip ikada javno objavljen pre podnošenja prijave?',
        whyNeeded: 'VISOK PRIORITET: relevantno za novost i pravo prvenstva.',
        exampleAnswer: 'Ne; prototip je viđen samo uz ugovor o poverljivosti.',
        required: true,
        answer: mock('Nije objavljen. Prototip je prikazan jednom kupcu uz NDA.'),
      },
    ];
    for (const [i, q] of questions.entries()) {
      const { answer, ...data } = q;
      const question = await db.question.create({
        data: { ...data, projectId, position: i + 1, createdByActor: 'SYSTEM' },
      });
      const saved = await db.userAnswer.create({ data: { projectId, questionId: question.id, value: answer } });
      if (q.interviewGroup === 'G') {
        await db.fact.create({
          data: {
            projectId,
            category: 'PRODUCT',
            kind: 'FACT',
            originKind: 'USER_STATEMENT',
            statement: mock('Panel nije javno objavljen pre podnošenja prijave.'),
            sourceType: 'USER',
            sourceReference: M,
            userAnswerId: saved.id,
            verified: true,
            confirmedAt: new Date(),
            confirmedBy: 'USER',
            createdByActor: 'AGENT',
          },
        });
      }
    }
    // A question deferred to filing, added by an agent in a filing step.
    await db.question.create({
      data: {
        projectId,
        stepKey: 'FINAL_PACKAGE',
        position: 1,
        text: mock('Da li podnosilac ima kvalifikovani elektronski sertifikat za e-Prijavu?'),
        whyNeeded: 'Određuje način podnošenja i iznos takse (MZ-083).',
        exampleAnswer: 'Da, sertifikat izdat 2026.',
        deferredToFiling: true,
        createdByActor: 'AGENT',
      },
    });
    await db.fact.create({
      data: {
        projectId,
        category: 'VISUAL',
        kind: 'AI_INFERENCE',
        originKind: 'AI_INFERENCE',
        statement: mock('Prednja površina ima finu zrnastu teksturu.'),
        sourceType: 'AGENT_INFERENCE',
        sourceReference: M,
        confidence: 0.6,
        createdByActor: 'AGENT',
      },
    });
  }

  private async seedFiles(db: Prisma.TransactionClient, projectId: string) {
    const views: { view: PlaceholderView; name: string }[] = [
      { view: 'PERSPECTIVE', name: 'DEMO-1.1-perspektiva.svg' },
      { view: 'FRONT', name: 'DEMO-1.2-pogled-spreda.svg' },
      { view: 'SIDE', name: 'DEMO-1.3-pogled-sa-desne-strane.svg' },
      { view: 'TOP', name: 'DEMO-1.4-pogled-odozgo.svg' },
      { view: 'DETAIL', name: 'DEMO-1.5-detalj-ivice.svg' },
    ];
    await mkdir(join(uploadRoot(), projectId), { recursive: true });
    const files = new Map<PlaceholderView, string>();
    for (const { view, name } of views) {
      const id = randomUUID();
      const content = Buffer.from(placeholderSvg(view), 'utf8');
      const storedPath = join(projectId, `${id}.svg`);
      await writeFile(join(uploadRoot(), storedPath), content);
      await db.uploadedFile.create({
        data: {
          id,
          projectId,
          originalName: name,
          storedPath,
          mimeType: 'image/svg+xml',
          sizeBytes: content.length,
          sha256: createHash('sha256').update(content).digest('hex'),
          role: 'RENDER',
          extractionStatus: 'EXTRACTED',
          extractedText: 'DEMO',
          metadataJson: JSON.stringify({ width: 640, height: 480, mock: true }),
          summary: mock('Izmišljen šematski prikaz panela (SVG) sa oznakom DEMO.'),
          uploadedByActor: 'SYSTEM',
        },
      });
      files.set(view, id);
    }
    return files;
  }

  private async seedAnalysis(db: Prisma.TransactionClient, projectId: string) {
    const white = await db.designVariant.create({
      data: { projectId, name: mock('Bela završna obrada'), sourceType: 'USER', sourceReference: M, verified: true },
    });
    await db.designVariant.create({
      data: { projectId, name: mock('Antracit završna obrada'), sourceType: 'USER', sourceReference: M },
    });
    const features = [
      {
        name: mock('Ukupni pravougaoni oblik i proporcije'),
        category: 'A_VISUAL' as const,
        categoryRationale: mock('Proporcije su izabrane zbog izgleda fasade.'),
        functionalityRisk: 'LOW_RISK' as const,
        riskRationale: mock('Isti rezultat moguć je i drugim proporcijama.'),
        variantId: white.id,
      },
      {
        name: mock('Stepenasti profil na dužim ivicama'),
        category: 'B_MIXED' as const,
        categoryRationale: mock('Profil služi spajanju, ali je njegov izgled biran i estetski; ne izbacuje se automatski.'),
        functionalityRisk: 'NEEDS_FURTHER_REVIEW' as const,
        riskRationale: mock('Deo profila je skriven posle montaže; potrebna provera kod zastupnika (P-10).'),
      },
      {
        name: mock('Unutrašnji preklop za spoj'),
        category: 'C_TECHNICAL' as const,
        categoryRationale: mock('Oblik deluje uslovljen spajanjem.'),
        functionalityRisk: 'HIGH_FUNCTIONAL_DEPENDENCE' as const,
        riskRationale: mock('Mora se reprodukovati tačno radi povezivanja panela.'),
      },
      {
        name: mock('Fina zrnasta tekstura završnog sloja'),
        category: 'A_VISUAL' as const,
        categoryRationale: mock('Tekstura je vizuelni izbor.'),
        functionalityRisk: 'LOW_RISK' as const,
        riskRationale: '',
      },
      {
        name: mock('Zakošenje spoljnih uglova'),
        category: 'D_UNCLEAR' as const,
        categoryRationale: mock('Nije jasno da li je zakošenje proizvodno uslovljeno.'),
        functionalityRisk: 'NEEDS_FURTHER_REVIEW' as const,
        riskRationale: mock('Čeka odgovor iz intervjua (grupa E).'),
      },
    ];
    for (const [i, feature] of features.entries()) {
      const created = await db.designFeature.create({
        data: {
          ...feature,
          projectId,
          description: mock('Opis vidljive karakteristike za demo.'),
          kind: i === 0 ? 'FACT' : 'AI_INFERENCE',
          sourceType: i === 0 ? 'USER' : 'AGENT_INFERENCE',
          sourceReference: M,
          verified: i === 0,
        },
      });
      if (i === 1 || i === 2) {
        for (const [n] of FUNCTION_ANALYSIS_QUESTIONS.entries()) {
          await db.functionAnalysisAnswer.create({
            data: {
              designFeatureId: created.id,
              questionNumber: n + 1,
              answer: mock(`Odgovor na pitanje ${n + 1} za „${feature.name}".`),
              kind: n < 2 ? 'USER_STATEMENT' : 'AI_INFERENCE',
              sourceType: n < 2 ? 'USER' : 'AGENT_INFERENCE',
              sourceReference: M,
            },
          });
        }
      }
    }
  }

  private async seedSearch(db: Prisma.TransactionClient, projectId: string) {
    await db.searchCoverage.createMany({
      data: [
        {
          projectId,
          database: 'ZIS — baza industrijskih dizajna',
          query: 'fasadni panel; termoizolacioni panel; Lokarno 25-01',
          searchedAt: new Date('2026-10-06T09:00:00Z'),
          status: 'COMPLETED',
          resultSummary: mock('Pronađena 2 vizuelno slična dizajna.'),
          sourceType: 'ZIS',
          sourceReference: M,
        },
        {
          projectId,
          database: 'EUIPO DesignView',
          query: 'facade insulation panel',
          status: 'BLOCKED',
          blockedReason: mock('Stranica zahteva interaktivnu proveru; automatsko čitanje nije moguće.'),
          coverageGap: mock('Dizajni registrovani u EU nisu pretraženi.'),
          sourceType: 'AGENT_INFERENCE',
          sourceReference: M,
        },
        {
          projectId,
          database: 'WIPO Global Design Database',
          query: 'interlocking insulation panel',
          status: 'SKIPPED',
          blockedReason: mock('Preskočeno po odluci korisnika od 2026-10-05 jer baza nije bila dostupna.'),
          coverageGap: mock('Međunarodne registracije (Hag) nisu pretražene.'),
          sourceType: 'AGENT_INFERENCE',
          sourceReference: M,
        },
      ],
    });
    await db.priorDesign.createMany({
      data: [
        {
          projectId,
          title: mock('Fasadna ploča sa preklopom'),
          registrationNumber: 'D-0000/2019 (mock)',
          holder: 'Primer Gradnja d.o.o. (mock)',
          country: 'RS',
          designDate: '2019-04-12',
          locarnoClass: '25-01',
          database: 'ZIS — baza industrijskih dizajna',
          similarFeatures: mock('Pravougaoni oblik, preklop na dužoj ivici.'),
          differingFeatures: mock('Bez stepenika; glatka površina.'),
          similarityLevel: 'MEDIUM',
          searchResult: mock('Dizajn je pronađen pretragom po klasi 25-01.'),
          legalConclusion: mock('Moguće je da se razlikuje po ukupnom utisku; nije konačno.'),
          kind: 'AI_INFERENCE',
          sourceType: 'ZIS',
          sourceReference: M,
        },
        {
          projectId,
          title: mock('Dekorativni panel sa reljefom'),
          registrationNumber: 'D-0001/2021 (mock)',
          holder: 'Fasade Primer (mock)',
          country: 'RS',
          designDate: '2021-09-30',
          locarnoClass: '25-01',
          database: 'ZIS — baza industrijskih dizajna',
          similarFeatures: mock('Tekstura završnog sloja.'),
          differingFeatures: mock('Kvadratni format, bez profila ivica.'),
          similarityLevel: 'LOW',
          searchResult: mock('Pronađen pretragom po pojmu „dekorativni fasadni panel".'),
          legalConclusion: '',
          kind: 'AI_INFERENCE',
          sourceType: 'ZIS',
          sourceReference: M,
        },
      ],
    });
  }

  private async seedStrategy(db: Prisma.TransactionClient, projectId: string) {
    const items = [
      {
        key: 'FILING_TYPE' as const,
        value: 'SINGLE',
        details: mock('Jedan predmet zaštite; boje završnog sloja se ne prijavljuju zasebno.'),
        rationale: mock('Varijante se razlikuju samo po boji.'),
        requirementRefs: 'MZ-120, MZ-123',
        verified: true,
      },
      {
        key: 'VARIANT_RESOLUTION' as const,
        value: '',
        details: mock('Prijavljuje se bela varijanta; antracit ostaje za kasniju odluku.'),
        rationale: mock('Prikazi moraju prikazivati isti dizajn.'),
        requirementRefs: 'MZ-124',
        verified: true,
      },
      {
        key: 'DEFERRED_PUBLICATION' as const,
        value: 'NO',
        details: '',
        rationale: mock('Podnosilac ne traži odlaganje.'),
        requirementRefs: 'MZ-130, MZ-132',
        verified: true,
      },
      {
        key: 'PRIORITY_CLAIM' as const,
        value: 'NO',
        details: mock('Nema ranije prijave ni izlaganja na sajmu.'),
        rationale: mock('Grupa G: panel nije javno objavljen.'),
        requirementRefs: 'MZ-161, MZ-162',
        verified: false,
      },
    ];
    for (const item of items) {
      await db.protectionStrategyItem.create({
        data: { ...item, projectId, kind: 'RECOMMENDATION', sourceType: 'AGENT_INFERENCE', sourceReference: M },
      });
    }
    await db.decision.create({
      data: {
        projectId,
        stepKey: 'PROTECTION_STRATEGY',
        title: mock('Strategija zaštite — Vrsta prijave: SINGLE'),
        rationale: mock('Usvojeno u demo podacima.'),
        decidedBy: 'USER',
        sourceType: 'USER',
        sourceReference: M,
      },
    });
  }

  private async seedRepresentations(db: Prisma.TransactionClient, projectId: string, files: Map<PlaceholderView, string>) {
    const plan = [
      { view: 'PERSPECTIVE', viewName: 'Perspektivni prikaz', requirement: 'MANDATORY', feature: 'ukupan oblik i odnos površina', assessment: 'ACCEPTABLE' },
      { view: 'FRONT', viewName: 'Pogled spreda', requirement: 'MANDATORY', feature: 'prednja površina i proporcije', assessment: 'ACCEPTABLE' },
      { view: 'SIDE', viewName: 'Pogled sa desne strane', requirement: 'MANDATORY', feature: 'stepenasti profil ivice', assessment: 'ACCEPTABLE' },
      { view: 'TOP', viewName: 'Pogled odozgo', requirement: 'RECOMMENDED', feature: 'profil gornje ivice', assessment: 'ACCEPTABLE' },
      { view: 'DETAIL', viewName: 'Detalj ivice', requirement: 'RECOMMENDED', feature: 'zakošenje ugla', assessment: 'NEEDS_REWORK' },
    ] as const;
    for (const [i, r] of plan.entries()) {
      await db.representation.create({
        data: {
          projectId,
          uploadedFileId: files.get(r.view) ?? null,
          position: i + 1,
          viewName: r.viewName,
          purpose: mock(`Potreban da prikaže: ${r.feature}.`),
          featureShown: r.feature,
          requirement: r.requirement,
          medium: 'RENDER',
          mediumRationale: mock('Senčeni render bez kota i bez teksta, prema primeru BOCE.'),
          assessment: r.assessment,
          assessmentNote:
            r.assessment === 'ACCEPTABLE' ? mock('Prikaz je čist, bez kota.') : mock('Oznaka detalja (krug) mora biti uklonjena.'),
          sourceType: 'AGENT_INFERENCE',
          sourceReference: M,
          verified: r.requirement === 'MANDATORY',
        },
      });
    }
  }

  private async seedDraft(db: Prisma.TransactionClient, projectId: string) {
    const texts: Record<string, string[]> = {
      TITLE: [mock('Fasadni panel')],
      DESCRIPTION: [
        mock('Prijavljeno je novo oblikovno rešenje fasadnog panela. Panel ima oblik pravougaone ploče.'),
        mock(
          'Prijavljeno je novo oblikovno rešenje fasadnog panela pravougaonog osnovnog oblika (slika 1.1).\n\n' +
            'Prednja površina je ravna, sa finom zrnastom teksturom (slika 1.2). Duže ivice imaju stepenasti profil ' +
            'sa jednim pravougaonim stepenikom (slika 1.3); gornja ivica je ravna (slika 1.4).\n\n' +
            'Novi ukupni izgled čini odnos ravne prednje površine i stepenastih dužih ivica.',
        ),
      ],
      CHARACTERISTIC_FEATURES: [mock('Stepenasti profil dužih ivica; fina zrnasta tekstura prednje površine; proporcija 2 : 1.')],
      PURPOSE: [mock('Panel je namenjen oblaganju spoljnih zidova.')],
      REPRESENTATION_LIST: [
        mock('Slika 1.1 perspektivni prikaz; 1.2 pogled spreda; 1.3 pogled sa desne strane; 1.4 pogled odozgo; 1.5 detalj ivice.'),
      ],
      ATTACHMENT_LIST: [mock('Dva primerka prikaza\nDva primerka opisa\nDokaz o uplati takse')],
    };
    for (const [i, section] of DEFAULT_APPLICATION_SECTIONS.entries()) {
      const created = await db.applicationSection.create({
        data: {
          projectId,
          key: section.key,
          title: section.title,
          position: i + 1,
          required: true,
          confirmed: true,
          verified: true,
          sourceType: 'AGENT_INFERENCE',
          sourceReference: M,
        },
      });
      const versions = texts[section.key];
      for (const [v, content] of versions.entries()) {
        const byUser = v === versions.length - 1 && versions.length > 1;
        await db.draftVersion.create({
          data: {
            applicationSectionId: created.id,
            versionNumber: v + 1,
            content,
            createdByActor: byUser ? 'USER' : 'AGENT',
            sourceType: byUser ? 'USER' : 'AGENT_INFERENCE',
            sourceReference: M,
            verified: v === versions.length - 1,
          },
        });
      }
    }
  }

  private async seedReview(db: Prisma.TransactionClient, projectId: string) {
    const now = new Date();
    await db.reviewIssue.createMany({
      data: [
        {
          projectId,
          stepKey: 'DESCRIPTION_DRAFTING',
          type: 'FINDING',
          severity: 'BLOCKER',
          status: 'RESOLVED',
          checkKey: 'FEATURES_VISIBLE',
          title: mock('Opis je pominjao unutrašnji preklop koji se ne vidi na prikazima'),
          description: mock('Rečenica je uklonjena u verziji 2 opisa.'),
          resolutionNote: mock('Ispravljeno u verziji 2.'),
          resolvedBy: 'AGENT',
          resolvedAt: now,
          createdByActor: 'AGENT',
          sourceReference: M,
        },
        {
          projectId,
          stepKey: 'PRIOR_DESIGN_SEARCH',
          type: 'FINDING',
          severity: 'HIGH',
          status: 'OPEN',
          checkKey: 'NOVELTY',
          title: mock('Novost nije potvrđena: DesignView i WIPO nisu pretraženi'),
          description: mock(
            'Podnosilac svesno nosi ovaj rizik (odluka od 2026-10-05). Preporuka: provera kod registrovanog zastupnika pre podnošenja.',
          ),
          createdByActor: 'AGENT',
          sourceReference: M,
        },
        {
          projectId,
          stepKey: 'VISUAL_ANALYSIS',
          type: 'RISK',
          severity: 'MEDIUM',
          status: 'OPEN',
          checkKey: 'FUNCTION_DICTATED',
          title: mock('Stepenasti profil može biti ocenjen kao uslovljen funkcijom'),
          createdByActor: 'AGENT',
          sourceReference: M,
        },
        {
          projectId,
          stepKey: 'REPRESENTATION_PLAN',
          type: 'FINDING',
          severity: 'LOW',
          status: 'DISMISSED',
          checkKey: 'INSUFFICIENT_VIEWS',
          title: mock('Nedostaje pogled odozdo'),
          resolutionNote: mock('Donja ivica je istovetna gornjoj; korisnik prihvata bez dodatnog prikaza.'),
          resolvedBy: 'USER',
          resolvedAt: now,
          createdByActor: 'AGENT',
          sourceReference: M,
        },
      ],
    });
    await db.agentTask.createMany({
      data: [
        { projectId, stepKey: 'INDEPENDENT_REVIEW', agentName: 'Recenzent', title: mock('17 provera nacrta'), status: 'DONE', resultSummary: mock('4 nalaza.') },
        { projectId, stepKey: 'DESCRIPTION_DRAFTING', agentName: 'Pisac Prijave', title: mock('Nacrt opisa'), status: 'DONE' },
      ],
    });
  }

  private async seedFiling(db: Prisma.TransactionClient, projectId: string) {
    const values: Record<string, string> = {
      APPLICANT: 'Demo Fasade d.o.o., Izmišljena 1, 11000 Beograd; +381 11 000 000; demo@example.invalid (mock)',
      REPRESENTATIVE: 'Ne primenjuje se',
      PRODUCT_TITLE: mock('Fasadni panel'),
      FILING_TYPE: mock('Pojedinačna'),
      AUTHOR: 'Ana Demić (mock)',
      LEGAL_BASIS: mock('Ugovor o radu'),
      PRIORITY: 'Ne primenjuje se',
      DEFERRED_PUBLICATION: 'Ne primenjuje se',
      DISCLAIMER: 'Ne primenjuje se',
      FEES: mock('(a) jedan predmet — iznos prema važećoj tarifi'),
      ATTACHMENTS: mock('Dva primerka prikaza; dva primerka opisa; dokaz o uplati takse'),
      SIGNATURE: mock('Direktor podnosioca'),
    };
    for (const [fieldKey, value] of Object.entries(values)) {
      await db.d1FieldValue.create({
        data: { projectId, fieldKey, value, sourceType: 'USER', sourceReference: M, verified: fieldKey !== 'FEES' },
      });
    }
    await db.openQuestion.createMany({
      data: [
        {
          projectId,
          stepKey: 'D1_FORM_DATA',
          text: mock('Ko potpisuje prijavu u ime podnosioca i da li je potreban pečat?'),
          whyNeeded: 'P-02: pečat — NEPROVERENO – potrebno potvrditi sa ZIS-om ili registrovanim zastupnikom.',
          deferredToFiling: true,
          createdBy: 'AGENT',
          sourceReference: M,
        },
        {
          projectId,
          stepKey: 'VISUAL_ANALYSIS',
          text: mock('Kako ZIS tretira stepenaste spojne ivice (P-10)?'),
          whyNeeded: 'Pitanje za registrovanog zastupnika.',
          createdBy: 'AGENT',
          sourceReference: M,
        },
      ],
    });
  }
}
