import { useImportResearch } from '@/api/hooks';
import { ErrorText } from '@/components/ErrorText';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Offered while the project has no imported research yet. The import is idempotent. */
export function ImportResearchCard({ projectId }: { projectId: string }) {
  const importResearch = useImportResearch(projectId);
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
          <Button onClick={() => importResearch.mutate()} disabled={importResearch.isPending}>
            Uvezi rezultate istraživanja
          </Button>
        </div>
        {importResearch.data && (
          <p className="text-sm text-muted-foreground">
            Uvezeno: {importResearch.data.sources} izvora, {importResearch.data.requirements} zahteva,{' '}
            {importResearch.data.findings} nalaza, {importResearch.data.reportSections} sekcija.
          </p>
        )}
        <ErrorText error={importResearch.error} />
      </CardContent>
    </Card>
  );
}
