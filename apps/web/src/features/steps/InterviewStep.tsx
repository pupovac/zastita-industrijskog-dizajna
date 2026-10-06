import { useState } from 'react';
import { useKnowledge, useQuestions, useSaveAnswer, useUploadFile } from '@/api/hooks';
import { fileContentUrl } from '@/api/client';
import type { Fact, Question } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { SaveIndicator } from '@/components/SaveIndicator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DEFERRED_TO_FILING_LABEL, FILING_PHASE_NOTE } from '@/lib/labels';
import { useAutosave } from '@/lib/use-autosave';
import { FactCard } from '../knowledge/FactCard';

export function InterviewStep({ projectId, stepKey }: { projectId: string; stepKey: string }) {
  const questions = useQuestions(projectId, stepKey);
  const knowledge = useKnowledge(projectId);

  const facts: Fact[] = knowledge.data
    ? [
        ...knowledge.data.sections.productFacts,
        ...knowledge.data.sections.visualFeatures.facts,
        ...knowledge.data.sections.applicant.facts,
        ...knowledge.data.sections.designer.facts,
        ...knowledge.data.sections.applicationFields.facts,
        ...knowledge.data.sections.otherFacts,
      ]
    : [];

  if (questions.error) return <ErrorText error={questions.error} />;
  if (!questions.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  if (questions.data.length === 0) return <p className="text-sm text-muted-foreground">Za ovaj korak još nema pitanja.</p>;

  const card = (q: Question) => (
    <QuestionCard
      key={q.id}
      projectId={projectId}
      question={q}
      interpretations={q.answer ? facts.filter((f) => f.userAnswerId === q.answer!.id) : []}
    />
  );
  const drafting = questions.data.filter((q) => !q.deferredToFiling);
  const deferred = questions.data.filter((q) => q.deferredToFiling);

  return (
    <div className="flex flex-col gap-4">
      {drafting.map(card)}
      {deferred.length > 0 && (
        <div className="flex flex-col gap-1 pt-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{DEFERRED_TO_FILING_LABEL}</h2>
          <p className="text-sm text-muted-foreground">
            Ova pitanja nisu uslov za izradu opisa i prikaza. Možete odgovoriti sada ili kasnije. {FILING_PHASE_NOTE}
          </p>
        </div>
      )}
      {deferred.map(card)}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function QuestionCard({
  projectId,
  question,
  interpretations,
}: {
  projectId: string;
  question: Question;
  interpretations: Fact[];
}) {
  const saveAnswer = useSaveAnswer(projectId);
  const upload = useUploadFile(projectId);
  const [value, setValue] = useState(question.answer?.value ?? '');
  const autosave = useAutosave((v: string) => saveAnswer.mutateAsync({ questionId: question.id, value: v }));

  const attach = async (file: File) => {
    const uploaded = await upload.mutateAsync({ file, role: file.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT' });
    await autosave.flush();
    await saveAnswer.mutateAsync({ questionId: question.id, value, attachmentFileId: uploaded.id });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <Section title="Pitanje">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{question.text}</p>
            {question.deferredToFiling ? (
              <Badge variant="muted">{DEFERRED_TO_FILING_LABEL}</Badge>
            ) : (
              question.required && <Badge variant="outline">Obavezno</Badge>
            )}
          </div>
        </Section>
        {question.whyNeeded && (
          <Section title="Zašto nam je ovo potrebno">
            <p className="text-sm text-muted-foreground">{question.whyNeeded}</p>
          </Section>
        )}
        {question.exampleAnswer && (
          <Section title="Primer odgovora">
            <p className="text-sm italic text-muted-foreground">{question.exampleAnswer}</p>
          </Section>
        )}
        <Section title="Moj odgovor">
          <Textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              autosave.schedule(e.target.value);
            }}
            onBlur={() => void autosave.flush()}
          />
          <div className="flex justify-end">
            <SaveIndicator state={autosave.state} error={autosave.error} />
          </div>
        </Section>
        {question.allowsAttachment && (
          <Section title="Opcioni prilog">
            {question.answer?.attachment ? (
              <a
                className="text-sm text-primary underline"
                href={fileContentUrl(question.answer.attachment.id)}
                target="_blank"
                rel="noreferrer"
              >
                {question.answer.attachment.originalName}
              </a>
            ) : null}
            <Input
              type="file"
              accept=".pdf,.docx,.png,.jpg,.jpeg,.svg"
              disabled={upload.isPending}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void attach(file).catch(() => undefined);
                e.target.value = '';
              }}
            />
            <ErrorText error={upload.error ?? saveAnswer.error} />
          </Section>
        )}
        {interpretations.length > 0 && (
          <Section title="AI interpretacija">
            <div className="flex flex-col gap-2">
              {interpretations.map((fact) => (
                <FactCard key={fact.id} projectId={projectId} fact={fact} />
              ))}
            </div>
          </Section>
        )}
      </CardContent>
    </Card>
  );
}
