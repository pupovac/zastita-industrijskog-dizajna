/**
 * Module „Tehnička funkcija naspram vizuelnog dizajna" (§11): asked for every
 * significant feature. The answers inform the risk classification; the system
 * never makes the final legal decision.
 */
export const FUNCTION_ANALYSIS_QUESTIONS = [
  'Koja je vizuelna karakteristika?',
  'Koju funkciju ima?',
  'Da li je baš taj konkretan oblik neophodan da bi funkcija radila?',
  'Da li bi isti tehnički rezultat mogao da se dobije drugim oblikom?',
  'Da li je izgled uziman u obzir prilikom izbora tog oblika?',
  'Da li je karakteristika vidljiva tokom normalne upotrebe proizvoda?',
  'Da li je vidljiva pre montaže, a nakon montaže postaje skrivena?',
  'Da li zvanična pravila ukazuju da bi ova karakteristika mogla predstavljati problem za zaštitu?',
] as const;

export const FUNCTION_ANALYSIS_QUESTION_COUNT = FUNCTION_ANALYSIS_QUESTIONS.length;
