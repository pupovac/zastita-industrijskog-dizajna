import { GeneratedDocumentType } from '@prisma/client';
import { DEFAULT_APPLICATION_SECTIONS } from '../domain/application-sections';
import { D1_FIELDS } from '../domain/d1-fields';
import { ChecklistItem } from '../domain/filing-checklist';
import { DEMO_BANNER } from '../domain/mock-data';
import { REVIEW_CHECKS } from '../domain/review-rules';
import { STRATEGY_ITEMS } from '../domain/strategy';
import { stepTitle, isStepKey } from '../domain/steps';
import { Block, DocModel, NO_GUARANTEE_NOTICE } from './doc-model';
import { PackageSnapshot } from './package-snapshot';

/**
 * Builds the documents of the final package from the project memory. Texts of the
 * application (title, description, lists) are taken verbatim from the drafted and
 * confirmed sections — the system assembles, it does not write application content.
 */

export interface BuildContext {
  snapshot: PackageSnapshot;
  checklist: ChecklistItem[];
  version: number;
  isFinal: boolean;
  missing: string[];
  generatedAt: Date;
}

const UNVERIFIED_LABEL = 'NEPROVERENO – potrebno potvrditi sa ZIS-om ili registrovanim zastupnikom.';
const MEDIUM_LABEL = { RENDER: 'Render', CAD: 'CAD prikaz', PHOTO: 'Fotografija', LINE_DRAWING: 'Linijski crtež' };
const ASSESSMENT_LABEL = { ACCEPTABLE: 'PRIHVATLJIVO', NEEDS_REWORK: 'POTREBNA DORADA', UNSUITABLE: 'NEODGOVARAJUĆE' };
const SEVERITY_LABEL = { BLOCKER: 'BLOCKER', HIGH: 'VISOK', MEDIUM: 'SREDNJI', LOW: 'NIZAK' };
const ISSUE_STATUS_LABEL = { OPEN: 'Otvoren', RESOLVED: 'Rešen', DISMISSED: 'Prihvaćen bez ispravke' };
const COVERAGE_LABEL = { COMPLETED: 'Završeno', PARTIAL: 'Delimično', BLOCKED: 'Pristup blokiran', SKIPPED: 'Preskočeno' };

const date = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : '—');
const stepName = (key: string | null) => (key && isStepKey(key) ? stepTitle(key) : '—');

function header(ctx: BuildContext, subject: string): Block[] {
  const { project } = ctx.snapshot;
  const blocks: Block[] = [];
  if (project.isDemo) blocks.push({ type: 'paragraph', text: DEMO_BANNER, tone: 'warning' });
  blocks.push(
    {
      type: 'table',
      columns: ['Podatak', 'Vrednost'],
      rows: [
        ['Projekat', project.name],
        ['Dokument', subject],
        ['Verzija paketa', String(ctx.version)],
        ['Generisano', ctx.generatedAt.toISOString().replace('T', ' ').slice(0, 16)],
        ['Status', ctx.isFinal ? 'FINALNA VERZIJA' : 'NACRT – nisu potvrđeni svi obavezni podaci'],
      ],
    },
    { type: 'paragraph', text: NO_GUARANTEE_NOTICE, tone: 'note' },
  );
  return blocks;
}

function sectionText(ctx: BuildContext, key: string): { text: string; confirmed: boolean } {
  const section = ctx.snapshot.sections.find((s) => s.key === key);
  return { text: section?.latest?.content.trim() ?? '', confirmed: Boolean(section?.confirmed) };
}

function sectionBlocks(ctx: BuildContext, key: string, heading: string, required: boolean): Block[] {
  const { text, confirmed } = sectionText(ctx, key);
  if (!text && !required) return [];
  const blocks: Block[] = [{ type: 'heading', text: heading, level: 2 }];
  if (!text) {
    blocks.push({ type: 'paragraph', text: 'NEDOSTAJE – sekcija još nema tekst.', tone: 'warning' });
    return blocks;
  }
  blocks.push(...text.split(/\n{2,}/).map((p): Block => ({ type: 'paragraph', text: p })));
  if (!confirmed) blocks.push({ type: 'paragraph', text: 'Tekst sekcije nije potvrđen od strane korisnika.', tone: 'warning' });
  return blocks;
}

export function buildDescription(ctx: BuildContext): DocModel {
  const { project } = ctx.snapshot;
  const title = sectionText(ctx, 'TITLE').text;
  const custom = ctx.snapshot.sections.filter(
    (s) => !DEFAULT_APPLICATION_SECTIONS.some((d) => d.key === s.key) && s.latest?.content.trim(),
  );
  return {
    title: 'Opis industrijskog dizajna',
    blocks: [
      ...header(ctx, 'Opis industrijskog dizajna'),
      {
        type: 'paragraph',
        text: `Podnosilac: ${[project.applicantName, project.applicantAddress].filter(Boolean).join(', ') || 'NEDOSTAJE'}`,
      },
      { type: 'heading', text: title || 'NEDOSTAJE – naziv proizvoda', level: 1 },
      ...sectionBlocks(ctx, 'DESCRIPTION', 'Opis', true),
      ...sectionBlocks(ctx, 'CHARACTERISTIC_FEATURES', 'Karakteristični vizuelni elementi', true),
      ...sectionBlocks(ctx, 'PURPOSE', 'Namena', false),
      ...sectionBlocks(ctx, 'REPRESENTATION_LIST', 'Spisak prikaza', true),
      ...custom.flatMap((s) => sectionBlocks(ctx, s.key, s.title, false)),
    ],
  };
}

export function buildD1Data(ctx: BuildContext): DocModel {
  const rows = D1_FIELDS.map((field) => {
    const stored = ctx.snapshot.d1.find((v) => v.fieldKey === field.key);
    const deferred = stored?.deferredToFiling ?? field.deferredToFiling;
    const value = stored?.value.trim() ? stored.value.trim() : 'NEDOSTAJE';
    const status = [
      stored?.verified ? 'potvrđeno' : stored?.value.trim() ? 'nije potvrđeno' : '',
      deferred ? 'ODLOŽENO ZA PODNOŠENJE' : '',
    ]
      .filter(Boolean)
      .join('; ');
    return [field.number, field.label, value, `${field.legalBasis} [${field.requirementRefs.join(', ')}]`, status || '—'];
  });
  return {
    title: 'Podaci za obrazac D-1',
    blocks: [
      ...header(ctx, 'Podaci za obrazac D-1'),
      { type: 'table', columns: ['Polje', 'Šta se upisuje', 'Vrednost', 'Pravni osnov', 'Status'], rows },
      {
        type: 'paragraph',
        text: 'Polje „Popunjava Zavod" (D-broj, datum podnošenja) se ne popunjava. Obrazac D-1 nema polje za Lokarnsku klasu.',
        tone: 'note',
      },
    ],
  };
}

export function buildRepresentationIndex(ctx: BuildContext): DocModel {
  const rows = ctx.snapshot.representations.map((r) => [
    `1.${r.position}`,
    r.viewName,
    r.requirement === 'MANDATORY' ? 'obavezan' : 'preporučen',
    r.medium ? MEDIUM_LABEL[r.medium] : '—',
    r.uploadedFile ? `${r.uploadedFile.originalName} (SHA-256 ${r.uploadedFile.sha256.slice(0, 12)}…)` : 'NEDOSTAJE',
    r.assessment ? ASSESSMENT_LABEL[r.assessment] : 'nije ocenjeno',
    r.featureShown || '—',
  ]);
  return {
    title: 'Indeks prikaza',
    blocks: [
      ...header(ctx, 'Indeks prikaza'),
      rows.length
        ? { type: 'table', columns: ['Br.', 'Prikaz', 'Vrsta', 'Medij', 'Fajl', 'Ocena', 'Karakteristika'], rows }
        : { type: 'paragraph', text: 'NEDOSTAJE – plan prikaza nema nijedan prikaz.', tone: 'warning' },
      {
        type: 'paragraph',
        text: 'Prikazi se prilažu kao zasebni fajlovi, u redosledu i sa brojevima iz ovog indeksa.',
        tone: 'note',
      },
    ],
  };
}

export function buildChecklist(ctx: BuildContext): DocModel {
  return {
    title: 'Checklista za podnošenje',
    blocks: [
      ...header(ctx, 'Checklista za podnošenje'),
      {
        type: 'table',
        columns: ['', 'Kontrolna tačka', 'Stanje u projektu'],
        rows: ctx.checklist.map((i) => [i.done ? '[x]' : '[ ]', i.label, i.detail]),
      },
      {
        type: 'paragraph',
        text: 'Kontrolne tačke se obeležavaju automatski iz stanja projekta; ne mogu se ručno označiti.',
        tone: 'note',
      },
    ],
  };
}

export function buildAttachmentList(ctx: BuildContext): DocModel {
  const attachments = sectionText(ctx, 'ATTACHMENT_LIST');
  const d1 = ctx.snapshot.d1.find((v) => v.fieldKey === 'ATTACHMENTS')?.value.trim();
  const files = ctx.snapshot.representations.filter((r) => r.uploadedFile);
  return {
    title: 'Spisak priloga',
    blocks: [
      ...header(ctx, 'Spisak priloga'),
      { type: 'heading', text: 'Spisak priloga iz opisa', level: 2 },
      attachments.text
        ? { type: 'list', items: attachments.text.split('\n').map((l) => l.replace(/^[-*]\s*/, '')).filter(Boolean) }
        : { type: 'paragraph', text: 'NEDOSTAJE – sekcija „Spisak priloga" nema tekst.', tone: 'warning' },
      ...(attachments.text && !attachments.confirmed
        ? [{ type: 'paragraph', text: 'Spisak nije potvrđen od strane korisnika.', tone: 'warning' } as Block]
        : []),
      { type: 'heading', text: 'Prilozi označeni u obrascu D-1', level: 2 },
      { type: 'paragraph', text: d1 || 'NEDOSTAJE', tone: d1 ? 'normal' : 'warning' },
      { type: 'heading', text: 'Fajlovi prikaza', level: 2 },
      files.length
        ? { type: 'list', items: files.map((r) => `1.${r.position} ${r.viewName} — ${r.uploadedFile!.originalName}`) }
        : { type: 'paragraph', text: 'NEDOSTAJE – nijedan prikaz nije dostavljen.', tone: 'warning' },
    ],
  };
}

export function buildSourcesReport(ctx: BuildContext): DocModel {
  const s = ctx.snapshot;
  const confirmed = s.requirements.filter((r) => r.status === 'CONFIRMED').length;
  const discrepancies = s.requirements.filter((r) => r.isDiscrepancy);
  const blocks: Block[] = [
    ...header(ctx, 'Izveštaj o izvorima i proverama'),
    { type: 'heading', text: 'Izvori', level: 2 },
    s.sources.length
      ? {
          type: 'table',
          columns: ['Oznaka', 'Izvor', 'Institucija', 'URL', 'Verzija', 'Datum pristupa', 'Lokalna kopija'],
          rows: s.sources.map((src) => [
            src.code ?? '—',
            src.name,
            src.institution || '—',
            src.url,
            src.documentVersion || '—',
            date(src.accessedAt),
            (JSON.parse(src.localCopiesJson) as string[]).join('; ') || '—',
          ]),
        }
      : { type: 'paragraph', text: 'NEDOSTAJE – izvori nisu uvezeni.', tone: 'warning' },
    { type: 'heading', text: 'Matrica zahteva ZIS-a', level: 2 },
    {
      type: 'list',
      items: [
        `Ukupno zahteva: ${s.requirements.length}`,
        `POTVRĐENO: ${confirmed}`,
        `NEPROVERENO: ${s.requirements.length - confirmed}`,
        `Neusklađenosti između izvora: ${discrepancies.length}`,
      ],
    },
  ];
  if (discrepancies.length) {
    blocks.push({
      type: 'table',
      columns: ['Oznaka', 'Neusklađenost', 'Koji izvor ima prednost'],
      rows: discrepancies.map((d) => [d.code ?? '—', d.requirementText, d.precedence || '—']),
    });
  }
  blocks.push({ type: 'heading', text: 'Izveštaj o pokrivenosti pretrage postojećih dizajna', level: 2 });
  blocks.push(
    s.coverage.length
      ? {
          type: 'table',
          columns: ['Baza', 'Upit', 'Datum', 'Rezultat', 'Šta je blokiralo pristup', 'Praznina u pokrivenosti'],
          rows: s.coverage.map((c) => [
            c.database,
            c.query || '—',
            date(c.searchedAt),
            `${COVERAGE_LABEL[c.status]}${c.resultSummary ? ` — ${c.resultSummary}` : ''}`,
            c.blockedReason || '—',
            c.coverageGap || '—',
          ]),
        }
      : { type: 'paragraph', text: 'NEDOSTAJE – nema zapisa o pretrazi.', tone: 'warning' },
  );
  if (s.coverage.some((c) => c.status !== 'COMPLETED')) {
    blocks.push({
      type: 'paragraph',
      text: 'Pretraga nije pokrila sve baze, pa novost ostaje nepotvrđena. Preporučuje se provera kod registrovanog zastupnika pre podnošenja.',
      tone: 'warning',
    });
  }
  blocks.push({ type: 'heading', text: 'Nezavisna provera', level: 2 });
  const findings = s.issues.filter((i) => i.type !== 'CONFLICT');
  blocks.push(
    findings.length
      ? {
          type: 'table',
          columns: ['Ocena', 'Nalaz', 'Provera', 'Korak', 'Status', 'Napomena'],
          rows: findings.map((i) => [
            SEVERITY_LABEL[i.severity],
            i.title,
            REVIEW_CHECKS.find((c) => c.key === i.checkKey)?.label ?? '—',
            stepName(i.stepKey),
            ISSUE_STATUS_LABEL[i.status],
            i.resolutionNote ?? '—',
          ]),
        }
      : { type: 'paragraph', text: 'Nema zabeleženih nalaza nezavisne provere.', tone: 'note' },
  );
  blocks.push({ type: 'heading', text: 'Donete odluke', level: 2 });
  blocks.push(
    s.decisions.length
      ? { type: 'list', items: s.decisions.map((d) => `${date(d.createdAt)} — ${d.title}${d.rationale ? ` (${d.rationale})` : ''}`) }
      : { type: 'paragraph', text: 'Nema zabeleženih odluka.', tone: 'note' },
  );
  const strategy = STRATEGY_ITEMS.map((def) => {
    const item = s.strategy.find((i) => i.key === def.key);
    return [def.title, item ? [item.value, item.details].filter(Boolean).join(' — ') || '—' : 'NEDOSTAJE', item?.requirementRefs || '—', item?.verified ? 'usvojeno' : 'nije usvojeno'];
  });
  blocks.push({ type: 'heading', text: 'Strategija zaštite', level: 2 });
  blocks.push({ type: 'table', columns: ['Odluka', 'Vrednost', 'Matrica', 'Status'], rows: strategy });
  return { title: 'Izveštaj o izvorima i proverama', blocks };
}

/** Rows of the first Markdown table in a text (used for the research questions P-xx). */
export function parseMarkdownTable(text: string): { columns: string[]; rows: string[][] } | null {
  const lines = text.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 2) return null;
  const cells = (line: string) =>
    line
      .trim()
      .replace(/^\||\|$/g, '')
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, '|'));
  return { columns: cells(lines[0]), rows: lines.slice(2).map(cells) };
}

export function buildOpenLegalQuestions(ctx: BuildContext): DocModel {
  const s = ctx.snapshot;
  const blocks: Block[] = [...header(ctx, 'Nerešena pravna pitanja za ZIS ili zastupnika')];

  const research = s.report.find((r) => r.code === 'N')?.body ?? '';
  const n2 = research.includes('### N.2') ? research.slice(research.indexOf('### N.2')) : '';
  const table = parseMarkdownTable(n2);
  blocks.push({ type: 'heading', text: 'Pitanja iz inicijalnog istraživanja (P-xx)', level: 2 });
  blocks.push(
    table
      ? { type: 'table', columns: table.columns, rows: table.rows }
      : { type: 'paragraph', text: 'Rezultati inicijalnog istraživanja nisu uvezeni.', tone: 'warning' },
  );
  blocks.push({ type: 'paragraph', text: `Svako od ovih pitanja: ${UNVERIFIED_LABEL}`, tone: 'note' });

  const unverified = s.requirements.filter((r) => r.status === 'UNVERIFIED');
  blocks.push({ type: 'heading', text: 'Neprovereni zahtevi iz Matrice', level: 2 });
  blocks.push(
    unverified.length
      ? {
          type: 'table',
          columns: ['Oznaka', 'Zahtev', 'Izvor', 'Otvorene provere'],
          rows: unverified.map((r) => [
            r.code ?? '—',
            r.requirementText,
            r.sourceReference,
            (JSON.parse(r.openItemsJson) as string[]).join(', ') || '—',
          ]),
        }
      : { type: 'paragraph', text: 'Nema neproverenih zahteva.', tone: 'note' },
  );

  blocks.push({ type: 'heading', text: 'Otvorena pitanja projekta', level: 2 });
  blocks.push(
    s.openQuestions.length
      ? {
          type: 'table',
          columns: ['Pitanje', 'Zašto je potrebno', 'Korak', 'Napomena'],
          rows: s.openQuestions.map((q) => [
            q.text,
            q.whyNeeded || '—',
            stepName(q.stepKey),
            [q.blocking ? 'blokira korak' : '', q.deferredToFiling ? 'ODLOŽENO ZA PODNOŠENJE' : ''].filter(Boolean).join('; ') || '—',
          ]),
        }
      : { type: 'paragraph', text: 'Nema otvorenih pitanja.', tone: 'note' },
  );

  const legal = s.priorDesigns.filter((d) => d.legalConclusion.trim());
  if (legal.length) {
    blocks.push({ type: 'heading', text: 'Pravni zaključci uz pronađene dizajne (nisu konačni)', level: 2 });
    blocks.push({
      type: 'table',
      columns: ['Dizajn', 'Pravni zaključak', 'Status'],
      rows: legal.map((d) => [d.title, d.legalConclusion, d.verified ? 'potvrđeno od korisnika' : 'AI ZAKLJUČAK – nije potvrđeno']),
    });
  }

  const risky = s.issues.filter((i) => i.status === 'OPEN' && (i.severity === 'BLOCKER' || i.severity === 'HIGH'));
  if (risky.length) {
    blocks.push({ type: 'heading', text: 'Otvoreni nalazi visokog prioriteta', level: 2 });
    blocks.push({ type: 'list', items: risky.map((i) => `${SEVERITY_LABEL[i.severity]}: ${i.title}${i.description ? ` — ${i.description}` : ''}`) });
  }
  return { title: 'Nerešena pravna pitanja za ZIS ili zastupnika', blocks };
}

/** The combined package (DOCX and PDF): description, D-1, views, attachments, checklist, open questions. */
export function buildCombinedPackage(ctx: BuildContext): DocModel {
  const parts = [
    buildDescription(ctx),
    buildD1Data(ctx),
    buildRepresentationIndex(ctx),
    buildAttachmentList(ctx),
    buildChecklist(ctx),
    buildOpenLegalQuestions(ctx),
  ];
  const headerLength = header(ctx, '').length;
  const blocks: Block[] = [...header(ctx, 'Paket prijave za priznanje prava na industrijski dizajn')];
  if (!ctx.isFinal && ctx.missing.length) {
    blocks.push({ type: 'heading', text: 'Šta nedostaje za finalnu verziju', level: 2 });
    blocks.push({ type: 'list', items: ctx.missing });
  }
  for (const part of parts) {
    blocks.push({ type: 'heading', text: part.title, level: 1 });
    blocks.push(...part.blocks.slice(headerLength));
  }
  return { title: 'Paket prijave za priznanje prava na industrijski dizajn', blocks };
}

export const TEXT_DOCUMENTS: { type: GeneratedDocumentType; fileName: string; build: (ctx: BuildContext) => DocModel }[] = [
  { type: 'DESCRIPTION', fileName: 'opis-industrijskog-dizajna', build: buildDescription },
  { type: 'D1_DATA', fileName: 'podaci-za-D-1', build: buildD1Data },
  { type: 'REPRESENTATION_INDEX', fileName: 'indeks-prikaza', build: buildRepresentationIndex },
  { type: 'FILING_CHECKLIST', fileName: 'checklista-za-podnosenje', build: buildChecklist },
  { type: 'ATTACHMENT_LIST', fileName: 'spisak-priloga', build: buildAttachmentList },
  { type: 'SOURCES_REPORT', fileName: 'izvestaj-o-izvorima-i-proverama', build: buildSourcesReport },
  { type: 'OPEN_LEGAL_QUESTIONS', fileName: 'neresena-pravna-pitanja', build: buildOpenLegalQuestions },
];
