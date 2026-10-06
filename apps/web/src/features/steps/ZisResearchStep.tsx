import { useState } from 'react';
import { localCopyUrl } from '@/api/client';
import { useCollection } from '@/api/hooks';
import type { Source } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { KindBadge } from '@/components/StatusBadge';
import { SourceReference } from '@/components/SourceReference';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, SOURCE_TYPE_LABEL } from '@/lib/labels';
import { ImportResearchCard } from './ImportResearchCard';

const PRIORITY_LABEL: Record<number, string> = {
  1: 'Zvanični sajt ZIS-a',
  2: 'Zakon / podzakonski akt',
  3: 'WIPO',
  4: 'EUIPO / DesignView',
  5: 'Dopunski izvor',
};

/** Step 2: every source with its complete record and the findings extracted from it. */
export function ZisResearchStep({ projectId }: { projectId: string }) {
  const sources = useCollection<Source>(projectId, 'sources');
  if (sources.error) return <ErrorText error={sources.error} />;
  if (!sources.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  if (sources.data.length === 0) return <ImportResearchCard projectId={projectId} />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Izvori su poređani po prioritetu: zvanični sajt ZIS-a, zakoni i podzakonski akti, WIPO, EUIPO, ostalo.
        Evidentirano izvora: {sources.data.length}.
      </p>
      {sources.data.map((source) => (
        <SourceCard key={source.id} source={source} />
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words">{children || '—'}</dd>
    </>
  );
}

function SourceCard({ source }: { source: Source }) {
  const [open, setOpen] = useState(false);
  const copies = JSON.parse(source.localCopiesJson) as string[];
  const findings = source.documents.flatMap((d) => d.researchFindings);

  return (
    <Card className="gap-3 py-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          {source.code && <Badge variant="outline">{source.code}</Badge>}
          <Badge variant="muted">{PRIORITY_LABEL[source.priority] ?? `Prioritet ${source.priority}`}</Badge>
          <Badge variant="secondary">{SOURCE_TYPE_LABEL[source.sourceType]}</Badge>
        </div>
        <CardTitle className="text-base leading-snug">{source.name}</CardTitle>
        <CardDescription>
          <a href={source.url} target="_blank" rel="noreferrer noopener" className="break-all text-primary underline">
            {source.url}
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-3 gap-y-1">
          <Row label="Institucija">{source.institution}</Row>
          <Row label="Vrsta dokumenta">{source.documentKind}</Row>
          <Row label="Datum / verzija">{source.documentVersion}</Row>
          <Row label="Datum pristupa">{formatDate(source.accessedAt)}</Row>
          <Row label="Lokalna kopija">
            {copies.length > 0 ? (
              <span className="flex flex-col">
                {copies.map((path, i) => (
                  <a key={path} href={localCopyUrl(source.id, i)} target="_blank" rel="noreferrer" className="break-all text-primary underline">
                    {path}
                  </a>
                ))}
              </span>
            ) : (
              <span className="text-amber-700">nema lokalne kopije</span>
            )}
          </Row>
          <Row label="Značaj za projekat">{source.significance}</Row>
        </dl>
        <div>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setOpen((o) => !o)}>
            {open ? 'Sakrij' : 'Prikaži'} relevantne sekcije i nalaze ({findings.length})
          </Button>
        </div>
        {open && (
          <div className="flex flex-col gap-2">
            {source.relevantSections && (
              <p className="whitespace-pre-wrap rounded-md bg-muted/50 px-3 py-2 text-xs">{source.relevantSections}</p>
            )}
            {findings.map((f) => (
              <div key={f.id} className="flex flex-col gap-1 rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  <KindBadge kind={f.kind} confirmedUserFact={f.kind === 'FACT' && f.verified} />
                  {f.code && <span className="text-xs text-muted-foreground">{f.code}</span>}
                </div>
                <p>{f.summary}</p>
                <SourceReference sourceType={f.sourceType} reference={f.sourceReference} url={source.url} detail={source.name} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
