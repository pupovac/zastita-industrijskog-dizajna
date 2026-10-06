import { InformationKind, RequirementStatus, SourceType } from '@prisma/client';

/**
 * Parsers for the phase 1 and phase 2 research results committed in `docs/`.
 * They read the documents exactly as the research agent wrote them; nothing is
 * reinterpreted, only split into records with their labels preserved.
 */

// ---------------------------------------------------------------------------
// docs/izvori/zapisi-izvora.md — one record per source (Z-01 … Z-15)
// ---------------------------------------------------------------------------

export interface SourceRecordItem {
  kind: InformationKind;
  text: string;
}

export interface SourceRecord {
  code: string;
  heading: string;
  fields: Record<string, string>;
  /** "izdvojeni zahtevi" and notes, one per line, with their origin label. */
  items: SourceRecordItem[];
  localCopies: string[];
}

const KIND_LABELS: [string, InformationKind][] = [
  ['PRAVNI ZAHTEV', 'LEGAL_REQUIREMENT'],
  ['ČINJENICA', 'FACT'],
  ['AI ZAKLJUČAK', 'AI_INFERENCE'],
  ['PREPORUKA', 'RECOMMENDATION'],
  ['IZJAVA KORISNIKA', 'USER_STATEMENT'],
];

/** Fields whose indented lines are separate findings rather than one block of text. */
const ITEM_FIELDS = ['izdvojeni zahtevi', 'neusklađenosti / napomene', 'napomene', 'napomena'];

export function kindFromLabel(text: string): InformationKind | null {
  const trimmed = text.trim().replace(/^[-*]\s*/, '');
  for (const [label, kind] of KIND_LABELS) {
    if (trimmed.startsWith(label)) return kind;
  }
  return null;
}

export function parseSourceRecords(markdown: string): SourceRecord[] {
  const records: SourceRecord[] = [];
  const sections = markdown.split(/^## /m).slice(1);
  for (const section of sections) {
    const headingLine = section.split('\n', 1)[0];
    const code = /^(Z-\d{2})\b/.exec(headingLine)?.[1];
    const block = /```\n([\s\S]*?)```/.exec(section)?.[1];
    if (!code || !block) continue;

    const fields: Record<string, string> = {};
    const items: SourceRecordItem[] = [];
    let current: { key: string; defaultKind: InformationKind | null } | null = null;

    for (const line of block.split('\n')) {
      if (!line.trim()) continue;
      const keyLine = /^([A-Za-zČĆŠŽĐčćšžđ/ ]+?)(?: \(([^)]*)\))?:(?:\s(.*))?$/.exec(line);
      if (keyLine && !/^\s/.test(line)) {
        const key = keyLine[1].trim();
        const value = (keyLine[3] ?? '').trim();
        fields[key] = value;
        current = { key, defaultKind: kindFromLabel(keyLine[2] ?? '') };
        if (ITEM_FIELDS.includes(key) && value) {
          items.push({ kind: kindFromLabel(value) ?? current.defaultKind ?? 'FACT', text: value });
        }
        continue;
      }
      if (!current) continue;
      const text = line.trim();
      fields[current.key] = fields[current.key] ? `${fields[current.key]}\n${text}` : text;
      if (ITEM_FIELDS.includes(current.key)) {
        const itemText = text.replace(/^-\s*/, '');
        items.push({ kind: kindFromLabel(itemText) ?? current.defaultKind ?? 'FACT', text: itemText });
      }
    }

    const localCopies = [...(fields['lokalna kopija'] ?? '').matchAll(/docs\/[^\s;,)]+/g)].map((m) => m[0]);
    records.push({ code, heading: headingLine.replace(/^Z-\d{2}\s*[—-]\s*/, '').trim(), fields, items, localCopies });
  }
  return records;
}

// ---------------------------------------------------------------------------
// docs/faza-2/matrica-zahteva-zis.json — "Matrica zahteva ZIS-a"
// ---------------------------------------------------------------------------

export interface MatrixSource {
  id: string;
  document: string;
  url: string;
}

export interface MatrixRequirement {
  id: string;
  area: string;
  area_code: string;
  requirement: string;
  classification: string;
  source_type: string;
  sources: { id: string; document: string; url: string; location: string }[];
  access_date: string;
  status: string;
  impact: string;
  phases: { number: number; name: string }[];
  is_discrepancy: boolean;
  open_items: string[];
  precedence?: string;
}

export interface RequirementsMatrix {
  title: string;
  version: string;
  generated: string;
  access_date_default: string;
  sources: MatrixSource[];
  requirements: MatrixRequirement[];
}

const CLASSIFICATION: Record<string, InformationKind> = {
  'PRAVNI ZAHTEV': 'LEGAL_REQUIREMENT',
  ČINJENICA: 'FACT',
  'AI ZAKLJUČAK': 'AI_INFERENCE',
  PREPORUKA: 'RECOMMENDATION',
};

export function classificationToKind(classification: string): InformationKind {
  const kind = CLASSIFICATION[classification.trim()];
  if (!kind) throw new Error(`Nepoznata klasifikacija u Matrici zahteva: ${classification}`);
  return kind;
}

export function matrixSourceType(value: string): SourceType {
  const allowed: SourceType[] = ['USER', 'DOCUMENT', 'ZIS', 'WIPO', 'EUIPO', 'AGENT_INFERENCE'];
  if (!allowed.includes(value as SourceType)) throw new Error(`Nepoznat source_type u Matrici zahteva: ${value}`);
  return value as SourceType;
}

/** "POTVRĐENO" or "NEPROVERENO – …" (the full text of the label is kept in the matrix). */
export function requirementStatus(value: string): RequirementStatus {
  return value.trim().startsWith('POTVRĐENO') ? 'CONFIRMED' : 'UNVERIFIED';
}

/** Source type of a source record by its institution/URL; priority follows the project rule (1 = ZIS … 5 = other). */
export function classifySource(url: string, institution: string): { sourceType: SourceType; priority: number } {
  if (/wipo\.int/i.test(url)) return { sourceType: 'WIPO', priority: 3 };
  if (/euipo|designview|tmdn/i.test(url)) return { sourceType: 'EUIPO', priority: 4 };
  if (/zis\.gov\.rs/i.test(url) || /^ZIS\b/.test(institution)) return { sourceType: 'ZIS', priority: 1 };
  if (/paragraf\.rs|pravno-informacioni-sistem/i.test(url)) return { sourceType: 'DOCUMENT', priority: 2 };
  return { sourceType: 'DOCUMENT', priority: 5 };
}

// ---------------------------------------------------------------------------
// docs/faza-2/rezultati-inicijalnog-istrazivanja.md — sections A–N
// ---------------------------------------------------------------------------

export interface ReportSection {
  /** "INTRO", "A.1" … "A.10" (the §17 summary sections), then "B" … "N". */
  code: string;
  heading: string;
  body: string;
}

export function parseResearchReport(markdown: string): ReportSection[] {
  const result: ReportSection[] = [];
  const [intro, ...parts] = markdown.split(/^## (?=[A-N]\. )/m);
  const introBody = intro.replace(/^# .*\n/, '').replace(/\n---\s*$/, '').trim();
  if (introBody) result.push({ code: 'INTRO', heading: 'Uvod', body: introBody });

  for (const part of parts) {
    const [headingLine, ...rest] = part.split('\n');
    const letter = headingLine[0];
    const heading = headingLine.replace(/^[A-N]\.\s*/, '').trim();
    const body = rest.join('\n').replace(/\n---\s*$/, '').trim();
    if (letter === 'A') {
      // The summary is split into its subsections: they are the §17 "Rezultati inicijalnog istraživanja" screen.
      body.split(/^### /m)
        .slice(1)
        .forEach((sub, i) => {
          const [subHeading, ...subRest] = sub.split('\n');
          result.push({ code: `A.${i + 1}`, heading: subHeading.trim(), body: subRest.join('\n').trim() });
        });
    } else {
      result.push({ code: letter, heading, body });
    }
  }
  return result;
}
