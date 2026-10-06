import { generatedDocumentUrl } from '@/api/client';
import { useGeneratePackage, usePackage } from '@/api/hooks';
import type { ChecklistItem, PackageStatus } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { StepNotice } from '@/components/StepNotice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ACTOR_LABEL, formatBytes, formatDateTime, GENERATED_DOCUMENT_LABEL, NO_GUARANTEE_NOTICE } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { FilingQuestions } from './FilingQuestions';

/** Step 13: checklist (§16), generation gate and the nine package documents with their version history. */
export function FinalPackageStep({ projectId }: { projectId: string }) {
  const pkg = usePackage(projectId);
  const generate = useGeneratePackage(projectId);
  if (pkg.error) return <ErrorText error={pkg.error} />;
  if (!pkg.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  const { gate, checklist } = pkg.data;
  const done = checklist.filter((i) => i.done).length;

  return (
    <div className="flex flex-col gap-6">
      <StepNotice tone="info">{NO_GUARANTEE_NOTICE}</StepNotice>
      {pkg.data.openBlockers > 0 && (
        <StepNotice tone="danger">
          Finalni paket je blokiran: nerešenih nalaza BLOCKER iz nezavisne provere — {pkg.data.openBlockers}.
        </StepNotice>
      )}
      {pkg.data.terminology.length > 0 && (
        <StepNotice tone="danger">
          Patentna terminologija u opisu:{' '}
          {pkg.data.terminology.map((t) => `${t.sectionTitle} (${[...new Set(t.matches.map((m) => m.term))].join(', ')})`).join('; ')}.
        </StepNotice>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Kontrolne tačke pre finalizacije</CardTitle>
          <CardDescription>
            {done} od {checklist.length} ispunjeno. Tačke se obeležavaju automatski iz stanja projekta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Checklist items={checklist} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generisanje paketa</CardTitle>
          <CardDescription>
            {gate.canGenerate
              ? gate.isFinal
                ? 'Svi obavezni podaci su potvrđeni: paket će biti FINALNA VERZIJA.'
                : 'Nisu potvrđeni svi obavezni podaci: paket će biti označen kao NACRT.'
              : gate.blockedReason}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {gate.canGenerate && !gate.isFinal && gate.missing.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {gate.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
          <div>
            <Button onClick={() => generate.mutate()} disabled={!gate.canGenerate || generate.isPending}>
              {generate.isPending ? 'Generisanje…' : `Generiši paket (verzija ${(pkg.data.latestVersion ?? 0) + 1})`}
            </Button>
          </div>
          <ErrorText error={generate.error} />
        </CardContent>
      </Card>

      <PackageDocuments status={pkg.data} />
      <FilingQuestions projectId={projectId} stepKey="FINAL_PACKAGE" />
    </div>
  );
}

export function Checklist({ items }: { items: ChecklistItem[] }) {
  return (
    <ul className="flex flex-col divide-y">
      {items.map((item) => (
        <li key={item.key} className="flex gap-3 py-2 text-sm">
          <span
            aria-label={item.done ? 'ispunjeno' : 'nije ispunjeno'}
            className={cn(
              'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border text-[10px]',
              item.done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-input',
            )}
          >
            {item.done ? '✓' : ''}
          </span>
          <span className="flex flex-col">
            <span className={item.done ? '' : 'font-medium'}>{item.label}</span>
            <span className="text-xs text-muted-foreground">{item.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PackageDocuments({ status, latestOnly = false }: { status: PackageStatus; latestOnly?: boolean }) {
  if (status.latestVersion === null) {
    return <p className="text-sm text-muted-foreground">Paket još nije generisan.</p>;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dokumenti paketa</CardTitle>
        <CardDescription>Najnovija verzija: {status.latestVersion}. Svaka ranija verzija ostaje sačuvana.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y">
        {status.documents.map(({ type, versions }) => {
          const [latest, ...older] = versions;
          if (!latest) return null;
          return (
            <div key={type} className="flex flex-col gap-1 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <a href={generatedDocumentUrl(latest.id)} className="font-medium text-primary underline">
                  {GENERATED_DOCUMENT_LABEL[type]}
                </a>
                <Badge variant="outline">v{latest.versionNumber}</Badge>
                <Badge variant={latest.isFinal ? 'success' : 'warning'}>{latest.isFinal ? 'FINALNA' : 'NACRT'}</Badge>
                {latest.isDemo && <Badge variant="danger">DEMO</Badge>}
                <span className="text-xs text-muted-foreground">
                  {latest.fileName} · {formatBytes(latest.sizeBytes)} · {formatDateTime(latest.createdAt)} ·{' '}
                  {ACTOR_LABEL[latest.createdByActor]}
                </span>
              </div>
              {!latestOnly && older.length > 0 && (
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  Ranije verzije:
                  {older.map((v) => (
                    <a key={v.id} href={generatedDocumentUrl(v.id)} className="underline">
                      v{v.versionNumber}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
