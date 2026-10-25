/**
 * Helpers for the "Kako da odgovorite" card in step 4: example answers are templates
 * with `[oznaka]` markers; the user copies one and replaces every marker with their
 * own data. Pure functions (no React) so the rules are unit-tested. The backend uses
 * the same marker pattern to refuse fact confirmation while markers remain.
 */
export const PLACEHOLDER_PATTERN = /\[[^\[\]\n]{1,200}\]/g;

export function countPlaceholders(text: string): number {
  return (text.match(PLACEHOLDER_PATTERN) ?? []).length;
}

/** Position of the first marker, so the cursor can be put on it after "Koristi kao šablon". */
export function firstPlaceholder(text: string): { start: number; end: number } | null {
  const match = new RegExp(PLACEHOLDER_PATTERN.source).exec(text);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

export interface TextSegment {
  text: string;
  placeholder: boolean;
}

/** Splits text so markers can be rendered highlighted. */
export function splitPlaceholders(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index), placeholder: false });
    segments.push({ text: match[0], placeholder: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), placeholder: false });
  return segments;
}

export interface TemplateApplication {
  /** The answer field content after the action. */
  value: string;
  /** True when the field already had content, so the caller must ask before replacing it. */
  needsConfirmation: boolean;
}

/**
 * "Koristi kao šablon": copies the example into the answer field only when the field is
 * empty; otherwise the caller asks the user (`confirmed`) before replacing their text.
 */
export function applyTemplate(current: string, template: string, confirmed = false): TemplateApplication {
  if (current.trim() === '' || confirmed) return { value: template, needsConfirmation: false };
  return { value: current, needsConfirmation: true };
}

export function wordCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

/** Words too generic to decide whether a hint is covered. */
const STOP_WORDS = new Set([
  'koja', 'koje', 'koji', 'kako', 'kada', 'gde', 'šta', 'sta', 'ili', 'ako', 'npr', 'odnosno', 'samo', 'baš', 'bas',
  'ova', 'ovaj', 'ovo', 'ove', 'ovog', 'ovom', 'ona', 'onaj', 'ono', 'njena', 'njen', 'njeno', 'njegov', 'njegova',
  'svaki', 'svaka', 'svako', 'svakog', 'sve', 'svih', 'ima', 'nema', 'nije', 'jeste', 'bude', 'biti', 'treba',
  'između', 'izmedju', 'prema', 'preko', 'ispod', 'iznad', 'pored', 'posle', 'pre', 'bez', 'oko', 'kao', 'tako',
  'više', 'vise', 'manje', 'drugi', 'druga', 'drugo', 'jedna', 'jedan', 'jedno', 'deo', 'vrsta', 'opisno', 'opis',
  'jasno', 'panel', 'panela', 'panelu', 'proizvod', 'proizvoda', 'prijavi', 'prijavu', 'prijave', 'postoje', 'postoji',
  'navedite', 'navesti', 'pomenite', 'opišite', 'opisite', 'želite', 'zelite', 'podnosioca', 'podnosilac',
]);

/** Lower-cases and keeps letters/digits so "Teksture," and "teksture" compare equal. */
function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 0);
}

/** Crude stem for Serbian inflection: "tekstura" / "teksture" / "teksturu" share "tekstu". */
function stem(word: string): string {
  return word.length >= 5 ? word.slice(0, Math.max(4, word.length - 2)) : word;
}

/** A hint counts as covered when any of its keywords (stemmed) appears in the answer. Plain keyword comparison, not AI. */
export function isHintCovered(answer: string, hint: string): boolean {
  const answerStems = new Set(tokens(answer).map(stem));
  const keywords = tokens(hint.replace(/\([^)]*\)/g, ' ')).filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^mz$/.test(w));
  if (keywords.length === 0) return true;
  return keywords.some((w) => answerStems.has(stem(w)));
}

export function missingHints(answer: string, hints: string[]): string[] {
  return hints.filter((h) => !isHintCovered(answer, h));
}

export const SHORT_ANSWER_WORDS = 25;

/**
 * Gentle advice on the answer's scope: a short answer, or hints the answer does not seem
 * to mention. Returns null when there is nothing to say.
 */
export function lengthAdvice(answer: string, hints: string[]): string | null {
  if (answer.trim() === '') return null;
  const missing = missingHints(answer, hints);
  const short = wordCount(answer) < SHORT_ANSWER_WORDS;
  if (missing.length === 0) return short ? 'Kratak odgovor. Ako ima još detalja o izgledu, dodajte ih.' : null;
  const list = missing.slice(0, 3).map((h) => h.replace(/\s*\([^)]*\)/g, '').toLowerCase()).join('; ');
  return short ? `Kratak odgovor, dodajte detalje o: ${list}.` : `Možda nedostaju detalji o: ${list}.`;
}

export function placeholderLabel(count: number): string {
  if (count === 1) return 'Popunite 1 oznaku';
  if (count >= 2 && count <= 4) return `Popunite ${count} oznake`;
  return `Popunite ${count} oznaka`;
}
