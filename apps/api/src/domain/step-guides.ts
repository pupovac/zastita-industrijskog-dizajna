import { FactCategory } from '@prisma/client';
import { StepKey } from './steps';

/**
 * What each wizard step does inside this application and when it counts as done.
 * These texts describe the application's own process; they make no legal claims —
 * the legal requirements come only from the "Matrica zahteva ZIS-a" in the database.
 * The AI review sends the guide of the current step together with the step's data.
 */

/** An entity/field the AI may propose a value for in a given step. */
export interface SuggestionTargetSpec {
  entity: SuggestionEntity;
  /** Allowed field names; `*` means the field is a key (D-1 field key, strategy item key). */
  fields: readonly string[];
  /** Only existing records may be targeted (the suggestion must carry an `id`). */
  idRequired: boolean;
  note: string;
}

export const SUGGESTION_ENTITIES = [
  'Project',
  'Fact',
  'DesignFeature',
  'PriorDesign',
  'Representation',
  'ApplicationSection',
  'D1FieldValue',
  'ProtectionStrategyItem',
  'OpenQuestion',
] as const;
export type SuggestionEntity = (typeof SUGGESTION_ENTITIES)[number];

export const PROJECT_FIELDS = [
  'productName',
  'productSummary',
  'applicantName',
  'applicantAddress',
  'designerName',
  'representativeName',
] as const;

export const DESIGN_FEATURE_FIELDS = [
  'name',
  'description',
  'category',
  'categoryRationale',
  'functionalityRisk',
  'riskRationale',
] as const;
export const PRIOR_DESIGN_FIELDS = ['similarFeatures', 'differingFeatures', 'similarityNotes', 'searchResult'] as const;
export const REPRESENTATION_FIELDS = ['viewName', 'purpose', 'featureShown', 'notes', 'mediumRationale', 'assessmentNote'] as const;

const openQuestion: SuggestionTargetSpec = {
  entity: 'OpenQuestion',
  fields: ['text'],
  idRequired: false,
  note: 'Novo otvoreno pitanje za korisnika (proposedValue je tekst pitanja, rationale je zašto nam je odgovor potreban).',
};
const project: SuggestionTargetSpec = {
  entity: 'Project',
  fields: PROJECT_FIELDS,
  idRequired: false,
  note: 'Osnovni podaci projekta; id nije potreban.',
};
const fact = (note: string): SuggestionTargetSpec => ({
  entity: 'Fact',
  fields: ['statement', 'value'],
  idRequired: false,
  note,
});

export interface StepGuide {
  key: StepKey;
  /** What happens in the step, in the application's own terms. */
  description: string;
  /** When the step is considered complete in the application. */
  closingCriterion: string;
  /** Matrix areas (`areaCode`) most relevant for the step. */
  areaCodes: readonly string[];
  /** Research phases (matrix `phases[].number`) whose requirements apply to the step. */
  researchPhases: readonly number[];
  /** Category of a new Fact created from an accepted suggestion. */
  factCategory: FactCategory;
  /** Whether the extracted text of uploaded documents is part of the context. */
  includeDocumentText: boolean;
  targets: readonly SuggestionTargetSpec[];
}

export const STEP_GUIDES: readonly StepGuide[] = [
  {
    key: 'PROJECT_SETUP',
    description:
      'Korisnik unosi osnovne podatke projekta: naziv i kratak opis proizvoda, podnosioca (ime/poslovno ime i adresa), autora dizajna i zastupnika ako postoji.',
    closingCriterion: 'Popunjeni su naziv proizvoda, podnosilac i autor; nema očiglednih nedoslednosti između tih podataka.',
    areaCodes: ['author_applicant', 'representation_agent'],
    researchPhases: [3],
    factCategory: 'PRODUCT',
    includeDocumentText: false,
    targets: [project, fact('Izjava korisnika o proizvodu ili podnosiocu.'), openQuestion],
  },
  {
    key: 'ZIS_RESEARCH',
    description:
      'U bazu su uvezeni zvanični izvori ZIS-a (Z-xx), nalazi iz tih izvora i Matrica zahteva ZIS-a. Korisnik pregleda izvore i njihove lokalne kopije.',
    closingCriterion: 'Izvori i matrica su uvezeni; korisnik je pregledao spisak izvora i zna koji zahtevi su NEPROVERENI.',
    areaCodes: [],
    researchPhases: [],
    factCategory: 'OTHER',
    includeDocumentText: false,
    targets: [openQuestion],
  },
  {
    key: 'REQUIREMENTS_SUMMARY',
    description:
      'Prikazuju se „Rezultati inicijalnog istraživanja" (A–N) i matrica zahteva sa statusima POTVRĐENO / NEPROVERENO i neusklađenostima (NS-xx).',
    closingCriterion: 'Korisnik je pročitao sažetak; otvorena pitanja ka ZIS-u ili zastupniku (P-xx) su evidentirana kao otvorena pitanja.',
    areaCodes: ['mandatory_documents'],
    researchPhases: [],
    factCategory: 'OTHER',
    includeDocumentText: false,
    targets: [openQuestion],
  },
  {
    key: 'PRODUCT_INTERVIEW',
    description:
      'Intervju u grupama A–G: korisnik odgovara na pitanja o proizvodu, izgledu, podnosiocu, autoru, varijantama i ranijem objavljivanju. Iz odgovora se beleže izjave korisnika; tek potvrđena izjava postaje činjenica.',
    closingCriterion: 'Sva obavezna pitanja imaju odgovor; ključne izjave (naziv, izgled, podnosilac, autor, objavljivanje) su potvrđene kao činjenice korisnika.',
    areaCodes: ['author_applicant', 'novelty_individual_character', 'priority', 'locarno'],
    researchPhases: [3],
    factCategory: 'PRODUCT',
    includeDocumentText: false,
    targets: [fact('Izjava korisnika izvedena iz odgovora; za postojeću izjavu navedi id.'), project, openQuestion],
  },
  {
    key: 'DOCUMENT_UPLOAD',
    description:
      'Korisnik otprema postojeću dokumentaciju (fotografije, tehničke crteže, rendere, CAD izvoze, dokumente). Sistem čuva original, izvlači tekst i metapodatke i označava neslaganja između dokumenata kao konflikte koje rešava korisnik.',
    closingCriterion: 'Dostavljeni su dokumenti koji pokazuju spoljašnji izgled proizvoda; dokumenti koji zahtevaju ručnu proveru su pregledani; konflikti su rešeni.',
    areaCodes: ['representations', 'attachments'],
    researchPhases: [7],
    factCategory: 'PRODUCT',
    includeDocumentText: true,
    targets: [fact('Izjava o sadržaju dokumenta koju korisnik treba da potvrdi.'), openQuestion],
  },
  {
    key: 'VISUAL_ANALYSIS',
    description:
      'Mapa vizuelnih karakteristika proizvoda (kategorije A–D) sa klasifikacijom rizika tehničke funkcije i odgovorima na modul „tehnička funkcija naspram vizuelnog dizajna". Karakteristike kategorije B se ne izbacuju automatski.',
    closingCriterion: 'Svaka vidljiva karakteristika ima kategoriju, opis i obrazloženje; karakteristike sa rizikom imaju obrazloženje; ključne karakteristike su potvrđene.',
    areaCodes: ['exclusions', 'novelty_individual_character', 'description'],
    researchPhases: [4],
    factCategory: 'VISUAL',
    includeDocumentText: true,
    targets: [
      {
        entity: 'DesignFeature',
        fields: DESIGN_FEATURE_FIELDS,
        idRequired: false,
        note:
          'Postojeća karakteristika: navedi id i polje. Nova karakteristika: bez id, polje "name". category ∈ {A_VISUAL, B_MIXED, C_TECHNICAL, D_UNCLEAR}; functionalityRisk ∈ {LOW_RISK, NEEDS_FURTHER_REVIEW, HIGH_FUNCTIONAL_DEPENDENCE}.',
      },
      fact('Izjava o vizuelnoj karakteristici.'),
      openQuestion,
    ],
  },
  {
    key: 'PRIOR_DESIGN_SEARCH',
    description:
      'Pretraga postojećih dizajna po bazama (ZIS, DesignView, WIPO…) sa izveštajem o pokrivenosti (šta je pretraženo, šta je blokirano). Za svaki pronađeni dizajn beleže se sličnosti i razlike; „rezultat pretrage" se drži odvojeno od „pravnog zaključka".',
    closingCriterion: 'Izveštaj o pokrivenosti postoji za svaku planiranu bazu; za pronađene dizajne su upisane sličnosti i razlike; praznine u pokrivenosti su jasno navedene.',
    areaCodes: ['novelty_individual_character', 'locarno'],
    researchPhases: [5],
    factCategory: 'OTHER',
    includeDocumentText: false,
    targets: [
      { entity: 'PriorDesign', fields: PRIOR_DESIGN_FIELDS, idRequired: true, note: 'Postojeći pronađeni dizajn (id obavezan).' },
      openQuestion,
    ],
  },
  {
    key: 'PROTECTION_STRATEGY',
    description:
      'Odluke strategije zaštite: vrsta prijave (FILING_TYPE), postupanje sa varijantama (VARIANT_RESOLUTION), odloženo objavljivanje (DEFERRED_PUBLICATION), pravo prvenstva (PRIORITY_CLAIM). Agenti predlažu PREPORUKE sa referencama na matricu; korisnik ih usvaja kao odluke.',
    closingCriterion: 'Sve četiri stavke imaju vrednost i obrazloženje sa referencama MZ-xxx; korisnik ih je usvojio.',
    areaCodes: ['single_multiple', 'deferred_publication', 'priority', 'filing_method', 'deadlines'],
    researchPhases: [6],
    factCategory: 'OTHER',
    includeDocumentText: false,
    targets: [
      {
        entity: 'ProtectionStrategyItem',
        fields: ['FILING_TYPE', 'VARIANT_RESOLUTION', 'DEFERRED_PUBLICATION', 'PRIORITY_CLAIM'],
        idRequired: false,
        note: 'field je ključ stavke; proposedValue je vrednost (za FILING_TYPE: SINGLE | SEPARATE | MULTIPLE). Bez id.',
      },
      openQuestion,
    ],
  },
  {
    key: 'REPRESENTATION_PLAN',
    description:
      'Plan prikaza: spisak pogleda (perspektiva, spreda, sa strane, odozgo, detalji…) sa svrhom, karakteristikom koju pokazuju, obaveznim/preporučenim statusom, medijumom i ocenom podobnosti dostavljenog materijala.',
    closingCriterion: 'Svaki planirani prikaz ima svrhu i karakteristiku koju pokazuje; obavezni prikazi su pokriveni dostavljenim fajlovima sa ocenom „prihvatljivo".',
    areaCodes: ['representations'],
    researchPhases: [7],
    factCategory: 'VISUAL',
    includeDocumentText: true,
    targets: [
      { entity: 'Representation', fields: REPRESENTATION_FIELDS, idRequired: true, note: 'Postojeći prikaz (id obavezan).' },
      openQuestion,
    ],
  },
  {
    key: 'DESCRIPTION_DRAFTING',
    description:
      'Izrada opisa industrijskog dizajna po sekcijama (naziv, opis, karakteristični vizuelni elementi, namena, spisak prikaza, spisak priloga) sa istorijom verzija. Tekst piše agent za izradu opisa, AI nacrt („Generiši nacrt opisa") i korisnik; sistem ga samo čuva, verzionira i proverava terminologiju. AI tekst je AI ZAKLJUČAK dok ga korisnik ne potvrdi; gde podatak nedostaje, AI ostavlja marker „[POTREBNA DOPUNA: …]" umesto pretpostavke.',
    closingCriterion:
      'Sve obavezne sekcije imaju tekst bez patentne terminologije i bez markera „[POTREBNA DOPUNA]", usklađen sa potvrđenim karakteristikama i prikazima; korisnik je potvrdio sekcije.',
    areaCodes: ['description', 'representations', 'exclusions'],
    researchPhases: [8],
    factCategory: 'APPLICATION_FIELD',
    includeDocumentText: true,
    targets: [
      {
        entity: 'ApplicationSection',
        fields: ['content'],
        idRequired: true,
        note: 'Nova verzija teksta sekcije (id sekcije obavezan; proposedValue je ceo predloženi tekst sekcije).',
      },
      openQuestion,
    ],
  },
  {
    key: 'INDEPENDENT_REVIEW',
    description:
      'Nezavisna provera opisa i prikaza po 17 kontrolnih tačaka; nalazi imaju ozbiljnost (BLOCKER/VISOK/SREDNJI/NIZAK) i status rešavanja. Nerešen BLOCKER zatvara finalni paket. Tekst sekcija može biti AI nacrt, zato posebno proveriti: (a) funkcionalni ili patentni jezik (opis funkcije, konstrukcije, montaže, materijala kao tehničke osobine ili prednosti; izrazi koje hvata provera terminologije); (b) preostale markere „[POTREBNA DOPUNA: …]" — svaki je BLOCKER za potvrdu sekcije; (c) nesklad opisa sa Planom prikaza (pozivanje na nepostojeći prikaz, opisan deo koji nijedan prikaz ne pokazuje, suprotna geometrija); (d) tvrdnje o proizvodu, podnosiocu ili autoru koje nemaju izvor u potvrđenim činjenicama ili izjavama korisnika.',
    closingCriterion: 'Svaka kontrolna tačka je razmotrena; nema otvorenih nalaza BLOCKER; ostali nalazi su rešeni ili ih je korisnik svesno prihvatio.',
    areaCodes: ['description', 'representations', 'mandatory_documents', 'exclusions'],
    researchPhases: [9],
    factCategory: 'APPLICATION_FIELD',
    includeDocumentText: true,
    targets: [
      { entity: 'ApplicationSection', fields: ['content'], idRequired: true, note: 'Ispravljen tekst sekcije (id sekcije obavezan).' },
      openQuestion,
    ],
  },
  {
    key: 'D1_FORM_DATA',
    description:
      'Podaci za obrazac D-1 po poljima (podnosilac, punomoćnik, naziv predmeta zaštite, vrsta prijave, autor, pravni osnov, prvenstvo, odloženo objavljivanje, naznaka elementa bez isključivog prava, takse, prilozi, potpis). Polja odložena za podnošenje su označena.',
    closingCriterion: 'Sva polja koja se primenjuju imaju vrednost (ili „Ne primenjuje se") usklađenu sa potvrđenim činjenicama i strategijom; korisnik ih je potvrdio.',
    areaCodes: ['form_d1', 'author_applicant', 'representation_agent', 'fees', 'attachments'],
    researchPhases: [8, 10],
    factCategory: 'APPLICATION_FIELD',
    includeDocumentText: false,
    targets: [
      {
        entity: 'D1FieldValue',
        fields: [
          'APPLICANT',
          'REPRESENTATIVE',
          'PRODUCT_TITLE',
          'FILING_TYPE',
          'AUTHOR',
          'LEGAL_BASIS',
          'PRIORITY',
          'DEFERRED_PUBLICATION',
          'DISCLAIMER',
          'FEES',
          'ATTACHMENTS',
          'SIGNATURE',
        ],
        idRequired: false,
        note: 'field je ključ polja D-1; proposedValue je predložena vrednost polja. Bez id.',
      },
      openQuestion,
    ],
  },
  {
    key: 'FINAL_PACKAGE',
    description:
      'Generisanje finalnog paketa: opis, DOCX, PDF, podaci za D-1, indeks prikaza, checklista za podnošenje, spisak priloga, izveštaj o izvorima i spisak nerešenih pravnih pitanja. Finalna verzija se ne generiše dok nisu potvrđeni svi obavezni podaci.',
    closingCriterion: 'Checklista je kompletna, nema nerešenih BLOCKER nalaza, generisan je finalni paket.',
    areaCodes: ['mandatory_documents', 'attachments', 'filing_method', 'fees', 'deadlines'],
    researchPhases: [10],
    factCategory: 'APPLICATION_FIELD',
    includeDocumentText: false,
    targets: [openQuestion],
  },
  {
    key: 'FINAL_APPLICANT_REVIEW',
    description:
      'Završni pregled paketa od strane podnosioca ili zastupnika sa potpisanom potvrdom pregleda. Sistem nikada ne podnosi prijavu.',
    closingCriterion: 'Podnosilac ili zastupnik je pregledao finalni paket i evidentirao potvrdu pregleda.',
    areaCodes: ['filing_method', 'deadlines', 'representation_agent'],
    researchPhases: [10],
    factCategory: 'OTHER',
    includeDocumentText: false,
    targets: [openQuestion],
  },
];

export function stepGuide(key: StepKey): StepGuide {
  return STEP_GUIDES.find((g) => g.key === key)!;
}

/** Whether the AI may propose a value for this entity/field in this step. */
export function isAllowedTarget(guide: StepGuide, entity: string, field: string, hasId: boolean): boolean {
  const spec = guide.targets.find((t) => t.entity === entity);
  if (!spec) return false;
  if (!spec.fields.includes(field)) return false;
  if (spec.idRequired && !hasId) return false;
  return true;
}
