import type { Question } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DEFERRED_TO_FILING_LABEL } from '@/lib/labels';
import { OpenQuestionItem } from '../knowledge/KnowledgePage';
import { useOpenQuestions, useQuestions } from '@/api/hooks';
import { QuestionList } from './InterviewStep';

/**
 * Questions and open questions that agents attached to a filing step (12–14). They are
 * "ODLOŽENO ZA PODNOŠENJE": shown here, never blocking the drafting steps. Step 12 also
 * collects the filing-only questions asked during the interview.
 */
export function FilingQuestions({ projectId, stepKey }: { projectId: string; stepKey: string }) {
  const own = useQuestions(projectId, stepKey);
  const interview = useQuestions(projectId, 'PRODUCT_INTERVIEW');
  const open = useOpenQuestions(projectId, stepKey);
  const includeInterview = stepKey === 'D1_FORM_DATA';

  const questions: Question[] = [
    ...(own.data ?? []),
    ...(includeInterview ? (interview.data ?? []).filter((q) => q.deferredToFiling) : []),
  ];
  const openQuestions = open.data ?? [];
  if (questions.length === 0 && openQuestions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pitanja za podnošenje</CardTitle>
        <CardDescription>
          {DEFERRED_TO_FILING_LABEL}: ova pitanja su potrebna samo za podnošenje i ne blokiraju izradu opisa i prikaza.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ErrorText error={own.error ?? interview.error ?? open.error} />
        {openQuestions.map((q) => (
          <OpenQuestionItem key={q.id} projectId={projectId} question={q} />
        ))}
        {questions.length > 0 && <QuestionList projectId={projectId} questions={questions} />}
      </CardContent>
    </Card>
  );
}
