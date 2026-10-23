import { SourceRequirement } from '@prisma/client';
import { StepGuide } from '../domain/step-guides';

/**
 * Prompt text. The system prompt and the requirements matrix are stable per project and
 * go first, so they can be served from the prompt cache; the step state goes last.
 * Written in Serbian (Latin script) because the model answers the user in that language.
 */

export const AI_DISCLAIMER =
  'AI predlog. Nije pravni savet i ne zamenjuje registrovanog zastupnika. NEPROVERENO – potrebno potvrditi sa ZIS-om ili zastupnikom.';

export const SYSTEM_PROMPT = `Ti si pomoćni proveravač u aplikaciji koja vodi korisnika kroz pripremu prijave za priznanje prava na industrijski dizajn pred Zavodom za intelektualnu svojinu Republike Srbije (ZIS). Proizvod je EPS fasadni termoizolacioni panel.

Tvoj zadatak: pročitaj stanje jednog koraka (ispod), uporedi ga sa opisom koraka, kriterijumom zatvaranja i zahtevima iz „Matrice zahteva ZIS-a" (priložena) i vrati strukturisane nalaze i predloge.

Pravila koja ne smeš da prekršiš:
1. Odgovaraš isključivo na srpskom jeziku, latinicom.
2. Predmet je „prijava za priznanje prava na industrijski dizajn". Nikada ne koristi patentnu terminologiju: ne piši „patent", „patentiranje", „pronalazak", „patentni zahtev", „tehnički problem", „tehnički efekat", „inventivni nivo", „realizacija pronalaska". Industrijski dizajn štiti spoljašnji izgled proizvoda, ne tehničko rešenje.
3. Sve što napišeš je AI zaključak, ne činjenica i ne pravni savet. Ne tvrdi pravnu izvesnost; gde zahtev iz matrice ima status NEPROVERENO, to izričito navedi.
4. Zahteve navodi isključivo oznakama iz priložene matrice (MZ-xxx ili NS-xx). Ne izmišljaj oznake, članove zakona ni izvore koji nisu u matrici. Ako za nalaz nema odgovarajućeg zahteva u matrici, relatedRequirement je null.
5. Ne menjaš stanje: ne odobravaš korak, ne menjaš status, ne potvrđuješ činjenice i ništa ne podnosiš. Korisnik sam prihvata ili odbija svaki predlog.
6. Predlažeš vrednosti samo za dozvoljene ciljeve navedene u kontekstu koraka, sa tačnim id-jevima postojećih zapisa. Ne predlaži ništa što bi promenilo potvrđenu činjenicu korisnika osim ako je očigledno protivrečna drugim potvrđenim podacima — tada to opiši kao nalaz, ne kao predlog.
7. Ne izmišljaj podatke o proizvodu, podnosiocu ili autoru. Ako podatak nedostaje, postavi ga kao otvoreno pitanje (openQuestions) umesto da ga pogađaš.
8. Ozbiljnost nalaza: BLOCKER — bez ispravke korak ne može da se zatvori ili prijava ne bi bila uredna; VISOK — verovatno bi izazvao poziv na uređenje ili rizik za zaštitu; SREDNJI — nedoslednost ili praznina koju treba rešiti pre podnošenja; NIZAK — stilska ili manja napomena.
9. Budi konkretan i kratak. Nalazi i predlozi treba da se odnose na stvarno stanje iz konteksta, ne na opšta uputstva.

Odgovor vraćaš isključivo kao JSON po zadatoj šemi (summary, findings, suggestions, openQuestions).`;

/**
 * Deterministic rendering of the project's copy of the matrix. Sorted by code; user
 * confirmations and timestamps are left out so the text is byte-identical between calls
 * (a prompt-cache hit needs an identical prefix).
 */
export function renderRequirementsMatrix(requirements: SourceRequirement[]): string {
  const rows = [...requirements]
    .filter((r) => r.code)
    .sort((a, b) => a.code!.localeCompare(b.code!, 'en'))
    .map((r) => {
      const status = r.status === 'CONFIRMED' ? 'POTVRĐENO' : 'NEPROVERENO';
      const lines = [
        `### ${r.code} · ${r.area} · ${status}${r.isDiscrepancy ? ' · NEUSKLAĐENOST' : ''}`,
        `Zahtev: ${r.requirementText}`,
        `Klasifikacija: ${r.kind}; izvor: ${r.sourceType} — ${r.sourceReference}`,
      ];
      if (r.impactOnApplication) lines.push(`Uticaj na prijavu: ${r.impactOnApplication}`);
      if (r.precedence) lines.push(`Prednost: ${r.precedence}`);
      return lines.join('\n');
    });
  return `# Matrica zahteva ZIS-a (${rows.length} zahteva)\n\nKlasifikacija: LEGAL_REQUIREMENT = pravni zahtev iz zakona/uredbe; FACT = šta zvanični dokument kaže; AI_INFERENCE i RECOMMENDATION = tumačenje agenta, nije zahtev izvora.\n\n${rows.join('\n\n')}`;
}

export interface StepContextSections {
  /** Human-readable sections, in order; each is rendered under its heading. */
  sections: { heading: string; body: string }[];
}

export function renderStepContext(guide: StepGuide, stepTitle: string, position: number, context: StepContextSections): string {
  const targets = guide.targets
    .map((t) => `- ${t.entity}: polja [${t.fields.join(', ')}]; ${t.idRequired ? 'samo postojeći zapis (id obavezan)' : 'id postojećeg zapisa iz konteksta, ili null za nov zapis'}. ${t.note}`)
    .join('\n');
  const head = [
    `# Korak ${position}: ${stepTitle} (${guide.key})`,
    '',
    `## Šta se radi u koraku\n${guide.description}`,
    '',
    `## Kriterijum zatvaranja koraka\n${guide.closingCriterion}`,
    '',
    `## Dozvoljeni ciljevi predloga u ovom koraku\n${targets}`,
  ];
  const body = context.sections.map((s) => `## ${s.heading}\n${s.body || '(nema podataka)'}`).join('\n\n');
  return `${head.join('\n')}\n\n${body}\n\n## Zadatak\nProveri stanje koraka prema kriterijumu zatvaranja i matrici. Vrati JSON po šemi.`;
}
