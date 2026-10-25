import { DefaultQuestion } from '../projects/default-questions';
import { ExistingQuestion, planDefaultQuestionRefresh } from './default-question-refresh';

const bankQuestion = (over: Partial<DefaultQuestion> = {}): DefaultQuestion => ({
  defaultKey: 'front-surface',
  stepKey: 'PRODUCT_INTERVIEW',
  interviewGroup: 'D',
  text: 'Kako izgleda prednja površina?',
  legacyTexts: ['Kako izgleda vidljiva prednja površina panela (tekstura, završna obrada, boja)?'],
  whyNeeded: 'Nova obrazloženja.',
  exampleAnswer: 'Tekstura je [zrnasta], boja [nijansa].',
  includeHints: ['Vrsta teksture', 'Sjaj'],
  avoidHints: ['Svojstva sloja'],
  required: true,
  highPriority: false,
  ...over,
});

const existing = (over: Partial<ExistingQuestion> = {}): ExistingQuestion => ({
  id: 'q1',
  stepKey: 'PRODUCT_INTERVIEW',
  position: 2,
  text: 'Kako izgleda vidljiva prednja površina panela (tekstura, završna obrada, boja)?',
  defaultKey: null,
  whyNeeded: 'Staro.',
  exampleAnswer: 'Fina zrnasta tekstura, mat završni sloj, svetlosiva boja.',
  includeHintsJson: '[]',
  avoidHintsJson: '[]',
  highPriority: false,
  ...over,
});

describe('planDefaultQuestionRefresh', () => {
  it('matches by defaultKey and updates only the guidance fields', () => {
    const plan = planDefaultQuestionRefresh([existing({ defaultKey: 'front-surface', text: 'Tekst koji je korisnik već video' })], [bankQuestion()]);
    expect(plan.additions).toEqual([]);
    expect(plan.updates).toEqual([
      {
        id: 'q1',
        data: {
          defaultKey: 'front-surface',
          whyNeeded: 'Nova obrazloženja.',
          exampleAnswer: 'Tekstura je [zrnasta], boja [nijansa].',
          includeHintsJson: JSON.stringify(['Vrsta teksture', 'Sjaj']),
          avoidHintsJson: JSON.stringify(['Svojstva sloja']),
          highPriority: false,
        },
      },
    ]);
    // Nothing about the question text or its position is in the update: an answered question keeps its wording.
    expect(Object.keys(plan.updates[0].data)).not.toContain('text');
    expect(Object.keys(plan.updates[0].data)).not.toContain('position');
  });

  it('adopts a pre-defaultKey question by its legacy wording and assigns the key', () => {
    const plan = planDefaultQuestionRefresh([existing()], [bankQuestion()]);
    expect(plan.updates.map((u) => u.id)).toEqual(['q1']);
    expect(plan.updates[0].data.defaultKey).toBe('front-surface');
  });

  it('adds bank questions that the project does not have, after the last position of the step', () => {
    const plan = planDefaultQuestionRefresh(
      [existing({ defaultKey: 'front-surface', position: 6 })],
      [bankQuestion(), bankQuestion({ defaultKey: 'prior-disclosure', legacyTexts: [], text: 'Da li je panel javno prikazan?', interviewGroup: 'G', highPriority: true })],
    );
    expect(plan.additions).toHaveLength(1);
    expect(plan.additions[0].position).toBe(7);
    expect(plan.additions[0].data).toMatchObject({ defaultKey: 'prior-disclosure', interviewGroup: 'G', highPriority: true });
  });

  it('reports questions that already carry the current guidance as unchanged', () => {
    const current = existing({
      defaultKey: 'front-surface',
      whyNeeded: 'Nova obrazloženja.',
      exampleAnswer: 'Tekstura je [zrnasta], boja [nijansa].',
      includeHintsJson: JSON.stringify(['Vrsta teksture', 'Sjaj']),
      avoidHintsJson: JSON.stringify(['Svojstva sloja']),
    });
    const plan = planDefaultQuestionRefresh([current], [bankQuestion()]);
    expect(plan).toEqual({ updates: [], additions: [], unchanged: ['q1'] });
  });

  it('leaves agent-added questions alone and never matches one existing question twice', () => {
    const agentQuestion = existing({ id: 'agent', text: 'Pitanje koje je dodao agent', position: 9 });
    const plan = planDefaultQuestionRefresh([existing(), agentQuestion], [bankQuestion(), bankQuestion({ defaultKey: 'duplicate-wording' })]);
    expect(plan.updates.map((u) => u.id)).toEqual(['q1']);
    expect(plan.additions.map((a) => a.data.defaultKey)).toEqual(['duplicate-wording']);
    expect(plan.additions[0].position).toBe(10);
  });
});
