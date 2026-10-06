import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useCreateProject, useProjects } from '@/api/hooks';
import { ErrorText } from '@/components/ErrorText';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDateTime } from '@/lib/labels';

const schema = z.object({
  name: z.string().trim().min(1, 'Unesite naziv projekta.').max(200),
  productName: z.string().trim().max(200).optional(),
});
type FormValues = z.infer<typeof schema>;

export function ProjectsPage() {
  const projects = useProjects();
  const create = useCreateProject();
  const navigate = useNavigate();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', productName: '' } });

  const onSubmit = form.handleSubmit(async (values) => {
    const project = await create.mutateAsync(values);
    navigate(`/projects/${project.id}/steps/PROJECT_SETUP`);
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Prijava za priznanje prava na industrijski dizajn</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Strukturisana priprema prijave sa trajnom evidencijom podataka, izvora i odluka. Sistem pomaže u pripremi i
          ne zamenjuje registrovanog zastupnika; prijava se ne podnosi automatski.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Projekti</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.isLoading && <p className="text-sm text-muted-foreground">Učitavanje…</p>}
            <ErrorText error={projects.error} />
            {projects.data?.length === 0 && <p className="text-sm text-muted-foreground">Još nema projekata.</p>}
            <ul className="divide-y">
              {projects.data?.map((p) => (
                <li key={p.id} className="py-3">
                  <Link to={`/projects/${p.id}`} className="flex items-center justify-between gap-4 hover:underline">
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        {p.name}
                        {p.isDemo && <Badge variant="danger">DEMO</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.productName || 'Proizvod nije unet'} · izmenjeno {formatDateTime(p.updatedAt)}
                      </div>
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground">{p.progressPercent}%</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Novi projekat</CardTitle>
            <CardDescription>Ostali podaci se unose u prvom koraku.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Naziv projekta</Label>
                <Input id="name" aria-invalid={Boolean(form.formState.errors.name)} {...form.register('name')} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="productName">Naziv proizvoda (opciono)</Label>
                <Input id="productName" {...form.register('productName')} />
              </div>
              <ErrorText error={create.error} />
              <Button type="submit" disabled={create.isPending}>
                Kreiraj projekat
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
