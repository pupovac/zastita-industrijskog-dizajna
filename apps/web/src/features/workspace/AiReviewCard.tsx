import { useState } from 'react';
import { useAiReviews, useAiStatus, useAiUsage, useDecideAiSuggestion, useRunAiReview } from '@/api/hooks';
import type { AiFinding, AiReview, AiSuggestion } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { SourceReference } from '@/components/SourceReference';
import { StepNotice } from '@/components/StepNotice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AI_REVIEW_STATUS_LABEL,
  AI_REVIEW_STATUS_TONE,
  AI_SEVERITY_ORDER,
  AI_SEVERITY_TONE,
  AI_SUGGESTION_STATUS_LABEL,
  AI_SUGGESTION_STATUS_TONE,
  aiTargetLabel,
  formatDateTime,
  formatUsd,
} from '@/lib/labels';

/**
 * „AI provera" of the current step: one button, the latest findings grouped by severity,
 * the suggestions the user accepts or rejects one by one, and the history of calls.
 * Nothing here changes the step status; every AI output is labelled as an AI inference.
 */
export function AiReviewCard({ projectId, stepKey }: { projectId: string; stepKey: string }) {
  const status = useAiStatus();
  const reviews = useAiReviews(projectId, stepKey);
  const usage = useAiUsage(projectId);
  const run = useRunAiReview(projectId, stepKey);
  const [historyOpen, setHistoryOpen] = useState(false);

  const configured = status.data?.configured ?? false;
  const latest = reviews.data?.[0];
  const disclaimer = latest?.disclaimer ?? 'AI predlog. Nije pravni savet i ne zamenjuje registrovanog zastupnika. NEPROVERENO – potrebno potvrditi sa ZIS-om ili zastupnikom.';

  return (
    <Card className="py-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-base">AI provera koraka</CardTitle>
          {usage.data && (
            <span className="text-xs text-muted-foreground">
              Potrošnja projekta: {usage.data.calls} {usage.data.calls === 1 ? 'poziv' : 'poziva'} · {formatUsd(usage.data.estimatedCostUsd)} · danas{' '}
              {usage.data.callsToday}/{usage.data.maxCallsPerDay}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {status.data && !configured && <span className="text-xs text-muted-foreground">{status.data.notConfiguredMessage}</span>}
            <Button size="sm" variant="outline" disabled={!configured || run.isPending || status.isLoading} onClick={() => run.mutate()}>
              {run.isPending ? 'AI proverava…' : 'Proveri sa AI'}
            </Button>
          </div>
        </div>
        <CardDescription>{disclaimer}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ErrorText error={run.error ?? reviews.error ?? status.error} />
        {run.isPending && (
          <StepNotice tone="info">AI čita stanje koraka i proverava ga prema Matrici zahteva ZIS-a. Možete nastaviti rad; rezultat se pojavljuje ovde.</StepNotice>
        )}
        {!reviews.data && !reviews.error && <p className="text-sm text-muted-foreground">Učitavanje…</p>}
        {reviews.data?.length === 0 && !run.isPending && (
          <p className="text-sm text-muted-foreground">
            Ovaj korak još nije proveren sa AI. Provera čita podatke koraka i vraća nalaze i predloge koje vi prihvatate ili odbijate.
          </p>
        )}
        {latest && <ReviewResult review={latest} projectId={projectId} stepKey={stepKey} />}

        {reviews.data && reviews.data.length > 0 && (
          <div className="border-t pt-3">
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setHistoryOpen((o) => !o)}>
              {historyOpen ? 'Sakrij istoriju provera' : `Istorija provera (${reviews.data.length})`}
            </Button>
            {historyOpen && (
              <table className="mt-2 w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-2 font-medium">Datum</th>
                    <th className="py-1 pr-2 font-medium">Model</th>
                    <th className="py-1 pr-2 font-medium">Status</th>
                    <th className="py-1 pr-2 font-medium">Sažetak</th>
                    <th className="py-1 pr-2 text-right font-medium">Tokeni (ulaz / izlaz / keš)</th>
                    <th className="py-1 text-right font-medium">Cena</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.data.map((r) => (
                    <tr key={r.id} className="border-t align-top">
                      <td className="py-1 pr-2 whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                      <td className="py-1 pr-2 whitespace-nowrap">{r.model}</td>
                      <td className="py-1 pr-2">
                        <Badge variant={AI_REVIEW_STATUS_TONE[r.status]}>{AI_REVIEW_STATUS_LABEL[r.status]}</Badge>
                      </td>
                      <td className="py-1 pr-2">{r.status === 'OK' ? r.summary : r.errorMessage}</td>
                      <td className="py-1 pr-2 text-right tabular-nums whitespace-nowrap">
                        {r.inputTokens} / {r.outputTokens} / {r.cacheReadTokens}
                      </td>
                      <td className="py-1 text-right tabular-nums whitespace-nowrap">{formatUsd(r.estimatedCostUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewResult({ review, projectId, stepKey }: { review: AiReview; projectId: string; stepKey: string }) {
  const decide = useDecideAiSuggestion(projectId, stepKey);
  const pending = review.suggestions.filter((s) => s.status === 'PROPOSED').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={AI_REVIEW_STATUS_TONE[review.status]}>{AI_REVIEW_STATUS_LABEL[review.status]}</Badge>
        <span>
          {formatDateTime(review.createdAt)} · {review.model} · {review.inputTokens + review.cacheReadTokens + review.cacheCreationTokens} ulaznih /{' '}
          {review.outputTokens} izlaznih tokena
          {review.cacheReadTokens > 0 ? ` (${review.cacheReadTokens} iz keša)` : ''} · {formatUsd(review.estimatedCostUsd)}
        </span>
      </div>

      {review.status !== 'OK' && <StepNotice tone={review.status === 'REFUSED' ? 'warning' : 'danger'}>{review.errorMessage}</StepNotice>}

      {review.status === 'OK' && (
        <>
          <section className="flex flex-col gap-1">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sažetak (AI zaključak)</h3>
            <p className="text-sm">{review.summary || '—'}</p>
          </section>

          {review.terminologyIssues.length > 0 && (
            <StepNotice tone="warning">
              AI odgovor sadrži patentnu terminologiju, koja ne pripada prijavi industrijskog dizajna:{' '}
              {review.terminologyIssues.map((t) => `„${t.match}"`).join(', ')}. Ne preuzimajte te izraze.
            </StepNotice>
          )}

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nalazi ({review.findings.length})</h3>
            {review.findings.length === 0 && <p className="text-sm text-muted-foreground">AI nije prijavio nalaze za ovaj korak.</p>}
            {AI_SEVERITY_ORDER.map((severity) => {
              const items = review.findings.filter((f) => f.severity === severity);
              if (items.length === 0) return null;
              return (
                <div key={severity} className="flex flex-col gap-2">
                  {items.map((finding, i) => (
                    <FindingRow key={`${severity}-${i}`} finding={finding} />
                  ))}
                </div>
              );
            })}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Predlozi ({review.suggestions.length}){pending > 0 ? ` · čeka odluku: ${pending}` : ''}
            </h3>
            {review.suggestions.length === 0 && <p className="text-sm text-muted-foreground">Nema predloga za upis.</p>}
            {review.suggestions.map((suggestion) => (
              <SuggestionRow
                key={suggestion.id}
                suggestion={suggestion}
                pending={decide.isPending && decide.variables?.id === suggestion.id}
                onDecide={(decision) => decide.mutate({ id: suggestion.id, decision })}
              />
            ))}
            <ErrorText error={decide.error} />
          </section>
        </>
      )}
    </div>
  );
}

function FindingRow({ finding }: { finding: AiFinding }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={AI_SEVERITY_TONE[finding.severity]}>{finding.severity}</Badge>
        <span className="text-sm font-medium">{finding.title}</span>
        <Badge variant="warning">AI ZAKLJUČAK</Badge>
        {finding.relatedField && <span className="text-xs text-muted-foreground">{finding.relatedField}</span>}
      </div>
      {finding.detail && <p className="text-sm">{finding.detail}</p>}
      <RequirementSource code={finding.relatedRequirement} requirement={finding.requirement} />
    </div>
  );
}

function SuggestionRow({
  suggestion,
  pending,
  onDecide,
}: {
  suggestion: AiSuggestion;
  pending: boolean;
  onDecide: (decision: 'accept' | 'reject') => void;
}) {
  const decided = suggestion.status !== 'PROPOSED';
  return (
    <div className="flex flex-col gap-2 rounded-md border px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{aiTargetLabel(suggestion.target)}</span>
        <Badge variant={AI_SUGGESTION_STATUS_TONE[suggestion.status]}>{AI_SUGGESTION_STATUS_LABEL[suggestion.status]}</Badge>
        <Badge variant="warning">AI ZAKLJUČAK</Badge>
        {suggestion.target.id && <span className="text-xs text-muted-foreground">id {suggestion.target.id.slice(0, 8)}</span>}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
          <div className="mb-1 text-xs text-muted-foreground">Trenutna vrednost</div>
          <div className="whitespace-pre-wrap">{suggestion.currentValue || <span className="text-muted-foreground">— (prazno)</span>}</div>
        </div>
        <div className="rounded-md border px-3 py-2 text-sm">
          <div className="mb-1 text-xs text-muted-foreground">Predložena vrednost</div>
          <div className="whitespace-pre-wrap">{suggestion.proposedValue}</div>
        </div>
      </div>
      {suggestion.rationale && (
        <p className="text-sm">
          <span className="text-muted-foreground">Obrazloženje: </span>
          {suggestion.rationale}
        </p>
      )}
      <RequirementSource code={suggestion.requirementRef} requirement={suggestion.requirement} />
      <div className="flex flex-wrap items-center gap-2">
        {!decided && (
          <>
            <Button size="sm" disabled={pending} onClick={() => onDecide('accept')}>
              Prihvati
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => onDecide('reject')}>
              Odbij
            </Button>
            <span className="text-xs text-muted-foreground">Prihvaćena vrednost se upisuje kao vaš unos (poreklo: korisnik); potvrda činjenice ostaje poseban korak.</span>
          </>
        )}
        {decided && suggestion.decidedAt && (
          <span className="text-xs text-muted-foreground">
            {AI_SUGGESTION_STATUS_LABEL[suggestion.status]} {formatDateTime(suggestion.decidedAt)}
            {suggestion.appliedReference ? ` · upisano: ${suggestion.appliedReference}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}

/** „Prikaži izvor" for an MZ-xxx reference. A code not found in the project's matrix is said so. */
function RequirementSource({ code, requirement }: { code: string | null; requirement: AiFinding['requirement'] }) {
  if (!code) return <SourceReference sourceType="AGENT_INFERENCE" reference={null} />;
  if (!requirement) {
    return (
      <span className="text-xs text-muted-foreground">
        Izvor: {code} · <span className="font-medium text-amber-700">oznaka nije pronađena u Matrici zahteva ovog projekta</span>
      </span>
    );
  }
  return (
    <SourceReference
      sourceType="ZIS"
      reference={`${requirement.code} · ${requirement.status === 'CONFIRMED' ? 'POTVRĐENO' : 'NEPROVERENO – potrebno potvrditi sa ZIS-om ili registrovanim zastupnikom.'}`}
      detail={`${requirement.text} — ${requirement.sourceReference}`}
      url={requirement.url}
    />
  );
}
