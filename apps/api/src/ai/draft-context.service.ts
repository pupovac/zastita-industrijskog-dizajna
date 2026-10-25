import { Injectable, Logger } from '@nestjs/common';
import { UploadedFile } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { D1_FIELDS } from '../domain/d1-fields';
import { DomainError } from '../domain/domain-error';
import { isConfirmedUserFact } from '../domain/fact-rules';
import { FilesService } from '../files/files.service';
import { PrismaService } from '../prisma/prisma.service';

/** Per-document cap so one huge PDF cannot crowd out the rest (same as the step review). */
const MAX_DOCUMENT_CHARS = 60_000;
/** The API accepts base64 images up to 5 MB; larger files are listed but not sent. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME: Record<string, 'image/png' | 'image/jpeg'> = { 'image/png': 'image/png', 'image/jpeg': 'image/jpeg', 'image/jpg': 'image/jpeg' };

export interface DraftImage {
  fileId: string;
  /** Text block that precedes the image, so the model knows what it is looking at. */
  label: string;
  mediaType: 'image/png' | 'image/jpeg';
  data: string;
  bytes: number;
}

export interface DraftSectionRecord {
  id: string;
  key: string;
  title: string;
  position: number;
  confirmed: boolean;
  latest: { id: string; versionNumber: number; content: string } | null;
}

export interface DraftContext {
  sections: { heading: string; body: string }[];
  images: DraftImage[];
  /** Images that exist but were not sent (too large, unsupported type, over the limit). */
  skippedImages: string[];
  applicationSections: DraftSectionRecord[];
  summary: string;
  totalChars: number;
}

const json = (value: unknown) => JSON.stringify(value, null, 1);
const label = (kind: string) => kind;

/**
 * Collects what the model sees when it writes the description (FUZZ-142): everything
 * from steps 1–9, each item marked by its provenance (ČINJENICA / IZJAVA KORISNIKA /
 * AI ZAKLJUČAK), the plan of representations with their images, the uploaded photos and
 * renders, the extracted text of documents and the current text of the sections.
 * Images are sent as they are stored (the API scales oversized images down itself);
 * SVG and PDF are listed but not sent. If the text is too long, the user is told — nothing is cut silently.
 */
@Injectable()
export class DraftContextService {
  private readonly logger = new Logger(DraftContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
  ) {}

  async build(projectId: string, options: { maxChars: number; maxImages: number }): Promise<DraftContext> {
    const where = { projectId };
    const [project, facts, questions, variants, features, strategy, representations, files, documents, priorDesigns, coverage, openQuestions, issues, d1, sectionsOfDraft, requirements] =
      await Promise.all([
        this.prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
        this.prisma.fact.findMany({ where, orderBy: { createdAt: 'asc' } }),
        this.prisma.question.findMany({ where: { ...where, stepKey: 'PRODUCT_INTERVIEW' }, orderBy: [{ interviewGroup: 'asc' }, { position: 'asc' }], include: { answers: { where } } }),
        this.prisma.designVariant.findMany({ where, orderBy: { createdAt: 'asc' } }),
        this.prisma.designFeature.findMany({ where, orderBy: { createdAt: 'asc' }, include: { functionAnalysis: { orderBy: { questionNumber: 'asc' } } } }),
        this.prisma.protectionStrategyItem.findMany({ where }),
        this.prisma.representation.findMany({ where, orderBy: { position: 'asc' }, include: { uploadedFile: true } }),
        this.prisma.uploadedFile.findMany({ where: { ...where, replacedById: null }, orderBy: { createdAt: 'asc' } }),
        this.prisma.uploadedFile.findMany({ where: { ...where, replacedById: null, extractedText: { not: null } }, orderBy: { createdAt: 'asc' } }),
        this.prisma.priorDesign.findMany({ where, orderBy: { createdAt: 'asc' } }),
        this.prisma.searchCoverage.findMany({ where, orderBy: { createdAt: 'asc' } }),
        this.prisma.openQuestion.findMany({ where: { ...where, status: 'OPEN' }, orderBy: { createdAt: 'asc' } }),
        this.prisma.reviewIssue.findMany({ where: { ...where, status: 'OPEN' }, orderBy: { createdAt: 'asc' } }),
        this.prisma.d1FieldValue.findMany({ where }),
        this.prisma.applicationSection.findMany({ where, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }], include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } } }),
        this.prisma.sourceRequirement.findMany({ where, select: { code: true, areaCode: true } }),
      ]);

    const sections: { heading: string; body: string }[] = [];
    const counts: string[] = [];

    const { id: _id, createdAt: _c, updatedAt: _u, ...projectFields } = project;
    sections.push({ heading: 'Projekat (korak 1) — IZJAVA KORISNIKA', body: json(projectFields) });

    const confirmed = facts.filter((f) => f.verified);
    const unconfirmed = facts.filter((f) => !f.verified);
    sections.push({
      heading: 'Potvrđene činjenice korisnika — ČINJENICA (verified = true)',
      body: json(confirmed.map((f) => ({ category: f.category, kind: f.kind, statement: f.statement, value: f.value, confirmedUserFact: isConfirmedUserFact(f) }))),
    });
    sections.push({
      heading: 'Nepotvrđene izjave i zaključci — IZJAVA KORISNIKA (sourceType USER/DOCUMENT) ili AI ZAKLJUČAK (AGENT_INFERENCE); nisu činjenice',
      body: json(unconfirmed.map((f) => ({ category: f.category, kind: f.kind, statement: f.statement, value: f.value, sourceType: f.sourceType, provenance: label(f.sourceType === 'AGENT_INFERENCE' ? 'AI ZAKLJUČAK' : 'IZJAVA KORISNIKA') }))),
    });
    counts.push(`${confirmed.length} potvrđenih činjenica`, `${unconfirmed.length} nepotvrđenih izjava`);

    const answered = questions.filter((q) => q.answers[0]?.value?.trim());
    sections.push({
      heading: 'Intervju o proizvodu i dizajnu (korak 4, grupe A–G) — IZJAVA KORISNIKA',
      body: json(
        questions.map((q) => ({
          group: q.interviewGroup,
          question: q.text,
          whyNeeded: q.whyNeeded,
          answer: q.answers[0]?.value ?? null,
          attachmentFileId: q.answers[0]?.attachmentFileId ?? null,
        })),
      ),
    });
    counts.push(`${answered.length}/${questions.length} odgovorenih pitanja`);

    sections.push({
      heading: 'Varijante proizvoda (DesignVariant)',
      body: json(variants.map((v) => ({ id: v.id, name: v.name, description: v.description, verified: v.verified, provenance: v.verified ? 'ČINJENICA' : v.sourceType === 'AGENT_INFERENCE' ? 'AI ZAKLJUČAK' : 'IZJAVA KORISNIKA' }))),
    });
    sections.push({
      heading: 'Mapa vizuelnih karakteristika (korak 6, DesignFeature) — kategorije A/B/C/D i rizik funkcionalnosti; VISOKA FUNKCIONALNA ZAVISNOST se opisuje samo kao izgled ili izostavlja',
      body: json(
        features.map((f) => ({
          id: f.id,
          variantId: f.variantId,
          name: f.name,
          description: f.description,
          category: f.category,
          categoryRationale: f.categoryRationale,
          functionalityRisk: f.functionalityRisk,
          riskRationale: f.riskRationale,
          kind: f.kind,
          verified: f.verified,
          provenance: f.verified ? 'ČINJENICA' : f.sourceType === 'AGENT_INFERENCE' ? 'AI ZAKLJUČAK' : 'IZJAVA KORISNIKA',
          functionAnalysis: f.functionAnalysis.map((a) => ({ question: a.questionNumber, answer: a.answer, verified: a.verified })),
        })),
      ),
    });
    counts.push(`${features.length} karakteristika`, `${variants.length} varijanti`);

    sections.push({
      heading: 'Strategija zaštite (korak 8) — jedna / više / višestruka prijava, varijante, odloženo objavljivanje',
      body: json(strategy.map((s) => ({ key: s.key, value: s.value, details: s.details, rationale: s.rationale, requirementRefs: s.requirementRefs, verified: s.verified }))),
    });

    sections.push({
      heading: 'Plan prikaza (korak 9, Representation) — opis se poziva na prikaze po broju „1.<position>"',
      body: json(
        representations.map((v) => ({
          number: `1.${v.position}`,
          viewName: v.viewName,
          purpose: v.purpose,
          featureShown: v.featureShown,
          requirement: v.requirement,
          medium: v.medium,
          assessment: v.assessment,
          notes: v.notes,
          file: v.uploadedFile ? { name: v.uploadedFile.originalName, mimeType: v.uploadedFile.mimeType, role: v.uploadedFile.role } : null,
          verified: v.verified,
        })),
      ),
    });
    counts.push(`${representations.length} prikaza`);

    sections.push({
      heading: 'Pretraga postojećih dizajna (korak 7) — pokrivenost i pronađeni slični dizajni; novost se ističe u odnosu na njih, bez pravnih tvrdnji',
      body: json({
        coverage: coverage.map((c) => ({ database: c.database, status: c.status, resultSummary: c.resultSummary, coverageGap: c.coverageGap })),
        priorDesigns: priorDesigns.map((d) => ({ title: d.title, registrationNumber: d.registrationNumber, database: d.database, similarFeatures: d.similarFeatures, differingFeatures: d.differingFeatures, similarityLevel: d.similarityLevel, provenance: d.verified ? 'ČINJENICA' : 'AI ZAKLJUČAK' })),
      }),
    });

    const d1Rows = D1_FIELDS.map((f) => {
      const stored = d1.find((v) => v.fieldKey === f.key);
      return { fieldKey: f.key, label: f.label, value: stored?.value ?? '', verified: stored?.verified ?? false };
    }).filter((r) => r.value.trim());
    if (d1Rows.length) sections.push({ heading: 'Već uneti podaci za obrazac D-1 (korak 11)', body: json(d1Rows) });

    const relevantIssues = issues.filter((i) => ['DESCRIPTION_DRAFTING', 'VISUAL_ANALYSIS', 'REPRESENTATION_PLAN', 'DOCUMENT_UPLOAD'].includes(i.stepKey ?? ''));
    if (openQuestions.length || relevantIssues.length) {
      sections.push({
        heading: 'Otvorena pitanja i nerešeni nalazi/konflikti — na ovim mestima ne pogađaj, ostavi marker',
        body: json({
          openQuestions: openQuestions.map((q) => ({ step: q.stepKey, text: q.text, whyNeeded: q.whyNeeded })),
          issues: relevantIssues.map((i) => ({ step: i.stepKey, type: i.type, severity: i.severity, title: i.title, description: i.description })),
        }),
      });
    }

    const relevantCodes = requirements
      .filter((r) => r.code && ['description', 'representations', 'exclusions'].includes(r.areaCode))
      .map((r) => r.code!)
      .sort((a, b) => a.localeCompare(b, 'en'));
    sections.push({
      heading: 'Zahtevi iz Matrice ZIS-a najrelevantniji za opis (oznake; pun tekst je u sistemskom delu)',
      body: relevantCodes.length ? relevantCodes.join(', ') : 'Matrica još nije uvezena u ovaj projekat.',
    });

    sections.push({
      heading: 'Sekcije opisa (ApplicationSection) sa trenutnim tekstom — ključevi koje treba vratiti',
      body: json(
        sectionsOfDraft.map((s) => ({
          key: s.key,
          title: s.title,
          required: s.required,
          confirmed: s.confirmed,
          currentText: s.versions[0]?.content ?? '',
          currentTextBy: s.versions[0]?.createdByActor ?? null,
        })),
      ),
    });

    sections.push({
      heading: 'Dostavljeni dokumenti (korak 5)',
      body: json(files.map((f) => ({ id: f.id, name: f.originalName, role: f.role, mimeType: f.mimeType, extractionStatus: f.extractionStatus, summary: f.summary, metadata: safeJson(f.metadataJson) }))),
    });
    let documentChars = 0;
    const texts = documents.filter((f) => f.extractedText?.trim());
    const tooLong = texts.filter((f) => f.extractedText!.length > MAX_DOCUMENT_CHARS);
    if (tooLong.length) {
      throw new DomainError(
        'AI_CONTEXT_TOO_LARGE',
        `Izvučeni tekst sledećih dokumenata je predugačak za jedno AI generisanje (više od ${MAX_DOCUMENT_CHARS.toLocaleString('sr-Latn-RS')} znakova): ${tooLong
          .map((f) => f.originalName)
          .join(', ')}. Tekst nije skraćen automatski; podelite dokument ili ga privremeno uklonite iz projekta.`,
      );
    }
    for (const f of texts) {
      documentChars += f.extractedText!.length;
      sections.push({ heading: `Tekst dokumenta „${f.originalName}" (${f.role}) — DOKUMENT`, body: f.extractedText!.trim() });
    }

    const totalChars = sections.reduce((n, s) => n + s.heading.length + s.body.length, 0);
    if (totalChars > options.maxChars) {
      throw new DomainError(
        'AI_CONTEXT_TOO_LARGE',
        `Prikupljeni podaci su preveliki za jedno AI generisanje (${totalChars.toLocaleString('sr-Latn-RS')} znakova, dozvoljeno ${options.maxChars.toLocaleString('sr-Latn-RS')}). Ništa nije skraćeno automatski. Smanjite broj ili veličinu dokumenata u projektu ili povećajte AI_MAX_CONTEXT_CHARS.`,
      );
    }

    const { images, skipped } = await this.loadImages(representations, files, options.maxImages);
    counts.push(`${files.length} dokumenata${documentChars ? ` (${documentChars.toLocaleString('sr-Latn-RS')} znakova teksta)` : ''}`, `${images.length} slika`);

    return {
      sections,
      images,
      skippedImages: skipped,
      applicationSections: sectionsOfDraft.map((s) => ({
        id: s.id,
        key: s.key,
        title: s.title,
        position: s.position,
        confirmed: s.confirmed,
        latest: s.versions[0] ? { id: s.versions[0].id, versionNumber: s.versions[0].versionNumber, content: s.versions[0].content } : null,
      })),
      summary: `Nacrt opisa: ${counts.join(', ')}; ${totalChars.toLocaleString('sr-Latn-RS')} znakova konteksta.`,
      totalChars,
    };
  }

  /**
   * Representation images first (in plan order), then the other photos/renders/CAD exports.
   * PNG and JPEG only; SVG and PDF are skipped (listed in `skipped`). At most `maxImages`.
   */
  private async loadImages(
    representations: { position: number; viewName: string; uploadedFile: UploadedFile | null }[],
    files: UploadedFile[],
    maxImages: number,
  ): Promise<{ images: DraftImage[]; skipped: string[] }> {
    const candidates: { file: UploadedFile; label: string }[] = [];
    const seen = new Set<string>();
    for (const r of representations) {
      if (!r.uploadedFile || seen.has(r.uploadedFile.id)) continue;
      seen.add(r.uploadedFile.id);
      candidates.push({ file: r.uploadedFile, label: `Slika: prikaz 1.${r.position} — ${r.viewName} (fajl „${r.uploadedFile.originalName}")` });
    }
    for (const f of files) {
      if (seen.has(f.id) || !['PHOTO', 'RENDER', 'CAD_EXPORT', 'TECHNICAL_DRAWING'].includes(f.role)) continue;
      seen.add(f.id);
      candidates.push({ file: f, label: `Slika: otpremljeni fajl „${f.originalName}" (uloga: ${f.role}, nije vezan za prikaz iz plana)` });
    }

    const images: DraftImage[] = [];
    const skipped: string[] = [];
    for (const c of candidates) {
      const mediaType = IMAGE_MIME[c.file.mimeType.toLowerCase()];
      if (!mediaType) {
        skipped.push(`${c.file.originalName} (${c.file.mimeType}: šalju se samo PNG i JPG)`);
        continue;
      }
      if (c.file.sizeBytes > MAX_IMAGE_BYTES) {
        skipped.push(`${c.file.originalName} (${(c.file.sizeBytes / 1024 / 1024).toFixed(1)} MB, dozvoljeno do 5 MB)`);
        continue;
      }
      if (images.length >= maxImages) {
        skipped.push(`${c.file.originalName} (preko limita od ${maxImages} slika)`);
        continue;
      }
      try {
        const buffer = await readFile(this.files.absolutePath(c.file));
        images.push({ fileId: c.file.id, label: c.label, mediaType, data: buffer.toString('base64'), bytes: buffer.length });
      } catch (error) {
        this.logger.warn(`Image ${c.file.id} could not be read: ${(error as Error).message}`);
        skipped.push(`${c.file.originalName} (fajl nije dostupan na disku)`);
      }
    }
    return { images, skipped };
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
