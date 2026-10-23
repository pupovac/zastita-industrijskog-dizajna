import type { ProjectStep, StepStatus } from '@/api/types';

/** The part of a step the feedback texts need. */
export type StepRef = Pick<ProjectStep, 'stepKey' | 'position' | 'title' | 'status'>;

export interface StepFeedback {
  tone: 'success' | 'info' | 'warning';
  message: string;
  /** Set when the transition unlocked a later step, so the UI can offer a link to it. */
  unlockedStep: StepRef | null;
}

const q = (text: string) => `„${text}“`;

/**
 * Sentence shown right after a successful status change. It says what happened
 * and what the user does next, because the badge change alone goes unnoticed.
 */
export function stepTransitionFeedback(from: StepStatus, to: StepStatus, next: StepRef | null): StepFeedback {
  switch (to) {
    case 'READY_FOR_REVIEW':
      return {
        tone: 'success',
        message: next
          ? `Korak poslat na pregled. Pregledajte podatke i kliknite ${q('Odobri')} da otključate sledeći korak.`
          : `Korak poslat na pregled. Pregledajte podatke i kliknite ${q('Odobri')} da završite korak.`,
        unlockedStep: null,
      };
    case 'APPROVED':
      return {
        tone: 'success',
        message: next
          ? `Korak odobren. Korak ${next.position} ${q(next.title)} je otključan.`
          : 'Korak odobren. Ovo je poslednji korak projekta.',
        unlockedStep: next,
      };
    case 'IN_PROGRESS':
      return { tone: from === 'APPROVED' ? 'warning' : 'success', message: resumedMessage(from), unlockedStep: null };
    case 'BLOCKED':
      return { tone: 'warning', message: 'Korak blokiran. Razlog je sačuvan i prikazan ispod statusa.', unlockedStep: null };
    case 'WAITING_FOR_USER':
      return { tone: 'info', message: 'Korak čeka korisnika.', unlockedStep: null };
    case 'NOT_STARTED':
      return { tone: 'info', message: 'Korak vraćen na početak.', unlockedStep: null };
  }
}

function resumedMessage(from: StepStatus): string {
  switch (from) {
    case 'NOT_STARTED':
      return 'Korak započet. Unosi se čuvaju odmah; kada završite, pošaljite korak na pregled.';
    case 'READY_FOR_REVIEW':
      return 'Korak vraćen na doradu. Kada izmenite podatke, ponovo ga pošaljite na pregled.';
    case 'APPROVED':
      return 'Korak ponovo otvoren. Kasniji započeti koraci su blokirani dok ovaj korak ponovo ne bude odobren.';
    case 'BLOCKED':
      return 'Blokada uklonjena. Korak je ponovo u toku.';
    case 'WAITING_FOR_USER':
      return 'Rad na koraku nastavljen.';
    case 'IN_PROGRESS':
      return 'Korak je u toku.';
  }
}

/** The step directly before `step`, or null for the first step. */
export function previousStep(steps: StepRef[], step: StepRef): StepRef | null {
  const ordered = [...steps].sort((a, b) => a.position - b.position);
  const index = ordered.findIndex((s) => s.stepKey === step.stepKey);
  return index > 0 ? ordered[index - 1] : null;
}

/** The step directly after `step`, or null for the last step. */
export function nextStep(steps: StepRef[], step: StepRef): StepRef | null {
  const ordered = [...steps].sort((a, b) => a.position - b.position);
  const index = ordered.findIndex((s) => s.stepKey === step.stepKey);
  return index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
}

/**
 * The step whose approval still holds `step` closed, or null when nothing does.
 * Mirrors the backend rule: a step can only start once the previous one is APPROVED.
 */
export function lockedBy(steps: StepRef[], step: StepRef): StepRef | null {
  if (step.status !== 'NOT_STARTED') return null;
  const previous = previousStep(steps, step);
  return previous && previous.status !== 'APPROVED' ? previous : null;
}

export function lockedTooltip(by: StepRef): string {
  return `Otključava se kada korak ${by.position} bude odobren.`;
}

/** Procedural hint for a rejected transition, keyed by the backend error code. */
export function transitionErrorHint(code: string | undefined, previous: StepRef | null): string | null {
  switch (code) {
    case 'PREVIOUS_STEP_NOT_APPROVED':
      return previous ? `Prvo odobrite korak ${previous.position} ${q(previous.title)}.` : null;
    case 'STEP_HAS_OPEN_BLOCKING_ITEMS':
      return `Rešite blokirajuća pitanja i konflikte iz panela ${q('Nedostajuće informacije')} desno, pa pokušajte ponovo.`;
    case 'FINAL_PACKAGE_BLOCKED_BY_BLOCKER':
      return `Rešite nalaze BLOCKER u koraku ${q('Nezavisna provera')}, pa pokušajte ponovo.`;
    case 'APPROVAL_REQUIRES_USER':
      return 'Odobravanje koraka radi isključivo podnosilac.';
    case 'STEP_STATUS_UNCHANGED':
    case 'STEP_TRANSITION_NOT_ALLOWED':
      return 'Status koraka je u međuvremenu promenjen. Osvežite stranicu i pokušajte ponovo.';
    default:
      return null;
  }
}
