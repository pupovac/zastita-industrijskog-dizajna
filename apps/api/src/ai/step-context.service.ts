import { Injectable } from '@nestjs/common';
import { D1_FIELDS } from '../domain/d1-fields';
import { DomainError } from '../domain/domain-error';
import { isConfirmedUserFact } from '../domain/fact-rules';
import { StepGuide } from '../domain/step-guides';
import { StepKey } from '../domain/steps';
import { PrismaService } from '../prisma/prisma.service';
import { StepContextSections } from './ai-prompt';

/** Per-document cap so one huge PDF cannot crowd out the rest of the step. */
const MAX_DOCUMENT_CHARS = 60_000;

export interface StepContext extends StepContextSections {
  /** Short description of what was sent, for the review record. */
  summary: string;
  /** Matrix codes known in this project (to resolve references in the answer). */
  knownCodes: Set<string>;
  /** Snapshot of target values, so suggestions can show current vs. proposed. */
  currentValue: (entity: string, id: string | null, field: string) => string;
}

const json = (value: unknown) => JSON.stringify(value, null, 1);

/**
 * Collects what the model sees for one step: the project, the confirmed facts, the
 * entities of the step, the most relevant matrix codes, the step's open questions and
 * (for the steps that work on documents) the extracted text of the uploaded files.
 * Binary files are never sent. If the text is too long, the user is told — nothing is cut silently.
 */
@Injectable()
export class StepContextService {
  constructor(private readonly prisma: PrismaService) {}

  async build(projectId: string, stepKey: StepKey, guide: StepGuide, maxChars: number): Promise<StepContext> {
    const where = { projectId };
    const [project, steps, facts, requirements, openQuestions, files, reviewIssues] = await Promise.all([
      this.prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
      this.prisma.projectStep.findMany({ where, orderBy: { position: 'asc' } }),
      this.prisma.fact.findMany({ where, orderBy: { createdAt: 'asc' } }),
      this.prisma.sourceRequirement.findMany({ where, select: { code: true, areaCode: true, phasesJson: true } }),
      this.prisma.openQuestion.findMany({ where: { ...where, status: 'OPEN' }, orderBy: { createdAt: 'asc' } }),
      this.prisma.uploadedFile.findMany({ where: { ...where, replacedById: null }, orderBy: { createdAt: 'asc' } }),
      this.prisma.reviewIssue.findMany({ where: { ...where, status: 'OPEN' }, orderBy: { createdAt: 'asc' } }),
    ]);

    const sections: { heading: string; body: string }[] = [];
    const snapshot = new Map<string, string>();
    const remember = (entity: string, id: string | null, field: string, value: unknown) =>
      snapshot.set(`${entity}|${id ?? ''}|${field}`, value === null || value === undefined ? '' : String(value));

    const { id: _id, createdAt: _c, updatedAt: _u, ...projectFields } = project;
    sections.push({ heading: 'Projekat', body: json(projectFields) });
    for (const [field, value] of Object.entries(projectFields)) remember('Project', null, field, value);

    const step = steps.find((s) => s.stepKey === stepKey);
    sections.push({
      heading: 'Status koraka',
      body: json({
        status: step?.status,
        blockedReason: step?.blockedReason,
        previousSteps: steps.filter((s) => s.position < (step?.position ?? 0)).map((s) => `${s.stepKey}: ${s.status}`),
      }),
    });

    const confirmed = facts.filter((f) => f.verified);
    sections.push({
      heading: 'Potvrđene činjenice korisnika (verified = true)',
      body: json(
        confirmed.map((f) => ({
          id: f.id,
          category: f.category,
          kind: f.kind,
          statement: f.statement,
          value: f.value,
          confirmedUserFact: isConfirmedUserFact(f),
        })),
      ),
    });
    const unconfirmed = facts.filter((f) => !f.verified);
    if (unconfirmed.length) {
      sections.push({
        heading: 'Nepotvrđene izjave i AI zaključci (nisu činjenice)',
        body: json(unconfirmed.map((f) => ({ id: f.id, category: f.category, kind: f.kind, statement: f.statement, value: f.value, sourceType: f.sourceType }))),
      });
    }
    for (const f of facts) {
      remember('Fact', f.id, 'statement', f.statement);
      remember('Fact', f.id, 'value', f.value);
    }

    const counts: string[] = [`${confirmed.length} potvrđenih činjenica`];
    await this.addStepEntities(projectId, stepKey, sections, remember, counts);

    const relevant = requirements
      .filter((r) => r.code)
      .filter((r) => {
        const phases = (JSON.parse(r.phasesJson) as { number: number }[]).map((p) => p.number);
        return guide.areaCodes.includes(r.areaCode) || phases.some((p) => guide.researchPhases.includes(p));
      })
      .map((r) => r.code!)
      .sort((a, b) => a.localeCompare(b, 'en'));
    sections.push({
      heading: 'Zahtevi iz matrice koji su najrelevantniji za ovaj korak (oznake; pun tekst je u sistemskom delu)',
      body: relevant.length ? relevant.join(', ') : 'Matrica još nije uvezena u ovaj projekat.',
    });
    counts.push(`${relevant.length} relevantnih zahteva`);

    const stepQuestions = openQuestions.filter((q) => q.stepKey === stepKey);
    sections.push({
      heading: 'Otvorena pitanja ovog koraka',
      body: json(stepQuestions.map((q) => ({ id: q.id, text: q.text, whyNeeded: q.whyNeeded, blocking: q.blocking }))),
    });
    const stepIssues = reviewIssues.filter((i) => i.stepKey === stepKey);
    if (stepIssues.length) {
      sections.push({
        heading: 'Otvoreni nalazi, rizici i konflikti ovog koraka',
        body: json(stepIssues.map((i) => ({ id: i.id, type: i.type, severity: i.severity, title: i.title, description: i.description }))),
      });
    }

    sections.push({
      heading: 'Dostavljeni dokumenti',
      body: json(
        files.map((f) => ({
          id: f.id,
          name: f.originalName,
          role: f.role,
          mimeType: f.mimeType,
          extractionStatus: f.extractionStatus,
          summary: f.summary,
          textChars: f.extractedText?.length ?? 0,
        })),
      ),
    });

    let documentChars = 0;
    if (guide.includeDocumentText) {
      const texts = files.filter((f) => f.extractedText?.trim());
      const tooLong = texts.filter((f) => f.extractedText!.length > MAX_DOCUMENT_CHARS);
      if (tooLong.length) {
        throw new DomainError(
          'AI_CONTEXT_TOO_LARGE',
          `Izvučeni tekst sledećih dokumenata je predugačak za jednu AI proveru (više od ${MAX_DOCUMENT_CHARS.toLocaleString('sr-Latn-RS')} znakova): ${tooLong
            .map((f) => f.originalName)
            .join(', ')}. Tekst nije skraćen automatski; podelite dokument ili ga privremeno uklonite iz projekta.`,
        );
      }
      for (const f of texts) {
        documentChars += f.extractedText!.length;
        sections.push({ heading: `Tekst dokumenta „${f.originalName}" (${f.role})`, body: f.extractedText!.trim() });
      }
    }

    const totalChars = sections.reduce((n, s) => n + s.heading.length + s.body.length, 0);
    if (totalChars > maxChars) {
      throw new DomainError(
        'AI_CONTEXT_TOO_LARGE',
        `Stanje koraka je preveliko za jednu AI proveru (${totalChars.toLocaleString('sr-Latn-RS')} znakova, dozvoljeno ${maxChars.toLocaleString('sr-Latn-RS')}). Ništa nije skraćeno automatski. Smanjite broj ili veličinu dokumenata u projektu ili povećajte AI_MAX_CONTEXT_CHARS.`,
      );
    }
    counts.push(`${files.length} dokumenata${documentChars ? ` (${documentChars.toLocaleString('sr-Latn-RS')} znakova teksta)` : ''}`);

    return {
      sections,
      summary: `Korak ${stepKey}: ${counts.join(', ')}; ${totalChars.toLocaleString('sr-Latn-RS')} znakova konteksta.`,
      knownCodes: new Set(requirements.map((r) => r.code).filter((c): c is string => Boolean(c))),
      currentValue: (entity, id, field) => snapshot.get(`${entity}|${id ?? ''}|${field}`) ?? '',
    };
  }

  /** The entities each step works on. */
  private async addStepEntities(
    projectId: string,
    stepKey: StepKey,
    sections: { heading: string; body: string }[],
    remember: (entity: string, id: string | null, field: string, value: unknown) => void,
    counts: string[],
  ) {
    const where = { projectId };
    switch (stepKey) {
      case 'PRODUCT_INTERVIEW':
      case 'PROJECT_SETUP':
      case 'FINAL_APPLICANT_REVIEW':
      case 'FINAL_PACKAGE':
      case 'D1_FORM_DATA': {
        const questions = await this.prisma.question.findMany({
          where: { ...where, stepKey: stepKey === 'PROJECT_SETUP' ? 'PRODUCT_INTERVIEW' : stepKey },
          orderBy: [{ interviewGroup: 'asc' }, { position: 'asc' }],
          include: { answers: { where } },
        });
        if (questions.length) {
          sections.push({
            heading: 'Pitanja i odgovori korisnika',
            body: json(
              questions.map((q) => ({
                group: q.interviewGroup,
                question: q.text,
                required: q.required,
                deferredToFiling: q.deferredToFiling,
                answer: q.answers[0]?.value ?? null,
                attachmentFileId: q.answers[0]?.attachmentFileId ?? null,
              })),
            ),
          });
          counts.push(`${questions.filter((q) => q.answers[0]?.value?.trim()).length}/${questions.length} odgovorenih pitanja`);
        }
        if (stepKey === 'D1_FORM_DATA' || stepKey === 'FINAL_PACKAGE' || stepKey === 'FINAL_APPLICANT_REVIEW') {
          const values = await this.prisma.d1FieldValue.findMany({ where });
          const strategy = await this.prisma.protectionStrategyItem.findMany({ where });
          sections.push({
            heading: 'Polja obrasca D-1',
            body: json(
              D1_FIELDS.map((f) => {
                const stored = values.find((v) => v.fieldKey === f.key);
                remember('D1FieldValue', null, f.key, stored?.value ?? '');
                return {
                  fieldKey: f.key,
                  number: f.number,
                  label: f.label,
                  requirementRefs: f.requirementRefs,
                  conditional: f.conditional,
                  deferredToFiling: stored?.deferredToFiling ?? f.deferredToFiling,
                  value: stored?.value ?? '',
                  notes: stored?.notes ?? '',
                  verified: stored?.verified ?? false,
                };
              }),
            ),
          });
          sections.push({
            heading: 'Odluke strategije zaštite',
            body: json(strategy.map((s) => ({ key: s.key, value: s.value, details: s.details, rationale: s.rationale, requirementRefs: s.requirementRefs, verified: s.verified }))),
          });
          counts.push(`${values.filter((v) => v.value.trim()).length}/${D1_FIELDS.length} polja D-1`);
        }
        if (stepKey === 'FINAL_PACKAGE' || stepKey === 'FINAL_APPLICANT_REVIEW') {
          const documents = await this.prisma.generatedDocument.findMany({ where, orderBy: [{ type: 'asc' }, { versionNumber: 'desc' }] });
          const signoffs = await this.prisma.finalSignoff.findMany({ where });
          sections.push({ heading: 'Generisani dokumenti paketa', body: json(documents.map((d) => ({ type: d.type, version: d.versionNumber, isFinal: d.isFinal, missing: JSON.parse(d.missingJson) }))) });
          sections.push({ heading: 'Potvrde pregleda', body: json(signoffs.map((s) => ({ role: s.role, reviewerName: s.reviewerName, packageVersion: s.packageVersion, note: s.note }))) });
        }
        return;
      }
      case 'ZIS_RESEARCH':
      case 'REQUIREMENTS_SUMMARY': {
        const [sources, findings, unverified] = await Promise.all([
          this.prisma.source.findMany({ where, orderBy: { priority: 'asc' } }),
          this.prisma.researchFinding.count({ where }),
          this.prisma.sourceRequirement.findMany({ where: { ...where, status: 'UNVERIFIED' }, select: { code: true, openItemsJson: true } }),
        ]);
        sections.push({
          heading: 'Uvezeni izvori',
          body: json(sources.map((s) => ({ code: s.code, name: s.name, institution: s.institution, documentVersion: s.documentVersion, accessedAt: s.accessedAt }))),
        });
        sections.push({
          heading: 'Zahtevi sa statusom NEPROVERENO i otvorene provere',
          body: json(unverified.map((r) => ({ code: r.code, openItems: JSON.parse(r.openItemsJson) }))),
        });
        counts.push(`${sources.length} izvora`, `${findings} nalaza istraživanja`);
        return;
      }
      case 'DOCUMENT_UPLOAD':
        return; // The document list and texts are always part of the context.
      case 'VISUAL_ANALYSIS': {
        const [variants, features] = await Promise.all([
          this.prisma.designVariant.findMany({ where, orderBy: { createdAt: 'asc' } }),
          this.prisma.designFeature.findMany({ where, orderBy: { createdAt: 'asc' }, include: { functionAnalysis: { orderBy: { questionNumber: 'asc' } } } }),
        ]);
        sections.push({ heading: 'Varijante dizajna', body: json(variants.map((v) => ({ id: v.id, name: v.name, description: v.description, verified: v.verified }))) });
        sections.push({
          heading: 'Vizuelne karakteristike (DesignFeature)',
          body: json(
            features.map((f) => {
              for (const field of ['name', 'description', 'category', 'categoryRationale', 'functionalityRisk', 'riskRationale'] as const) {
                remember('DesignFeature', f.id, field, f[field]);
              }
              return {
                id: f.id,
                variantId: f.variantId,
                name: f.name,
                description: f.description,
                category: f.category,
                categoryRationale: f.categoryRationale,
                functionalityRisk: f.functionalityRisk,
                riskRationale: f.riskRationale,
                kind: f.kind,
                sourceType: f.sourceType,
                verified: f.verified,
                functionAnalysis: f.functionAnalysis.map((a) => ({ question: a.questionNumber, answer: a.answer, kind: a.kind, verified: a.verified })),
              };
            }),
          ),
        });
        counts.push(`${features.length} karakteristika`);
        return;
      }
      case 'PRIOR_DESIGN_SEARCH': {
        const [coverage, designs] = await Promise.all([
          this.prisma.searchCoverage.findMany({ where, orderBy: { createdAt: 'asc' } }),
          this.prisma.priorDesign.findMany({ where, orderBy: { createdAt: 'asc' } }),
        ]);
        sections.push({
          heading: 'Izveštaj o pokrivenosti pretrage',
          body: json(coverage.map((c) => ({ database: c.database, query: c.query, status: c.status, resultSummary: c.resultSummary, blockedReason: c.blockedReason, coverageGap: c.coverageGap }))),
        });
        sections.push({
          heading: 'Pronađeni slični dizajni (PriorDesign)',
          body: json(
            designs.map((d) => {
              for (const field of ['similarFeatures', 'differingFeatures', 'similarityNotes', 'searchResult'] as const) remember('PriorDesign', d.id, field, d[field]);
              return {
                id: d.id,
                title: d.title,
                registrationNumber: d.registrationNumber,
                holder: d.holder,
                database: d.database,
                country: d.country,
                designDate: d.designDate,
                locarnoClass: d.locarnoClass,
                similarFeatures: d.similarFeatures,
                differingFeatures: d.differingFeatures,
                similarityLevel: d.similarityLevel,
                similarityNotes: d.similarityNotes,
                searchResult: d.searchResult,
                legalConclusion: d.legalConclusion,
                kind: d.kind,
                verified: d.verified,
              };
            }),
          ),
        });
        counts.push(`${designs.length} pronađenih dizajna`, `${coverage.length} pretraženih baza`);
        return;
      }
      case 'PROTECTION_STRATEGY': {
        const [items, variants, features] = await Promise.all([
          this.prisma.protectionStrategyItem.findMany({ where }),
          this.prisma.designVariant.findMany({ where }),
          this.prisma.designFeature.findMany({ where, select: { name: true, category: true, functionalityRisk: true, verified: true } }),
        ]);
        for (const item of items) remember('ProtectionStrategyItem', null, item.key, item.value);
        sections.push({ heading: 'Stavke strategije zaštite', body: json(items.map((s) => ({ key: s.key, value: s.value, details: s.details, rationale: s.rationale, requirementRefs: s.requirementRefs, kind: s.kind, verified: s.verified }))) });
        sections.push({ heading: 'Varijante dizajna', body: json(variants.map((v) => ({ id: v.id, name: v.name, description: v.description, verified: v.verified }))) });
        sections.push({ heading: 'Vizuelne karakteristike (sažeto)', body: json(features) });
        counts.push(`${items.length}/4 stavki strategije`);
        return;
      }
      case 'REPRESENTATION_PLAN': {
        const views = await this.prisma.representation.findMany({ where, orderBy: { position: 'asc' }, include: { uploadedFile: { select: { originalName: true, role: true, mimeType: true, metadataJson: true } } } });
        sections.push({
          heading: 'Plan prikaza (Representation)',
          body: json(
            views.map((v) => {
              for (const field of ['viewName', 'purpose', 'featureShown', 'notes', 'mediumRationale', 'assessmentNote'] as const) remember('Representation', v.id, field, v[field]);
              return {
                id: v.id,
                position: v.position,
                viewName: v.viewName,
                purpose: v.purpose,
                featureShown: v.featureShown,
                requirement: v.requirement,
                medium: v.medium,
                mediumRationale: v.mediumRationale,
                assessment: v.assessment,
                assessmentNote: v.assessmentNote,
                notes: v.notes,
                file: v.uploadedFile,
                verified: v.verified,
              };
            }),
          ),
        });
        counts.push(`${views.length} prikaza`);
        return;
      }
      case 'DESCRIPTION_DRAFTING':
      case 'INDEPENDENT_REVIEW': {
        const [sectionsOfDraft, features, views] = await Promise.all([
          this.prisma.applicationSection.findMany({ where, orderBy: [{ position: 'asc' }], include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } } }),
          this.prisma.designFeature.findMany({ where, select: { id: true, name: true, description: true, category: true, functionalityRisk: true, verified: true } }),
          this.prisma.representation.findMany({ where, orderBy: { position: 'asc' }, select: { position: true, viewName: true, featureShown: true, requirement: true, assessment: true } }),
        ]);
        sections.push({
          heading: 'Sekcije opisa (ApplicationSection) sa poslednjom verzijom teksta',
          body: json(
            sectionsOfDraft.map((s) => {
              remember('ApplicationSection', s.id, 'content', s.versions[0]?.content ?? '');
              return {
                id: s.id,
                key: s.key,
                title: s.title,
                required: s.required,
                confirmed: s.confirmed,
                latestVersion: s.versions[0] ? { versionNumber: s.versions[0].versionNumber, createdByActor: s.versions[0].createdByActor, content: s.versions[0].content } : null,
              };
            }),
          ),
        });
        sections.push({ heading: 'Vizuelne karakteristike (sažeto)', body: json(features) });
        sections.push({ heading: 'Plan prikaza (sažeto)', body: json(views) });
        counts.push(`${sectionsOfDraft.filter((s) => s.versions[0]?.content.trim()).length}/${sectionsOfDraft.length} sekcija sa tekstom`);
        return;
      }
      default: {
        const _exhaustive: never = stepKey;
        return _exhaustive;
      }
    }
  }
}

