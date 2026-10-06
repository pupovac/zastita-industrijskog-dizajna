/**
 * Fields of form D-1 ("Zahtev za priznanje prava na industrijski dizajn"), taken from
 * docs/faza-2/rezultati-inicijalnog-istrazivanja.md, section E, and the matrix area D-1.
 * The texts describe what the form asks for; legal bases are quoted with their matrix codes.
 * „Popunjava Zavod" (D-broj, datum podnošenja) is deliberately not a field here.
 */
export interface D1FieldDefinition {
  key: string;
  /** Field number on the form, or the name of the block. */
  number: string;
  label: string;
  legalBasis: string;
  requirementRefs: string[];
  /** Filled only when it applies (e.g. author is not the applicant); may be marked "Ne primenjuje se". */
  conditional: boolean;
  /** Needed only for filing ("ODLOŽENO ZA PODNOŠENJE"). */
  deferredToFiling: boolean;
  hint: string;
}

export const D1_FIELDS: readonly D1FieldDefinition[] = [
  {
    key: 'APPLICANT',
    number: '1',
    label: 'Poslovno ime i sedište podnosioca, odnosno ime i adresa fizičkog lica; telefon, e-mail, faks',
    legalBasis: 'Zakon čl. 19 t. 1; Uredba čl. 8 t. 1',
    requirementRefs: ['MZ-146'],
    conditional: false,
    deferredToFiling: false,
    hint: 'Status podnosioca određuje iznos takse (MZ-082).',
  },
  {
    key: 'REPRESENTATIVE',
    number: '2',
    label: 'Punomoćnik (ime i adresa), odnosno zajednički predstavnik; telefon, e-mail, faks',
    legalBasis: 'Uredba čl. 8 t. 2–3',
    requirementRefs: ['MZ-153', 'MZ-145'],
    conditional: true,
    deferredToFiling: true,
    hint: 'Obavezno samo za strano lice (MZ-150).',
  },
  {
    key: 'PRODUCT_TITLE',
    number: '3',
    label: 'Stvaran i kratak naziv predmeta zaštite',
    legalBasis: 'Zakon čl. 19 t. 4',
    requirementRefs: ['MZ-063'],
    conditional: false,
    deferredToFiling: false,
    hint: 'Bez trgovačkog imena (MZ-210, MZ-211).',
  },
  {
    key: 'FILING_TYPE',
    number: '4',
    label: 'Pojedinačna (jedan predmet zaštite) / višestruka (broj predmeta, do 100)',
    legalBasis: 'Zakon čl. 18 st. 4–5, čl. 19 t. 3',
    requirementRefs: ['MZ-123'],
    conditional: false,
    deferredToFiling: false,
    hint: 'Prati odluku iz koraka „Strategija zaštite".',
  },
  {
    key: 'AUTHOR',
    number: '5',
    label: 'Ime autora ako on ne podnosi prijavu, ili napomena da autor ne želi da bude naveden',
    legalBasis: 'Zakon čl. 19 t. 2',
    requirementRefs: ['MZ-142', 'MZ-143'],
    conditional: true,
    deferredToFiling: false,
    hint: 'Ako autor ne želi da bude naveden, prilaže se izjava autora.',
  },
  {
    key: 'LEGAL_BASIS',
    number: '6',
    label: 'Pravni osnov za podnošenje prijave ako autor nije podnosilac',
    legalBasis: 'Zakon čl. 19 t. 5',
    requirementRefs: ['MZ-142'],
    conditional: true,
    deferredToFiling: false,
    hint: 'Npr. ugovor o radu, ugovor o delu, ugovor o prenosu.',
  },
  {
    key: 'PRIORITY',
    number: '7',
    label: 'Zatraženo pravo prvenstva i osnov',
    legalBasis: 'Zakon čl. 25–26',
    requirementRefs: ['MZ-161', 'MZ-162'],
    conditional: true,
    deferredToFiling: false,
    hint: 'Samo ako postoji ranija prijava u inostranstvu ili izlaganje na sajmu.',
  },
  {
    key: 'DEFERRED_PUBLICATION',
    number: '8',
    label: 'Napomena da se zahteva odloženo objavljivanje od 12 meseci',
    legalBasis: 'Zakon čl. 19 st. 2',
    requirementRefs: ['MZ-130', 'MZ-132'],
    conditional: true,
    deferredToFiling: false,
    hint: 'Prati odluku iz koraka „Strategija zaštite".',
  },
  {
    key: 'DISCLAIMER',
    number: '9',
    label: 'Naznaka da se na određenom elementu dizajna ne traži isključivo pravo',
    legalBasis: 'Zakon čl. 41 st. 2',
    requirementRefs: ['MZ-064'],
    conditional: true,
    deferredToFiling: false,
    hint: 'Element mora biti imenovan i u opisu.',
  },
  {
    key: 'FEES',
    number: '10',
    label: 'Plaćene takse: (a) jedan predmet; (b) više predmeta; ukupno',
    legalBasis: 'Uredba čl. 8 t. 10',
    requirementRefs: ['MZ-080'],
    conditional: false,
    deferredToFiling: true,
    hint: 'Iznos zavisi od statusa podnosioca i načina podnošenja.',
  },
  {
    key: 'ATTACHMENTS',
    number: 'Prilozi',
    label:
      'Označiti: dva primerka prikaza; dva primerka opisa; izjava o zajedničkom predstavniku; punomoćje; dokaz o pravu prvenstva; dokaz o uplati takse',
    legalBasis: 'Obrazac D-1 (Z-04); Uredba čl. 9',
    requirementRefs: ['MZ-071', 'MZ-070'],
    conditional: false,
    deferredToFiling: false,
    hint: 'Spisak priloga se generiše i u finalnom paketu.',
  },
  {
    key: 'SIGNATURE',
    number: 'Potpis',
    label: 'Potpis podnosioca zahteva',
    legalBasis: 'Zakon čl. 19 t. 6; Uredba čl. 8 t. 11',
    requirementRefs: ['NS-08'],
    conditional: false,
    deferredToFiling: true,
    hint: 'Da li je potreban i pečat: NEPROVERENO – potrebno potvrditi sa ZIS-om ili registrovanim zastupnikom (P-02).',
  },
];

export const NOT_APPLICABLE_VALUE = 'Ne primenjuje se';

export function d1Field(key: string): D1FieldDefinition | undefined {
  return D1_FIELDS.find((f) => f.key === key);
}

export interface D1FieldState {
  key: string;
  value: string;
  deferredToFiling: boolean;
  missing: boolean;
}

/** Merges stored values with the definitions: every field appears, missing ones flagged. */
export function d1FieldStates(
  values: { fieldKey: string; value: string; deferredToFiling: boolean | null }[],
): D1FieldState[] {
  return D1_FIELDS.map((field) => {
    const stored = values.find((v) => v.fieldKey === field.key);
    const value = stored?.value ?? '';
    return {
      key: field.key,
      value,
      deferredToFiling: stored?.deferredToFiling ?? field.deferredToFiling,
      missing: !value.trim(),
    };
  });
}

export function d1HasValue(values: { fieldKey: string; value: string }[], key: string): boolean {
  return Boolean(values.find((v) => v.fieldKey === key)?.value.trim());
}
