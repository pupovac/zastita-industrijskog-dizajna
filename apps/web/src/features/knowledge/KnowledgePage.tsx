import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { fileContentUrl } from '@/api/client';
import { useAnswerOpenQuestion, useKnowledge } from '@/api/hooks';
import type { Fact, OpenQuestion } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { KindBadge } from '@/components/StatusBadge';
import { SourceReference } from '@/components/SourceReference';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  EXTRACTION_STATUS_LABEL,
  FILE_ROLE_LABEL,
  formatDateTime,
  FUNCTIONALITY_RISK_LABEL,
  SEVERITY_LABEL,
} from '@/lib/labels';
import { FactCard } from './FactCard';

/** "Znanje o projektu": the persistent, structured project memory shared by the user and all agents. */
export function KnowledgePage() {
  const { projectId = '' } = useParams();
  const knowledge = useKnowledge(projectId);

  if (knowledge.error) return <ErrorText error={knowledge.error} />;
  if (!knowledge.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  const { sections: s } = knowledge.data;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-xl font-semibold">Znanje o projektu</h1>
      <p className="text-sm text-muted-foreground">
        Svaka stavka nosi oznaku vrste i porekla. Samo stavke koje potvrdite dobijaju status „POTVRĐENA ČINJENICA
        KORISNIKA".
      </p>

      <Section title="Potvrđene činjenice o proizvodu" count={s.productFacts.length}>
        <FactList projectId={projectId} facts={s.productFacts} />
      </Section>

      <Section title="Vizuelne karakteristike" count={s.visualFeatures.features.length + s.visualFeatures.facts.length}>
        {s.visualFeatures.features.map((f) => (
          <Item key={f.id}>
            <div className="flex flex-wrap items-center gap-2">
              <KindBadge kind={f.kind} />
              {f.functionalityRisk && <Badge variant="outline">{FUNCTIONALITY_RISK_LABEL[f.functionalityRisk]}</Badge>}
              {f.variant && <span className="text-xs text-muted-foreground">Varijanta: {f.variant.name}</span>}
            </div>
            <div className="font-medium">{f.name}</div>
            {f.description && <div className="text-sm">{f.description}</div>}
            <SourceReference sourceType={f.sourceType} reference={f.sourceReference} />
          </Item>
        ))}
        <FactList projectId={projectId} facts={s.visualFeatures.facts} />
      </Section>

      <Section title="Podnosilac">
        <Field label="Naziv / ime" value={s.applicant.name} />
        <Field label="Adresa" value={s.applicant.address} />
        <Field label="Zastupnik" value={s.applicant.representative} />
        <FactList projectId={projectId} facts={s.applicant.facts} />
      </Section>

      <Section title="Autor / dizajner">
        <Field label="Ime" value={s.designer.name} />
        <FactList projectId={projectId} facts={s.designer.facts} />
      </Section>

      <Section title="Dostavljeni dokumenti" count={s.documents.length}>
        {s.documents.map((d) => (
          <Item key={d.id}>
            <div className="flex flex-wrap items-center gap-2">
              <a href={fileContentUrl(d.id)} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                {d.originalName}
              </a>
              <Badge variant="muted">{FILE_ROLE_LABEL[d.role]}</Badge>
              <Badge variant="outline">{EXTRACTION_STATUS_LABEL[d.extractionStatus]}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">{d.summary}</div>
          </Item>
        ))}
      </Section>

      <Section title="Zvanična ZIS pravila" count={s.zisRules.length}>
        {s.zisRules.map((r) => (
          <Item key={r.id}>
            <div className="flex flex-wrap items-center gap-2">
              <KindBadge kind={r.kind} />
              {!r.verified && <span className="text-xs text-amber-700">Nije potvrđeno</span>}
            </div>
            <div className="text-sm">{r.requirementText}</div>
            {r.impactOnApplication && (
              <div className="text-sm text-muted-foreground">Uticaj na prijavu: {r.impactOnApplication}</div>
            )}
            <SourceReference
              sourceType={r.sourceType}
              reference={r.sourceReference}
              url={r.sourceDocument.url ?? r.sourceDocument.source.url}
              detail={[
                r.sourceDocument.source.name,
                r.sourceDocument.title,
                r.section || r.sourceDocument.section,
                r.sourceDocument.accessedAt ? `pristupljeno ${formatDateTime(r.sourceDocument.accessedAt)}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            />
          </Item>
        ))}
      </Section>

      <Section title="Pronađeni slični dizajni" count={s.priorDesigns.length}>
        {s.priorDesigns.map((d) => (
          <Item key={d.id}>
            <div className="flex flex-wrap items-center gap-2">
              <KindBadge kind={d.kind} />
              {d.registrationNumber && <span className="text-xs text-muted-foreground">{d.registrationNumber}</span>}
            </div>
            <div className="font-medium">{d.title}</div>
            {d.similarityNotes && <div className="text-sm">{d.similarityNotes}</div>}
            <SourceReference sourceType={d.sourceType} reference={d.sourceReference} url={d.url} />
          </Item>
        ))}
      </Section>

      <Section title="Donete odluke" count={s.decisions.length}>
        {s.decisions.map((d) => (
          <Item key={d.id}>
            <div className="font-medium">{d.title}</div>
            {d.rationale && <div className="text-sm text-muted-foreground">{d.rationale}</div>}
            <div className="text-xs text-muted-foreground">
              {d.decidedBy === 'USER' ? 'Odluka korisnika' : d.decidedBy} · {formatDateTime(d.createdAt)}
            </div>
          </Item>
        ))}
      </Section>

      <Section title="Otvorena pitanja" count={s.openQuestions.filter((q) => q.status === 'OPEN').length}>
        {s.openQuestions.map((q) => (
          <OpenQuestionItem key={q.id} projectId={projectId} question={q} />
        ))}
      </Section>

      <Section title="Rizici" count={s.risks.filter((r) => r.status === 'OPEN').length}>
        {s.risks.map((r) => (
          <Item key={r.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={r.severity === 'BLOCKER' || r.severity === 'HIGH' ? 'danger' : 'warning'}>
                {SEVERITY_LABEL[r.severity]}
              </Badge>
              <Badge variant="muted">{r.type === 'CONFLICT' ? 'Konflikt' : 'Rizik'}</Badge>
              {r.status !== 'OPEN' && <Badge variant="success">Zatvoreno</Badge>}
            </div>
            <div className="font-medium">{r.title}</div>
            {r.description && <div className="text-sm text-muted-foreground">{r.description}</div>}
          </Item>
        ))}
      </Section>

      <Section
        title="Polja finalne prijave"
        count={s.applicationFields.sections.length + s.applicationFields.facts.length}
      >
        {s.applicationFields.sections.map((sec) => (
          <Item key={sec.id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{sec.title}</span>
              {sec.required && <Badge variant="outline">Obavezno</Badge>}
              <Badge variant={sec.confirmed ? 'success' : 'warning'}>{sec.confirmed ? 'Potvrđeno' : 'Nije potvrđeno'}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {sec.latestVersion ? `Verzija ${sec.latestVersion.versionNumber}` : 'Još nema verzije'}
            </div>
          </Item>
        ))}
        <FactList projectId={projectId} facts={s.applicationFields.facts} />
      </Section>

      {s.otherFacts.length > 0 && (
        <Section title="Ostalo" count={s.otherFacts.length}>
          <FactList projectId={projectId} facts={s.otherFacts} />
        </Section>
      )}
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {title}
          {count !== undefined && <span className="text-sm font-normal text-muted-foreground">({count})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {children}
        {count === 0 && <p className="text-sm text-muted-foreground">Nema unosa.</p>}
      </CardContent>
    </Card>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1 rounded-md border px-3 py-2">{children}</div>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value || <span className="text-muted-foreground">nije uneto</span>}</span>
    </div>
  );
}

/** Confirmed facts first, then items waiting for the user's confirmation. */
function FactList({ projectId, facts }: { projectId: string; facts: Fact[] }) {
  if (facts.length === 0) return null;
  const confirmed = facts.filter((f) => f.verified);
  const pending = facts.filter((f) => !f.verified);
  return (
    <div className="flex flex-col gap-2">
      {confirmed.map((f) => (
        <FactCard key={f.id} projectId={projectId} fact={f} />
      ))}
      {pending.length > 0 && (
        <div className="pt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Čeka vašu potvrdu</div>
      )}
      {pending.map((f) => (
        <FactCard key={f.id} projectId={projectId} fact={f} />
      ))}
    </div>
  );
}

function OpenQuestionItem({ projectId, question }: { projectId: string; question: OpenQuestion }) {
  const answer = useAnswerOpenQuestion(projectId);
  const [value, setValue] = useState('');
  return (
    <Item>
      <div className="flex flex-wrap items-center gap-2">
        {question.blocking && <Badge variant="danger">Blokira</Badge>}
        <Badge variant={question.status === 'OPEN' ? 'warning' : 'success'}>
          {question.status === 'OPEN' ? 'Otvoreno' : 'Odgovoreno'}
        </Badge>
      </div>
      <div className="text-sm font-medium">{question.text}</div>
      {question.whyNeeded && <div className="text-sm text-muted-foreground">{question.whyNeeded}</div>}
      {question.status === 'OPEN' ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            answer.mutate({ id: question.id, answer: value });
          }}
        >
          <Textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder="Vaš odgovor" />
          <div>
            <Button size="sm" type="submit" disabled={!value.trim() || answer.isPending}>
              Sačuvaj odgovor
            </Button>
          </div>
          <ErrorText error={answer.error} />
        </form>
      ) : (
        <div className="text-sm">{question.answer}</div>
      )}
    </Item>
  );
}
