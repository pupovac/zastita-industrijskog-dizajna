import { fileContentUrl } from '@/api/client';
import { useCollection, useConfirmRecord, useCreateRecord, useDeleteRecord, useUpdateRecord } from '@/api/hooks';
import type { PriorDesignRecord, SearchCoverage } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { AddRecordForm, FieldSpec, options, RecordFields } from '@/components/fields';
import { RecordControls } from '@/components/RecordControls';
import { StepNotice } from '@/components/StepNotice';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { COVERAGE_STATUS_LABEL, SIMILARITY_LABEL } from '@/lib/labels';

const COVERAGE_SPECS: FieldSpec[] = [
  { name: 'database', label: 'Baza', type: 'text', required: true },
  { name: 'status', label: 'Rezultat pokušaja', type: 'select', options: options(COVERAGE_STATUS_LABEL), required: true },
  { name: 'query', label: 'Upit / pojmovi', type: 'textarea' },
  { name: 'resultSummary', label: 'Šta je pronađeno', type: 'textarea' },
  { name: 'blockedReason', label: 'Šta je blokiralo pristup', type: 'textarea' },
  { name: 'coverageGap', label: 'Praznina u pokrivenosti', type: 'textarea' },
];

const DESIGN_SPECS: FieldSpec[] = [
  { name: 'title', label: 'Naziv', type: 'text', required: true },
  { name: 'registrationNumber', label: 'Broj prijave / registracije', type: 'text' },
  { name: 'holder', label: 'Nosilac prava / podnosilac', type: 'text' },
  { name: 'country', label: 'Država', type: 'text' },
  { name: 'designDate', label: 'Datum', type: 'text' },
  { name: 'locarnoClass', label: 'Klasa', type: 'text' },
  { name: 'database', label: 'Baza', type: 'text' },
  { name: 'url', label: 'Link', type: 'text' },
  { name: 'similarityLevel', label: 'Procena vizuelne sličnosti', type: 'select', options: options(SIMILARITY_LABEL) },
  { name: 'similarFeatures', label: 'Šta deluje slično', type: 'textarea' },
  { name: 'differingFeatures', label: 'Šta se razlikuje', type: 'textarea' },
];

const SIMILARITY_TONE = { LOW: 'success', MEDIUM: 'warning', HIGH: 'danger' } as const;

/** Step 7: search coverage report and the prior designs found, with search result and legal conclusion kept apart. */
export function PriorDesignSearchStep({ projectId }: { projectId: string }) {
  const coverage = useCollection<SearchCoverage>(projectId, 'search-coverage');
  const designs = useCollection<PriorDesignRecord>(projectId, 'prior-designs');
  const addCoverage = useCreateRecord(projectId, 'search-coverage');
  const addDesign = useCreateRecord(projectId, 'prior-designs');

  if (coverage.error || designs.error) return <ErrorText error={coverage.error ?? designs.error} />;
  if (!coverage.data || !designs.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  const zis = coverage.data.some((c) => /zis/i.test(c.database) && c.status !== 'SKIPPED');
  const gaps = coverage.data.filter((c) => c.status !== 'COMPLETED');

  return (
    <div className="flex flex-col gap-6">
      {!zis && <StepNotice tone="danger">Pretraga baze industrijskih dizajna ZIS-a je obavezna i još nije zabeležena.</StepNotice>}
      {gaps.length > 0 && (
        <StepNotice tone="warning">
          Pretraga nije pokrila sve baze ({gaps.map((g) => g.database).join(', ')}). Novost zato ostaje nepotvrđena; ovo je
          rizik koji podnosilac svesno nosi (odluka od 2026-10-05). Preporučuje se provera kod registrovanog zastupnika pre
          podnošenja.
        </StepNotice>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Izveštaj o pokrivenosti</CardTitle>
          <CardDescription>Šta je pokušano, šta je blokiralo pristup i koja praznina u pokrivenosti ostaje.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {coverage.data.length === 0 && <p className="text-sm text-muted-foreground">Još nema zapisa o pretrazi.</p>}
          {coverage.data.map((c) => (
            <CoverageItem key={c.id} projectId={projectId} coverage={c} />
          ))}
          <details className="rounded-md border px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">Dodaj zapis o pretrazi</summary>
            <div className="pt-3">
              <AddRecordForm
                specs={COVERAGE_SPECS}
                submitLabel="Dodaj zapis"
                defaults={{ sourceType: 'USER' }}
                onSubmit={(values) => addCoverage.mutateAsync(values)}
              />
            </div>
          </details>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Pronađeni slični dizajni ({designs.data.length})
        </h2>
        {designs.data.map((d) => (
          <PriorDesignCard key={d.id} projectId={projectId} design={d} />
        ))}
        <Card>
          <CardHeader>
            <CardTitle>Dodaj pronađeni dizajn</CardTitle>
          </CardHeader>
          <CardContent>
            <AddRecordForm
              specs={DESIGN_SPECS}
              submitLabel="Dodaj dizajn"
              defaults={{ kind: 'USER_STATEMENT', sourceType: 'USER' }}
              onSubmit={(values) => addDesign.mutateAsync(values)}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function CoverageItem({ projectId, coverage }: { projectId: string; coverage: SearchCoverage }) {
  const update = useUpdateRecord(projectId, 'search-coverage');
  const confirm = useConfirmRecord(projectId, 'search-coverage');
  const remove = useDeleteRecord(projectId, 'search-coverage');
  return (
    <div className="flex flex-col gap-3 rounded-md border px-3 py-3">
      <div className="flex items-center gap-2">
        <span className="font-medium">{coverage.database}</span>
        <Badge variant={coverage.status === 'COMPLETED' ? 'success' : 'warning'}>{COVERAGE_STATUS_LABEL[coverage.status]}</Badge>
      </div>
      <RecordFields
        specs={COVERAGE_SPECS}
        record={coverage as unknown as Record<string, unknown> & { id: string }}
        onSave={(patch) => update.mutateAsync({ id: coverage.id, ...patch })}
      />
      <RecordControls
        record={coverage}
        onConfirm={() => confirm.mutate(coverage.id)}
        onDelete={() => remove.mutate(coverage.id)}
        confirmPending={confirm.isPending}
        error={update.error ?? confirm.error ?? remove.error}
      />
    </div>
  );
}

function PriorDesignCard({ projectId, design }: { projectId: string; design: PriorDesignRecord }) {
  const update = useUpdateRecord(projectId, 'prior-designs');
  const confirm = useConfirmRecord(projectId, 'prior-designs');
  const remove = useDeleteRecord(projectId, 'prior-designs');
  const save = (patch: Record<string, unknown>) => update.mutateAsync({ id: design.id, ...patch });

  return (
    <Card className="gap-3 py-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{design.title}</span>
          {design.similarityLevel && (
            <Badge variant={SIMILARITY_TONE[design.similarityLevel]}>Sličnost: {SIMILARITY_LABEL[design.similarityLevel]}</Badge>
          )}
          {design.registrationNumber && <span className="text-xs text-muted-foreground">{design.registrationNumber}</span>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {design.imageFile && (
          <img
            src={fileContentUrl(design.imageFile.id)}
            alt={design.title}
            className="max-h-48 w-fit rounded-md border object-contain"
          />
        )}
        <RecordFields specs={DESIGN_SPECS.slice(1)} record={design as unknown as Record<string, unknown> & { id: string }} onSave={save} />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-md border px-3 py-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Rezultat pretrage</div>
            <RecordFields
              specs={[{ name: 'searchResult', label: 'Šta je pronađeno i gde', type: 'textarea' }]}
              record={design as unknown as Record<string, unknown> & { id: string }}
              onSave={save}
            />
          </div>
          <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/40 px-3 py-2">
            <div className="text-xs font-medium uppercase tracking-wide text-amber-900">Pravni zaključak</div>
            <p className="text-xs text-amber-900">
              Nije konačan: sistem ne donosi pravni zaključak da je dizajn nov ili da nije nov. Preporuka je provera kod registrovanog zastupnika.
            </p>
            <RecordFields
              specs={[{ name: 'legalConclusion', label: 'Zaključak (AI ili zastupnik)', type: 'textarea' }]}
              record={design as unknown as Record<string, unknown> & { id: string }}
              onSave={save}
            />
          </div>
        </div>
        <RecordControls
          record={design}
          url={design.url}
          detail={design.database}
          onConfirm={() => confirm.mutate(design.id)}
          onDelete={() => remove.mutate(design.id)}
          confirmPending={confirm.isPending}
          error={update.error ?? confirm.error ?? remove.error}
        />
      </CardContent>
    </Card>
  );
}
