import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useProject, useUpdateProject } from '@/api/hooks';
import type { Project } from '@/api/types';
import { SaveIndicator } from '@/components/SaveIndicator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAutosave } from '@/lib/use-autosave';

const schema = z.object({
  name: z.string().trim().min(1, 'Naziv projekta je obavezan.').max(200),
  productName: z.string().trim().max(200),
  productSummary: z.string().trim().max(4000),
  applicantName: z.string().trim().max(300),
  applicantAddress: z.string().trim().max(500),
  designerName: z.string().trim().max(300),
  representativeName: z.string().trim().max(300),
});
type FormValues = z.infer<typeof schema>;
type Field = keyof FormValues;

const FIELDS: { name: Field; label: string; multiline?: boolean; hint?: string }[] = [
  { name: 'name', label: 'Naziv projekta' },
  { name: 'productName', label: 'Naziv proizvoda' },
  { name: 'productSummary', label: 'Kratak opis proizvoda', multiline: true, hint: 'Vašim rečima, šta je proizvod.' },
  { name: 'applicantName', label: 'Podnosilac (naziv ili ime i prezime)' },
  { name: 'applicantAddress', label: 'Adresa podnosioca' },
  { name: 'designerName', label: 'Autor / dizajner' },
  { name: 'representativeName', label: 'Zastupnik (ako postoji)' },
];

function pick(project: Project): FormValues {
  return {
    name: project.name,
    productName: project.productName,
    productSummary: project.productSummary,
    applicantName: project.applicantName,
    applicantAddress: project.applicantAddress,
    designerName: project.designerName,
    representativeName: project.representativeName,
  };
}

export function ProjectSetupStep({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  if (!project.data) return null;
  return <SetupForm key={projectId} projectId={projectId} initial={pick(project.data)} />;
}

function SetupForm({ projectId, initial }: { projectId: string; initial: FormValues }) {
  const update = useUpdateProject(projectId);
  const autosave = useAutosave((patch: Partial<FormValues>) => update.mutateAsync(patch), {
    merge: (pending, next) => ({ ...pending, ...next }),
  });
  const { schedule } = autosave;
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: initial, mode: 'onChange' });

  // Every valid change is saved right away — field by field, not at the end of the step.
  useEffect(() => {
    const subscription = form.watch((values, { name }) => {
      if (!name) return;
      const parsed = schema.shape[name].safeParse(values[name]);
      if (parsed.success) schedule({ [name]: parsed.data });
    });
    return () => subscription.unsubscribe();
  }, [form, schedule]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Osnovni podaci projekta</CardTitle>
          <SaveIndicator state={autosave.state} error={autosave.error} />
        </div>
        <CardDescription>Svaka izmena se čuva automatski.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()} onBlur={() => void autosave.flush()}>
          {FIELDS.map((field) => {
            const error = form.formState.errors[field.name];
            return (
              <div key={field.name} className="flex flex-col gap-2">
                <Label htmlFor={field.name}>{field.label}</Label>
                {field.multiline ? (
                  <Textarea id={field.name} aria-invalid={Boolean(error)} {...form.register(field.name)} />
                ) : (
                  <Input id={field.name} aria-invalid={Boolean(error)} {...form.register(field.name)} />
                )}
                {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
                {error && <p className="text-xs text-destructive">{error.message}</p>}
              </div>
            );
          })}
        </form>
      </CardContent>
    </Card>
  );
}
