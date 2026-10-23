import { useImportResearch, useResearchImportStatus } from '@/api/hooks';
import { ErrorText } from '@/components/ErrorText';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/labels';

/**
 * Import of the phase 1–2 research results into the project (steps 2 and 3 share it).
 * Offers the import while the project has none; afterwards it states when the import was
 * done and how many records it holds, and the button only refreshes them. The import is
 * idempotent and never touches user confirmations.
 */
export function ImportResearchCard({ projectId }: { projectId: string }) {
  const status = useResearchImportStatus(projectId);
  const importResearch = useImportResearch(projectId);
  const done = status.data?.imported === true;
  const summary = importResearch.data;

  // Do not flash the "not imported" offer while the status is still unknown.
  if (status.isPending) return null;

  if (done && status.data) {
    const s = status.data;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
        <div className="flex flex-col gap-0.5">
          <p className="font-medium">
            Rezultati istraživanja su uvezeni{s.importedAt ? ` ${formatDateTime(s.importedAt)}` : ''}.
          </p>
          <p className="text-muted-foreground">
            {s.sources} izvora, {s.requirements} zahteva, {s.findings} nalaza, {s.reportSections} sekcija izveštaja. Ponovni
            uvoz samo osvežava zapise iz repozitorijuma; potvrde korisnika ostaju.
          </p>
          {summary && (
            <p className="text-muted-foreground">
              Osveženo: {summary.sources} izvora, {summary.requirements} zahteva, {summary.findings} nalaza,{' '}
              {summary.reportSections} sekcija.
            </p>
          )}
          <ErrorText error={importResearch.error} />
        </div>
        <Button variant="outline" size="sm" onClick={() => importResearch.mutate()} disabled={importResearch.isPending}>
          {importResearch.isPending ? 'Osvežavanje…' : 'Osveži uvezene rezultate'}
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rezultati faza 1 i 2 nisu uvezeni</CardTitle>
        <CardDescription>
          Uvoz preuzima zapise izvora (Z-01 … Z-15), lokalne kopije dokumenata, Matricu zahteva ZIS-a i „Rezultate
          inicijalnog istraživanja" iz repozitorijuma. Uvoz se može ponoviti bez dupliranja.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div>
          <Button onClick={() => importResearch.mutate()} disabled={importResearch.isPending || status.isPending}>
            {importResearch.isPending ? 'Uvoz u toku…' : 'Uvezi rezultate istraživanja'}
          </Button>
        </div>
        {summary && (
          <p className="text-sm text-muted-foreground">
            Uvezeno: {summary.sources} izvora, {summary.requirements} zahteva, {summary.findings} nalaza,{' '}
            {summary.reportSections} sekcija.
          </p>
        )}
        <ErrorText error={importResearch.error ?? status.error} />
      </CardContent>
    </Card>
  );
}
