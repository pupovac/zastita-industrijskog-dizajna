import { DefaultQuestion, defaultQuestionData } from '../projects/default-questions';

/**
 * "Osveži pitanja i primere": brings the default questions of an existing project up to
 * the current bank. Only guidance changes (whyNeeded, exampleAnswer, hints, priority);
 * the question text, its position and — above all — the user's answers are never touched.
 * Pure planning so the rule is unit-tested; QuestionsService applies the plan.
 */
export interface ExistingQuestion {
  id: string;
  stepKey: string;
  position: number;
  text: string;
  defaultKey: string | null;
  whyNeeded: string;
  exampleAnswer: string;
  includeHintsJson: string;
  avoidHintsJson: string;
  highPriority: boolean;
}

export interface QuestionGuidanceUpdate {
  defaultKey: string;
  whyNeeded: string;
  exampleAnswer: string;
  includeHintsJson: string;
  avoidHintsJson: string;
  highPriority: boolean;
}

export interface DefaultQuestionRefreshPlan {
  updates: { id: string; data: QuestionGuidanceUpdate }[];
  /** New bank questions, with the position they get in their step. */
  additions: { data: ReturnType<typeof defaultQuestionData>; position: number }[];
  unchanged: string[];
}

const normalize = (text: string) => text.trim().replace(/\s+/g, ' ');

/** A question created before `defaultKey` existed is recognised by its original wording. */
function matchesLegacy(question: ExistingQuestion, bankQuestion: DefaultQuestion): boolean {
  if (question.defaultKey) return false;
  const wordings = [bankQuestion.text, ...bankQuestion.legacyTexts].map(normalize);
  return wordings.includes(normalize(question.text));
}

export function planDefaultQuestionRefresh(existing: ExistingQuestion[], bank: DefaultQuestion[]): DefaultQuestionRefreshPlan {
  const plan: DefaultQuestionRefreshPlan = { updates: [], additions: [], unchanged: [] };
  const claimed = new Set<string>();
  const lastPosition = new Map<string, number>();
  for (const q of existing) lastPosition.set(q.stepKey, Math.max(lastPosition.get(q.stepKey) ?? 0, q.position));

  for (const bankQuestion of bank) {
    const match =
      existing.find((q) => !claimed.has(q.id) && q.defaultKey === bankQuestion.defaultKey) ??
      existing.find((q) => !claimed.has(q.id) && matchesLegacy(q, bankQuestion));
    if (!match) {
      const position = (lastPosition.get(bankQuestion.stepKey) ?? 0) + 1;
      lastPosition.set(bankQuestion.stepKey, position);
      plan.additions.push({ data: defaultQuestionData(bankQuestion), position });
      continue;
    }
    claimed.add(match.id);
    const data: QuestionGuidanceUpdate = {
      defaultKey: bankQuestion.defaultKey,
      whyNeeded: bankQuestion.whyNeeded,
      exampleAnswer: bankQuestion.exampleAnswer,
      includeHintsJson: JSON.stringify(bankQuestion.includeHints),
      avoidHintsJson: JSON.stringify(bankQuestion.avoidHints),
      highPriority: bankQuestion.highPriority,
    };
    const changed = (Object.keys(data) as (keyof QuestionGuidanceUpdate)[]).some((k) => data[k] !== match[k]);
    if (changed) plan.updates.push({ id: match.id, data });
    else plan.unchanged.push(match.id);
  }
  return plan;
}
