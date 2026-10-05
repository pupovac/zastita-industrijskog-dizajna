import { StepKey } from '../domain/steps';

/**
 * Starter interview questions about the product's appearance. They only collect
 * information from the user; they make no legal claims. Specialized agents can add
 * further questions through the API.
 */
export interface DefaultQuestion {
  stepKey: StepKey;
  text: string;
  whyNeeded: string;
  exampleAnswer: string;
  required: boolean;
}

export const DEFAULT_QUESTIONS: DefaultQuestion[] = [
  {
    stepKey: 'PRODUCT_INTERVIEW',
    text: 'Kako se proizvod zove i kako biste ga ukratko opisali?',
    whyNeeded: 'Naziv i kratak opis koristimo kao polaznu tačku za sve dalje korake i za usklađivanje sa prikazima.',
    exampleAnswer: 'Fasadni termoizolacioni panel od EPS-a sa nanetim završnim slojem.',
    required: true,
  },
  {
    stepKey: 'PRODUCT_INTERVIEW',
    text: 'Kako izgleda vidljiva prednja površina panela (tekstura, završna obrada, boja)?',
    whyNeeded: 'Spoljašnji izgled je ono što se beleži; potreban nam je vaš opis onoga što se vidi.',
    exampleAnswer: 'Fina zrnasta tekstura, mat završni sloj, svetlosiva boja.',
    required: true,
  },
  {
    stepKey: 'PRODUCT_INTERVIEW',
    text: 'Kako izgledaju ivice i spojevi panela posmatrano spolja?',
    whyNeeded: 'Oblik ivica je vidljiva karakteristika koju treba tačno zabeležiti i kasnije posebno proceniti.',
    exampleAnswer: 'Stepenasti profil na dužim ivicama, sa ravnim kratkim ivicama.',
    required: true,
  },
  {
    stepKey: 'PRODUCT_INTERVIEW',
    text: 'Koje dimenzije i proporcije panel ima?',
    whyNeeded: 'Proporcije utiču na ukupan izgled i moraju se slagati sa prikazima.',
    exampleAnswer: '1000 × 500 mm, debljina 100 mm.',
    required: false,
  },
  {
    stepKey: 'PRODUCT_INTERVIEW',
    text: 'Da li postoji više varijanti izgleda (boje, teksture, dimenzije)?',
    whyNeeded: 'Varijante se beleže odvojeno kako bi se kasnije odlučilo kako ih obuhvatiti.',
    exampleAnswer: 'Da, tri boje završnog sloja: bela, svetlosiva, antracit.',
    required: false,
  },
  {
    stepKey: 'PRODUCT_INTERVIEW',
    text: 'Ko je autor (dizajner) izgleda proizvoda?',
    whyNeeded: 'Podatak o autoru se beleži kao deo osnovnih podataka projekta.',
    exampleAnswer: 'Ime i prezime, adresa.',
    required: true,
  },
];
