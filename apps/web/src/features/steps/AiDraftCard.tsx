import { useEffect, useRef, useState } from 'react';
import { descriptionDraftDocxUrl } from '@/api/client';
import { useAiDraftEstimate, useAiDrafts, useAiStatus, useCancelAiDraft, useDecideAiDraftSection, useGenerateAiDraft, useProject, useRefreshProjectAfterDraft } from '@/api/hooks';
import type { AiDraft, AiDraftEstimate, AiDraftMode, AiDraftSection } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { StepNotice } from '@/components/StepNotice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { diffWords } from '@/lib/diff';
import { estimatePages, formatPages } from '@/lib/draft-length';
import {
  AI_DRAFT_GENERATION_LABEL,
  AI_DRAFT_GENERATION_TONE,
  AI_DRAFT_MODE_LABEL,
  AI_DRAFT_SECTION_STATUS_LABEL,
  AI_DRAFT_SECTION_STATUS_TONE,
  AI_DRAFT_STATUS_LABEL,
  AI_DRAFT_STATUS_TONE,
  formatDateTime,
  formatDuration,
  formatUsd,
} from '@/lib/labels';
import { cn } from '@/lib/utils';

const DEFAULT_DISCLAIMER = 'AI predlog. Nije pravni savet i ne zamenjuje registrovanog zastupnika.';

const number = (n: number) => n.toLocaleString('sr-Latn-RS');
const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));

/**
 * „AI nacrt opisa" (step 10). The job runs on the server, one model call per section; the
 * card shows the estimate before the start, the progress per section while it runs (the
 * page can be left and reopened) and the result afterwards. Every finished section is
 * already a new, unconfirmed version of that section; the user compares it with the previous
 * text, accepts or rejects it per section and confirms it in the editor below. A section
 * with a „[POTREBNA DOPUNA]" marker cannot be confirmed.
 */
export function AiDraftCard({ projectId, totalWords }: { projectId: string; totalWords: number }) {
  const status = useAiStatus();
  const project = useProject(projectId);
  const drafts = useAiDrafts(projectId);
  const generate = useGenerateAiDraft(projectId);
  const cancel = useCancelAiDraft(projectId);
  const refreshProject = useRefreshProjectAfterDraft(projectId);
  const [pagesInput, setPagesInput] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const configured = status.data?.configured ?? false;
  const defaultPages = project.data?.targetDescriptionPages ?? status.data?.draftTargetPages ?? 5;
  const targetPages = pagesInput === null ? defaultPages : Number(pagesInput);
  const validPages = Number.isInteger(targetPages) && targetPages >= 1 && targetPages <= 30;
  const latest = drafts.data?.[0];
  const active = latest?.active ?? false;
  const disclaimer = latest?.disclaimer ?? DEFAULT_DISCLAIMER;
  const estimate = useAiDraftEstimate(projectId, 'GENERATE', validPages ? targetPages : defaultPages, configured && validPages && !active);

  // Each finished section is already in the project: refresh the sections editor below as the job advances.
  const writtenRef = useRef<string>('');
  useEffect(() => {
    if (!latest) return;
    const signature = `${latest.id}:${latest.progress.written}:${latest.status}`;
    if (writtenRef.current && writtenRef.current !== signature) void refreshProject();
    writtenRef.current = signature;
  }, [latest, refreshProject]);

  const run = (mode: AiDraftMode) => {
    if (!validPages) return;
    generate.mutate({ mode, targetPages });
  };
  const busy = !configured || !validPages || generate.isPending || status.isLoading || active;

  return (
    <Card className="py-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-base">AI nacrt opisa</CardTitle>
          <span className="text-xs text-muted-foreground">
            Trenutni tekst svih sekcija: {totalWords} reči ≈ {formatPages(estimatePages(totalWords))} (cilj {defaultPages} str.)
          </span>
          <div className="ml-auto">
            <Button asChild size="sm" variant="outline">
              <a href={descriptionDraftDocxUrl(projectId)}>Preuzmi nacrt (DOCX)</a>
            </Button>
          </div>
        </div>
        <CardDescription>{disclaimer}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="ai-draft-pages" className="text-xs">
              Ciljna dužina (strane)
            </Label>
            <Input
              id="ai-draft-pages"
              type="number"
              min={1}
              max={30}
              className="w-24"
              value={pagesInput ?? String(defaultPages)}
              aria-invalid={!validPages}
              disabled={active}
              onChange={(e) => setPagesInput(e.target.value)}
            />
          </div>
          <Button size="sm" disabled={busy} onClick={() => run('GENERATE')}>
            {generate.isPending && generate.variables?.mode === 'GENERATE' ? 'Pokretanje…' : 'Generiši nacrt opisa'}
          </Button>
          <Button size="sm" variant="outline" disabled={busy || totalWords === 0} onClick={() => run('EXPAND')}>
            {generate.isPending && generate.variables?.mode === 'EXPAND' ? 'Pokretanje…' : 'Proširi i doteraj postojeći tekst'}
          </Button>
          {status.data && !configured && <span className="text-xs text-muted-foreground">{status.data.notConfiguredMessage}</span>}
        </div>
        <p className="text-xs text-muted-foreground">
          „Generiši" piše sve sekcije iz početka iz podataka koraka 1–9 (činjenice, intervju, karakteristike, plan prikaza, slike, dokumenti).
          „Proširi" zadržava svaku činjenicu koju ste napisali i dopunjuje je. Nacrt se piše sekciju po sekciju (naziv → karakteristični elementi →
          opis → namena → spisak prikaza → spisak priloga); svaka završena sekcija se odmah upisuje kao nova verzija. Podrazumevana ciljna dužina
          se podešava u koraku 1; AI joj teži kroz iscrpnost, ne kroz ponavljanje. Gde podatak ne postoji, AI ostavlja marker „[POTREBNA DOPUNA: …]"
          umesto pretpostavke.
        </p>
        {!active && configured && validPages && <EstimateLine estimate={estimate.data} loading={estimate.isLoading} error={estimate.error} />}
        <ErrorText error={generate.error ?? drafts.error ?? status.error} />
        {!drafts.data && !drafts.error && <p className="text-sm text-muted-foreground">Učitavanje…</p>}
        {drafts.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">Nacrt još nije generisan. Svaki AI tekst je nova, nepotvrđena verzija sekcije koju pregledate i potvrđujete.</p>
        )}
        {latest && active && (
          <DraftProgress draft={latest} cancelling={cancel.isPending} cancelError={cancel.error} onCancel={() => cancel.mutate(latest.id)} />
        )}
        {latest && !active && <DraftResult draft={latest} projectId={projectId} />}

        {drafts.data && drafts.data.length > 0 && (
          <div className="border-t pt-3">
            <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setHistoryOpen((o) => !o)}>
              {historyOpen ? 'Sakrij istoriju generisanja' : `Istorija generisanja (${drafts.data.length})`}
            </Button>
            {historyOpen && (
              <table className="mt-2 w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-2 font-medium">Datum</th>
                    <th className="py-1 pr-2 font-medium">Režim</th>
                    <th className="py-1 pr-2 font-medium">Status</th>
                    <th className="py-1 pr-2 text-right font-medium">Sekcije</th>
                    <th className="py-1 pr-2 text-right font-medium">Cilj / dobijeno</th>
                    <th className="py-1 pr-2 text-right font-medium">Trajanje</th>
                    <th className="py-1 pr-2 text-right font-medium">Tokeni (ulaz / izlaz / keš)</th>
                    <th className="py-1 text-right font-medium">Cena</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.data.map((d) => (
                    <tr key={d.id} className="border-t align-top">
                      <td className="py-1 pr-2 whitespace-nowrap">{formatDateTime(d.createdAt)}</td>
                      <td className="py-1 pr-2">{AI_DRAFT_MODE_LABEL[d.mode]}</td>
                      <td className="py-1 pr-2">
                        <Badge variant={AI_DRAFT_STATUS_TONE[d.status]}>{AI_DRAFT_STATUS_LABEL[d.status]}</Badge>
                      </td>
                      <td className="py-1 pr-2 text-right tabular-nums whitespace-nowrap">
                        {d.progress.written}/{d.progress.total}
                      </td>
                      <td className="py-1 pr-2 text-right tabular-nums whitespace-nowrap">
                        {d.targetPages} str. / {d.progress.written > 0 ? formatPages(d.totals.pages) : '—'}
                      </td>
                      <td className="py-1 pr-2 text-right tabular-nums whitespace-nowrap">{formatDuration(d.durationMs)}</td>
                      <td className="py-1 pr-2 text-right tabular-nums whitespace-nowrap">
                        {d.inputTokens} / {d.outputTokens} / {d.cacheReadTokens}
                      </td>
                      <td className="py-1 text-right tabular-nums whitespace-nowrap">{formatUsd(d.estimatedCostUsd)}</td>
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

/** „Procena pre pokretanja": calls, time, cost and context size, with a hint when the context is large. */
function EstimateLine({ estimate, loading, error }: { estimate: AiDraftEstimate | undefined; loading: boolean; error: unknown }) {
  if (error) return <ErrorText error={error} />;
  if (loading || !estimate) return <p className="text-xs text-muted-foreground">Procena generisanja…</p>;
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border px-3 py-2 text-sm">
        <div className="text-xs text-muted-foreground">Procena pre pokretanja (orijentaciono)</div>
        <div className="tabular-nums">
          Oko {estimate.calls} poziva · očekivano {minutes(estimate.durationSeconds.min)}–{minutes(estimate.durationSeconds.max)} min ·{' '}
          {estimate.estimatedCostUsd === null ? 'cena nepoznata za ovaj model' : `oko ${formatUsd(estimate.estimatedCostUsd)}`} · kontekst ~{number(estimate.inputTokensPerCall)}{' '}
          ulaznih tokena po pozivu ({estimate.imageCount} {estimate.imageCount === 1 ? 'slika' : 'slika'}) · ~{number(estimate.outputTokens)} izlaznih tokena ukupno · {estimate.model},
          effort {estimate.effort}
        </div>
      </div>
      {estimate.warnings.map((w, i) => (
        <StepNotice key={i} tone="warning">
          {w}
        </StepNotice>
      ))}
    </div>
  );
}

/** The running job: which section is being written, what is done, the cost so far, and „Prekini". */
function DraftProgress({ draft, cancelling, cancelError, onCancel }: { draft: AiDraft; cancelling: boolean; cancelError: unknown; onCancel: () => void }) {
  const current = draft.sections.find((s) => s.key === draft.progress.current);
  const words = draft.sections.reduce((n, s) => n + s.wordCount, 0);
  return (
    <div className="flex flex-col gap-3">
      <StepNotice tone="info" role="status">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            {draft.status === 'QUEUED' ? 'Generisanje čeka na red…' : current ? `Piše: ${current.title}…` : 'Generisanje u toku…'} {draft.progress.written}/{draft.progress.total}{' '}
            sekcija
            {draft.cancelRequested ? ' · prekid zatražen, završava tekuću sekciju' : ''}
          </span>
          <Button size="sm" variant="outline" className="ml-auto" disabled={cancelling || draft.cancelRequested} onClick={onCancel}>
            Prekini
          </Button>
        </div>
        <p className="mt-1 text-xs">
          Generisanje radi na serveru: možete da napustite stranicu i vratite se. Svaka završena sekcija je odmah upisana kao nova, nepotvrđena
          verzija. Do sada: {number(words)} reči · {draft.inputTokens + draft.cacheReadTokens + draft.cacheCreationTokens} ulaznih / {draft.outputTokens}{' '}
          izlaznih tokena · {formatUsd(draft.estimatedCostUsd)} · {formatDuration(draft.durationMs)}.
        </p>
      </StepNotice>
      <ErrorText error={cancelError} />
      <ol className="flex flex-col gap-1 text-sm">
        {draft.sections.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-1.5">
            <span className="font-medium">{s.title}</span>
            <Badge variant={AI_DRAFT_GENERATION_TONE[s.generation]}>{AI_DRAFT_GENERATION_LABEL[s.generation]}</Badge>
            <span className="text-xs text-muted-foreground tabular-nums">
              {s.generation === 'DONE' || s.generation === 'TRUNCATED' ? `${s.wordCount}/${s.targetWords} reči · ${formatDuration(s.durationMs)} · ${formatUsd(s.estimatedCostUsd)}` : `cilj ~${s.targetWords} reči`}
            </span>
            {s.errorMessage && <span className="text-xs text-red-900">{s.errorMessage}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function DraftResult({ draft, projectId }: { draft: AiDraft; projectId: string }) {
  const decide = useDecideAiDraftSection(projectId);
  const written = draft.sections.filter((s) => s.generation === 'DONE' || s.generation === 'TRUNCATED');
  const pending = written.filter((s) => s.status === 'PROPOSED' || s.status === 'HELD').length;
  const totalIssues = draft.sections.reduce((n, s) => n + s.terminologyIssues.length, 0);
  const truncated = draft.sections.filter((s) => s.generation === 'TRUNCATED').length;

  const onDecide = (section: AiDraftSection, decision: 'accept' | 'reject') => {
    let replaceConfirmed = false;
    if (decision === 'accept' && section.status === 'HELD') {
      replaceConfirmed = window.confirm(`Sekcija „${section.title}" je potvrđena. Zameniti radnom verzijom?\n\nAI tekst postaje nova, nepotvrđena verzija; potvrđeni tekst ostaje u istoriji verzija.`);
      if (!replaceConfirmed) return;
    }
    decide.mutate({ draftId: draft.id, sectionKey: section.key, decision, replaceConfirmed });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={AI_DRAFT_STATUS_TONE[draft.status]}>{AI_DRAFT_STATUS_LABEL[draft.status]}</Badge>
        <Badge variant="warning">AI ZAKLJUČAK</Badge>
        <span>
          {formatDateTime(draft.createdAt)} · {AI_DRAFT_MODE_LABEL[draft.mode]} · {draft.model} (effort {draft.effort}) · {draft.progress.total} poziva ·{' '}
          {formatDuration(draft.durationMs)} · {draft.inputTokens + draft.cacheReadTokens + draft.cacheCreationTokens} ulaznih / {draft.outputTokens} izlaznih tokena
          {draft.cacheReadTokens > 0 ? ` (${draft.cacheReadTokens} iz keša)` : ''} · {draft.imageCount} {draft.imageCount === 1 ? 'slika' : 'slika'} · {formatUsd(draft.estimatedCostUsd)}
        </span>
      </div>

      {draft.errorMessage && <StepNotice tone={draft.status === 'REFUSED' || draft.status === 'PARTIAL' ? 'warning' : 'danger'}>{draft.errorMessage}</StepNotice>}
      {draft.status === 'PARTIAL' && (
        <p className="text-xs text-muted-foreground">
          Napisano {draft.progress.written} od {draft.progress.total} sekcija; one su već u projektu kao nove verzije. Za ostatak pokrenite „Proširi i
          doteraj postojeći tekst" — tako se napisane sekcije zadržavaju i dopunjuju, a nenapisane pišu.
        </p>
      )}

      {written.length > 0 && (
        <>
          <div className="grid gap-2 text-sm md:grid-cols-3">
            <div className="rounded-md border px-3 py-2">
              <div className="text-xs text-muted-foreground">Dužina nacrta</div>
              <div className="tabular-nums">
                {draft.totals.words} reči ≈ {formatPages(draft.totals.pages)} <span className="text-muted-foreground">(cilj {draft.targetPages} str.)</span>
              </div>
            </div>
            <div className={cn('rounded-md border px-3 py-2', draft.totals.placeholders > 0 && 'border-amber-200 bg-amber-50')}>
              <div className="text-xs text-muted-foreground">Markeri „[POTREBNA DOPUNA]"</div>
              <div className="tabular-nums">
                {draft.totals.placeholders}
                {draft.totals.placeholders > 0 && <span className="text-xs text-amber-900"> · sekcija sa markerom ne može da se potvrdi</span>}
                {truncated > 0 && <span className="text-xs text-amber-900"> · {truncated} prekinut tekst</span>}
              </div>
            </div>
            <div className={cn('rounded-md border px-3 py-2', totalIssues > 0 && 'border-red-200 bg-red-50')}>
              <div className="text-xs text-muted-foreground">Patentna terminologija</div>
              <div className="tabular-nums">{totalIssues === 0 ? 'nije pronađena' : `${totalIssues} – ispravite pre potvrde`}</div>
            </div>
          </div>

          {draft.notes.length > 0 && (
            <section className="flex flex-col gap-1">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Napomene AI (AI zaključak)</h3>
              <ul className="list-disc pl-5 text-sm">
                {draft.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Sekcije ({draft.progress.written}/{draft.progress.total}){pending > 0 ? ` · čeka odluku: ${pending}` : ''}
        </h3>
        {draft.sections.map((section) => (
          <DraftSectionRow
            key={section.id}
            section={section}
            pending={decide.isPending && decide.variables?.sectionKey === section.key}
            onDecide={(decision) => onDecide(section, decision)}
          />
        ))}
        <ErrorText error={decide.error} />
      </section>
    </div>
  );
}

function DraftSectionRow({ section, pending, onDecide }: { section: AiDraftSection; pending: boolean; onDecide: (decision: 'accept' | 'reject') => void }) {
  const [compare, setCompare] = useState(false);
  const written = section.generation === 'DONE' || section.generation === 'TRUNCATED';
  const decided = section.status === 'ACCEPTED' || section.status === 'REJECTED';

  return (
    <div className="flex flex-col gap-2 rounded-md border px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{section.title}</span>
        {section.generation !== 'DONE' && <Badge variant={AI_DRAFT_GENERATION_TONE[section.generation]}>{AI_DRAFT_GENERATION_LABEL[section.generation]}</Badge>}
        {written && <Badge variant={AI_DRAFT_SECTION_STATUS_TONE[section.status]}>{AI_DRAFT_SECTION_STATUS_LABEL[section.status]}</Badge>}
        {section.draftVersionNumber !== null && <span className="text-xs text-muted-foreground">verzija {section.draftVersionNumber}</span>}
        {written && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {section.wordCount} reči ≈ {formatPages(section.pages)} (cilj ~{section.targetWords}) · {formatDuration(section.durationMs)} · {formatUsd(section.estimatedCostUsd)}
          </span>
        )}
        {section.placeholders > 0 && (
          <Badge variant="warning">
            [POTREBNA DOPUNA] × {section.placeholders}
          </Badge>
        )}
        {section.terminologyIssues.map((m, i) => (
          <Badge key={i} variant="danger" title={`„${m.match}"`}>
            {m.term}
          </Badge>
        ))}
      </div>
      {section.errorMessage && <p className="text-xs text-red-900">{section.errorMessage}</p>}
      {section.generation === 'TRUNCATED' && (
        <p className="text-xs text-amber-900">
          Model je stigao do granice izlaznih tokena; sačuvan je tekst koji je stigao, sa oznakom na kraju. Pokrenite „Proširi i doteraj" da bi
          se sekcija dovršila.
        </p>
      )}
      {section.status === 'HELD' && (
        <p className="text-xs text-muted-foreground">
          Sekcija je bila potvrđena kad je nacrt napravljen, pa AI tekst nije upisan. „Prihvati" će vas pitati da li da zameni potvrđeni tekst
          radnom verzijom.
        </p>
      )}
      {section.status === 'REJECTED' && section.draftVersionId && (
        <p className="text-xs text-muted-foreground">
          Odbačen AI tekst ostaje u istoriji verzija; prethodni tekst je vraćen kao nova verzija ako je postojao.
        </p>
      )}
      {written && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setCompare((c) => !c)}>
            {compare ? 'Sakrij' : section.previousContent ? 'Uporedi sa prethodnom verzijom' : 'Prikaži tekst'}
          </Button>
          {!decided && (
            <>
              <Button size="sm" disabled={pending} onClick={() => onDecide('accept')}>
                Prihvati kao radnu verziju
              </Button>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => onDecide('reject')}>
                Odbaci
              </Button>
            </>
          )}
          {decided && section.decidedAt && <span className="text-xs text-muted-foreground">{formatDateTime(section.decidedAt)}</span>}
        </div>
      )}
      {compare && (
        <div className="flex flex-col gap-1">
          <p className="whitespace-pre-wrap rounded-md border bg-card px-3 py-2 text-sm">
            {diffWords(section.previousContent, section.content).map((part, i) => (
              <span
                key={i}
                className={cn(
                  part.kind === 'added' && section.previousContent && 'bg-emerald-100 text-emerald-900',
                  part.kind === 'removed' && 'bg-red-100 text-red-900 line-through',
                )}
              >
                {part.text}
              </span>
            ))}
          </p>
          {section.previousContent && <p className="text-xs text-muted-foreground">Zeleno: dodato u AI nacrtu. Precrtano: uklonjeno iz prethodne verzije.</p>}
        </div>
      )}
    </div>
  );
}
