import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateSignoff, useD1, usePackage, useSignoffs } from '@/api/hooks';
import type { SignoffRole } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { selectClass } from '@/components/fields';
import { StepNotice } from '@/components/StepNotice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime, NO_GUARANTEE_NOTICE, SIGNOFF_ROLE_LABEL } from '@/lib/labels';
import { FilingQuestions } from './FilingQuestions';
import { Checklist, PackageDocuments } from './FinalPackageStep';

const schema = z.object({
  reviewerName: z.string().trim().min(1, 'Unesite ime i prezime.').max(300),
  role: z.enum(['APPLICANT', 'REPRESENTATIVE']),
  note: z.string().trim().max(4000),
});
type FormValues = z.infer<typeof schema>;

/** Step 14: final review of the whole package and the record of the applicant's / representative's confirmation. */
export function FinalReviewStep({ projectId }: { projectId: string }) {
  const pkg = usePackage(projectId);
  const d1 = useD1(projectId);
  const signoffs = useSignoffs(projectId);
  const create = useCreateSignoff(projectId);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reviewerName: '', role: 'APPLICANT', note: '' },
  });

  if (pkg.error) return <ErrorText error={pkg.error} />;
  if (!pkg.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  const missingD1 = d1.data?.filter((f) => f.missing).length ?? 0;

  const submit = form.handleSubmit(async (values) => {
    await create.mutateAsync(values);
    form.reset({ reviewerName: '', role: values.role, note: '' });
  });

  return (
    <div className="flex flex-col gap-6">
      <StepNotice tone="warning">
        Prijava se ne podnosi automatski. Podnosi je podnosilac ili zastupnik, van ovog sistema. {NO_GUARANTEE_NOTICE}
      </StepNotice>

      <Card>
        <CardHeader>
          <CardTitle>Pregled paketa</CardTitle>
          <CardDescription>
            Kopija za završnu proveru: svaku informaciju proverite u dokumentima ispod pre podnošenja.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Badge variant={pkg.data.latestVersion ? 'secondary' : 'warning'}>
            {pkg.data.latestVersion ? `Paket v${pkg.data.latestVersion}` : 'Paket nije generisan'}
          </Badge>
          <Badge variant="outline">
            Kontrolne tačke: {pkg.data.checklist.filter((i) => i.done).length}/{pkg.data.checklist.length}
          </Badge>
          <Badge variant={missingD1 ? 'warning' : 'success'}>D-1: nedostaje {missingD1}</Badge>
          <Badge variant={pkg.data.openBlockers ? 'danger' : 'success'}>BLOCKER: {pkg.data.openBlockers}</Badge>
        </CardContent>
      </Card>

      <PackageDocuments status={pkg.data} latestOnly />

      <Card>
        <CardHeader>
          <CardTitle>Kontrolne tačke</CardTitle>
        </CardHeader>
        <CardContent>
          <Checklist items={pkg.data.checklist} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Potvrda završnog pregleda</CardTitle>
          <CardDescription>Beleži ko je pregledao paket, kada i sa kojom napomenom. Ovo nije podnošenje prijave.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {signoffs.data?.map((s) => (
            <div key={s.id} className="rounded-md border px-3 py-2 text-sm">
              <div className="font-medium">
                {s.reviewerName} · {SIGNOFF_ROLE_LABEL[s.role]}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDateTime(s.confirmedAt)} · paket v{s.packageVersion ?? '—'}
              </div>
              {s.note && <p className="pt-1">{s.note}</p>}
            </div>
          ))}
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2" noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reviewerName">Ime i prezime</Label>
              <Input id="reviewerName" {...form.register('reviewerName')} />
              {form.formState.errors.reviewerName && (
                <p className="text-xs text-destructive">{form.formState.errors.reviewerName.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Uloga</Label>
              <select id="role" className={selectClass} {...form.register('role')}>
                {(Object.keys(SIGNOFF_ROLE_LABEL) as SignoffRole[]).map((r) => (
                  <option key={r} value={r}>
                    {SIGNOFF_ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="note">Napomena</Label>
              <Textarea id="note" {...form.register('note')} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={create.isPending || !pkg.data.latestVersion}>
                Potvrđujem da sam pregledao/la paket
              </Button>
            </div>
          </form>
          <ErrorText error={create.error ?? signoffs.error} />
        </CardContent>
      </Card>
      <FilingQuestions projectId={projectId} stepKey="FINAL_APPLICANT_REVIEW" />
    </div>
  );
}
