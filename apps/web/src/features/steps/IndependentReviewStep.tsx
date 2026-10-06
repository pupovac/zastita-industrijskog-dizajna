import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChangeFindingStatus, useCreateFinding, useReviewChecks, useReviewIssues, useSteps } from '@/api/hooks';
import type { ReviewIssue, Severity } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { AddRecordForm, FieldSpec, options } from '@/components/fields';
import { SourceReference } from '@/components/SourceReference';
import { StepNotice } from '@/components/StepNotice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ACTOR_LABEL, formatDateTime, ISSUE_STATUS_LABEL, SEVERITY_LABEL, SEVERITY_TONE } from '@/lib/labels';

const SEVERITIES: Severity[] = ['BLOCKER', 'HIGH', 'MEDIUM', 'LOW'];

/** Step 11: independent review findings with severity, resolution status and the step they refer to. */
export function IndependentReviewStep({ projectId }: { projectId: string }) {
  const issues = useReviewIssues(projectId);
  const checks = useReviewChecks();
  const steps = useSteps(projectId);
  const create = useCreateFinding(projectId);

  if (issues.error) return <ErrorText error={issues.error} />;
  if (!issues.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  const findings = issues.data.filter((i) => i.type !== 'CONFLICT');
  const openBlockers = findings.filter((i) => i.status === 'OPEN' && i.severity === 'BLOCKER').length;

  const specs: FieldSpec[] = [
    { name: 'title', label: 'Nalaz', type: 'text', required: true, wide: true },
    { name: 'severity', label: 'Ocena', type: 'select', options: options(SEVERITY_LABEL), required: true },
    {
      name: 'stepKey',
      label: 'Korak na koji se odnosi',
      type: 'select',
      options: (steps.data ?? []).map((s) => ({ value: s.stepKey, label: `${s.position}. ${s.title}` })),
    },
    { name: 'checkKey', label: 'Provera', type: 'select', options: (checks.data ?? []).map((c) => ({ value: c.key, label: c.label })) },
    { name: 'description', label: 'Opis', type: 'textarea', wide: true },
  ];

  return (
    <div className="flex flex-col gap-6">
      {openBlockers > 0 ? (
        <StepNotice tone="danger">
          Nerešenih nalaza BLOCKER: {openBlockers}. Korak „Finalni paket prijave" je blokiran dok se ne reše.
        </StepNotice>
      ) : (
        <StepNotice tone="info">Nema nerešenih nalaza BLOCKER.</StepNotice>
      )}
      <div className="flex flex-wrap gap-2">
        {SEVERITIES.map((s) => (
          <Badge key={s} variant={SEVERITY_TONE[s]}>
            {SEVERITY_LABEL[s]}: {findings.filter((f) => f.severity === s && f.status === 'OPEN').length} otvoreno
          </Badge>
        ))}
      </div>
      {findings.length === 0 && <p className="text-sm text-muted-foreground">Još nema nalaza nezavisne provere.</p>}
      {findings.map((issue) => (
        <FindingCard
          key={issue.id}
          projectId={projectId}
          issue={issue}
          stepTitle={steps.data?.find((s) => s.stepKey === issue.stepKey)?.title}
          checkLabel={checks.data?.find((c) => c.key === issue.checkKey)?.label}
        />
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Dodaj nalaz</CardTitle>
          <CardDescription>Recenzent upisuje nalaze preko API-ja; ovde ih možete dodati i ručno.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddRecordForm
            specs={specs}
            submitLabel="Dodaj nalaz"
            defaults={{ type: 'FINDING', sourceType: 'USER' }}
            onSubmit={(values) => create.mutateAsync(values)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function FindingCard({
  projectId,
  issue,
  stepTitle,
  checkLabel,
}: {
  projectId: string;
  issue: ReviewIssue;
  stepTitle?: string;
  checkLabel?: string;
}) {
  const change = useChangeFindingStatus(projectId);
  const [note, setNote] = useState('');
  const setStatus = (status: string) =>
    change.mutate({ issueId: issue.id, status, note: note || undefined }, { onSuccess: () => setNote('') });

  return (
    <Card className="gap-3 py-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={SEVERITY_TONE[issue.severity]}>{SEVERITY_LABEL[issue.severity]}</Badge>
          <Badge variant={issue.status === 'OPEN' ? 'warning' : 'success'}>{ISSUE_STATUS_LABEL[issue.status]}</Badge>
          {issue.type === 'RISK' && <Badge variant="muted">Rizik</Badge>}
          {checkLabel && <span className="text-xs text-muted-foreground">{checkLabel}</span>}
        </div>
        <CardTitle className="text-base leading-snug">{issue.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {issue.description && <p className="text-muted-foreground">{issue.description}</p>}
        {issue.stepKey && (
          <Link to={`/projects/${projectId}/steps/${issue.stepKey}`} className="w-fit text-primary underline">
            Korak: {stepTitle ?? issue.stepKey}
          </Link>
        )}
        {issue.status !== 'OPEN' && (
          <p>
            {ISSUE_STATUS_LABEL[issue.status]}
            {issue.resolvedBy ? ` (${ACTOR_LABEL[issue.resolvedBy]}` : ''}
            {issue.resolvedAt ? `, ${formatDateTime(issue.resolvedAt)})` : issue.resolvedBy ? ')' : ''}
            {issue.resolutionNote ? ` — ${issue.resolutionNote}` : ''}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {issue.status === 'OPEN' ? (
            <>
              <Input
                className="max-w-sm"
                placeholder="Napomena (obavezna za prihvatanje bez ispravke)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button size="sm" variant="outline" disabled={change.isPending} onClick={() => setStatus('RESOLVED')}>
                Označi kao rešeno
              </Button>
              <Button size="sm" variant="ghost" disabled={change.isPending || !note.trim()} onClick={() => setStatus('DISMISSED')}>
                Prihvati bez ispravke
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" disabled={change.isPending} onClick={() => setStatus('OPEN')}>
              Ponovo otvori
            </Button>
          )}
        </div>
        <SourceReference sourceType={issue.sourceType} reference={issue.sourceReference} />
        <ErrorText error={change.error} />
      </CardContent>
    </Card>
  );
}
