import { useRef, useState } from 'react';
import {
  useInterviewGroups,
  useKnowledge,
  useQuestions,
  useRefreshDefaultQuestions,
  useSaveAnswer,
  useUploadFile,
} from '@/api/hooks';
import { fileContentUrl } from '@/api/client';
import type { Fact, Question } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { SaveIndicator } from '@/components/SaveIndicator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  applyTemplate,
  countPlaceholders,
  firstPlaceholder,
  lengthAdvice,
  placeholderLabel,
  splitPlaceholders,
  wordCount,
} from '@/lib/answer-template';
import { DEFERRED_TO_FILING_LABEL, FILING_PHASE_NOTE } from '@/lib/labels';
import { useAutosave } from '@/lib/use-autosave';
import { FactCard } from '../knowledge/FactCard';

export function InterviewStep({ projectId, stepKey }: { projectId: string; stepKey: string }) {
  const questions = useQuestions(projectId, stepKey);
  const groups = useInterviewGroups();
  const refresh = useRefreshDefaultQuestions(projectId);
  const [selected, setSelected] = useState<string | null>(null);

  if (questions.error) return <ErrorText error={questions.error} />;
  if (!questions.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  if (questions.data.length === 0) return <p className="text-sm text-muted-foreground">Za ovaj korak još nema pitanja.</p>;

  // Small groups (§13): A–G in order, then anything without a group.
  const tabs = [
    ...(groups.data ?? []).map((g) => ({ key: g.key, title: `${g.key}. ${g.title}`, highPriority: g.highPriority })),
    { key: OTHER_GROUP, title: 'Ostala pitanja', highPriority: false },
  ]
    .map((tab) => ({
      ...tab,
      questions: questions.data.filter((q) => (q.interviewGroup ?? OTHER_GROUP) === tab.key),
    }))
    .filter((tab) => tab.questions.length > 0);
  const active = tabs.find((t) => t.key === selected) ?? tabs[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <nav aria-label="Grupe pitanja" className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const answered = tab.questions.filter((q) => q.answer?.value.trim()).length;
            return (
              <Button
                key={tab.key}
                size="sm"
                variant={tab.key === active.key ? 'default' : 'outline'}
                onClick={() => setSelected(tab.key)}
              >
                {tab.title}
                <span className="tabular-nums opacity-70">
                  {answered}/{tab.questions.length}
                </span>
                {tab.highPriority && <Badge variant="danger">VISOK PRIORITET</Badge>}
              </Button>
            );
          })}
        </nav>
        <div className="flex flex-col items-end gap-1">
          <Button size="sm" variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            {refresh.isPending ? 'Osvežavanje…' : 'Osveži pitanja i primere'}
          </Button>
          {refresh.data && (
            <p className="text-xs text-muted-foreground">
              Ažurirano {refresh.data.updated}, dodato {refresh.data.added}, bez izmena {refresh.data.unchanged}. Odgovori su netaknuti.
            </p>
          )}
          <ErrorText error={refresh.error} />
        </div>
      </div>
      {active.highPriority && (
        <p className="text-sm text-muted-foreground">
          Ova grupa je visokog prioriteta: odgovori mogu biti relevantni za procenu novosti i prava prvenstva.
        </p>
      )}
      <QuestionList projectId={projectId} questions={active.questions} />
    </div>
  );
}

const OTHER_GROUP = '_';

/** Questions with the PITANJE / ZAŠTO / PRIMER / MOJ ODGOVOR / PRILOG layout; filing-only ones last. */
export function QuestionList({ projectId, questions }: { projectId: string; questions: Question[] }) {
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
  const card = (q: Question) => (
    <QuestionCard
      key={q.id}
      projectId={projectId}
      question={q}
      interpretations={q.answer ? facts.filter((f) => f.userAnswerId === q.answer!.id) : []}
    />
  );
  const drafting = questions.filter((q) => !q.deferredToFiling);
  const deferred = questions.filter((q) => q.deferredToFiling);

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

/** Example text with `[oznaka]` markers highlighted, so the user sees what to replace. */
function TemplateText({ text }: { text: string }) {
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap">
      {splitPlaceholders(text).map((segment, i) =>
        segment.placeholder ? (
          <mark key={i} className="rounded-sm bg-amber-100 px-0.5 font-medium text-amber-900">
            {segment.text}
          </mark>
        ) : (
          <span key={i}>{segment.text}</span>
        ),
      )}
    </p>
  );
}

function HintList({ title, items, tone }: { title: string; items: string[]; tone: 'include' | 'avoid' }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <div className={`text-xs font-medium uppercase tracking-wide ${tone === 'include' ? 'text-emerald-800' : 'text-red-800'}`}>{title}</div>
      <ul className="list-disc space-y-0.5 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "Kako da odgovorite": the example answer as a template with highlighted markers,
 * what to mention, what to leave out, and the button that copies the template.
 */
function HowToAnswer({ question, onUseTemplate, answerEmpty }: { question: Question; onUseTemplate: () => void; answerEmpty: boolean }) {
  // Open by default only while the answer is empty; afterwards the user toggles it (it must not snap shut on "Koristi kao šablon").
  const [initiallyOpen] = useState(answerEmpty);
  const hasGuidance = question.exampleAnswer || question.includeHints.length > 0 || question.avoidHints.length > 0;
  if (!hasGuidance) return null;
  return (
    <details open={initiallyOpen} className="rounded-md border bg-muted/30 px-3 py-2">
      <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-muted-foreground">Kako da odgovorite</summary>
      <div className="flex flex-col gap-4 pt-3">
        {question.exampleAnswer && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Uzorni odgovor (šablon)</div>
              <Button size="sm" variant="outline" onClick={onUseTemplate}>
                Koristi kao šablon
              </Button>
            </div>
            <TemplateText text={question.exampleAnswer} />
            <p className="text-xs text-muted-foreground">
              Šablon nije tvrdnja o vašem proizvodu. Zamenite svaku <mark className="rounded-sm bg-amber-100 px-0.5 text-amber-900">[oznaku]</mark>{' '}
              svojim podatkom i obrišite ono što ne važi.
            </p>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <HintList title="Obavezno pomenite" items={question.includeHints} tone="include" />
          <HintList title="Ne pišite" items={question.avoidHints} tone="avoid" />
        </div>
      </div>
    </details>
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autosave = useAutosave((v: string) => saveAnswer.mutateAsync({ questionId: question.id, value: v }));

  const change = (next: string) => {
    setValue(next);
    autosave.schedule(next);
  };

  const useTemplate = () => {
    let applied = applyTemplate(value, question.exampleAnswer);
    if (applied.needsConfirmation) {
      if (!window.confirm('Polje „Moj odgovor" već sadrži tekst. Zameniti ga šablonom?')) return;
      applied = applyTemplate(value, question.exampleAnswer, true);
    }
    change(applied.value);
    // Put the cursor on the first [oznaka] once the new value is rendered.
    const marker = firstPlaceholder(applied.value);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      if (marker) el.setSelectionRange(marker.start, marker.end);
    });
  };

  const attach = async (file: File) => {
    const uploaded = await upload.mutateAsync({ file, role: file.type.startsWith('image/') ? 'PHOTO' : 'DOCUMENT' });
    await autosave.flush();
    await saveAnswer.mutateAsync({ questionId: question.id, value, attachmentFileId: uploaded.id });
  };

  const placeholders = countPlaceholders(value);
  const words = wordCount(value);
  const advice = placeholders > 0 ? null : lengthAdvice(value, question.includeHints);
  const confirmBlockedReason =
    placeholders > 0 ? `Odgovor još sadrži ${placeholders} nepopunjenih oznaka […]; popunite ih pre potvrde.` : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <Section title="Pitanje">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">{question.text}</p>
            <div className="flex shrink-0 flex-wrap justify-end gap-1">
              {question.highPriority && <Badge variant="danger">VISOK PRIORITET</Badge>}
              {question.deferredToFiling ? (
                <Badge variant="muted">{DEFERRED_TO_FILING_LABEL}</Badge>
              ) : (
                question.required && <Badge variant="outline">Obavezno</Badge>
              )}
            </div>
          </div>
        </Section>
        {question.whyNeeded && (
          <Section title="Zašto nam je ovo potrebno">
            <p className="text-sm text-muted-foreground">{question.whyNeeded}</p>
          </Section>
        )}
        <HowToAnswer question={question} onUseTemplate={useTemplate} answerEmpty={value.trim() === ''} />
        <Section title="Moj odgovor">
          <Textarea
            ref={textareaRef}
            value={value}
            rows={Math.min(16, Math.max(4, Math.ceil(value.length / 90) + value.split('\n').length))}
            onChange={(e) => change(e.target.value)}
            onBlur={() => void autosave.flush()}
            aria-describedby={`answer-meta-${question.id}`}
          />
          <div id={`answer-meta-${question.id}`} className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              {placeholders > 0 && <Badge variant="warning">{placeholderLabel(placeholders)}</Badge>}
              {words > 0 && <span className="tabular-nums">{words} {words === 1 ? 'reč' : 'reči'}</span>}
              {advice && <span>{advice}</span>}
            </div>
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
                <FactCard key={fact.id} projectId={projectId} fact={fact} confirmBlockedReason={confirmBlockedReason} />
              ))}
            </div>
          </Section>
        )}
      </CardContent>
    </Card>
  );
}
