import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ErrorText } from '@/components/ErrorText';
import { SaveIndicator } from '@/components/SaveIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAutosave } from '@/lib/use-autosave';
import { cn } from '@/lib/utils';

export const selectClass = 'h-9 w-full rounded-md border border-input bg-card px-2 text-sm shadow-xs';

/** Describes one editable field of a record; used for both the "add" form and inline editing. */
export interface FieldSpec {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  /** Spans the full width in two-column layouts. */
  wide?: boolean;
}

function FieldInput({
  spec,
  id,
  value,
  onChange,
  onBlur,
}: {
  spec: FieldSpec;
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  if (spec.type === 'select') {
    return (
      <select id={id} className={selectClass} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}>
        {!spec.required && <option value="">—</option>}
        {spec.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (spec.type === 'textarea') {
    return <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className="min-h-16" />;
  }
  return <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />;
}

/** One field saved automatically shortly after every change — progress is never held only in the browser. */
export function AutosaveField({
  spec,
  initial,
  onSave,
  idPrefix,
}: {
  spec: FieldSpec;
  initial: string;
  onSave: (value: string | null) => Promise<unknown>;
  idPrefix: string;
}) {
  const [value, setValue] = useState(initial);
  const autosave = useAutosave((v: string) => onSave(spec.type === 'select' && v === '' ? null : v));
  const id = `${idPrefix}-${spec.name}`;
  return (
    <div className={cn('flex flex-col gap-1.5', spec.wide && 'md:col-span-2')}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs text-muted-foreground">
          {spec.label}
        </Label>
        <SaveIndicator state={autosave.state} error={autosave.error} />
      </div>
      <FieldInput
        spec={spec}
        id={id}
        value={value}
        onChange={(v) => {
          setValue(v);
          if (spec.required && !v.trim()) return;
          autosave.schedule(v);
          if (spec.type === 'select') void autosave.flush();
        }}
        onBlur={() => void autosave.flush()}
      />
      {spec.hint && <p className="text-xs text-muted-foreground">{spec.hint}</p>}
    </div>
  );
}

/** Inline editor for a record: every field autosaves through `onSave(patch)`. */
export function RecordFields({
  specs,
  record,
  onSave,
}: {
  specs: FieldSpec[];
  record: Record<string, unknown> & { id: string };
  onSave: (patch: Record<string, unknown>) => Promise<unknown>;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {specs.map((spec) => (
        <AutosaveField
          key={spec.name}
          idPrefix={record.id}
          spec={spec}
          initial={String(record[spec.name] ?? '')}
          onSave={(value) => onSave({ [spec.name]: value })}
        />
      ))}
    </div>
  );
}

/** "Add" form built from field specs (React Hook Form + Zod). `defaults` are sent with every record. */
export function AddRecordForm({
  specs,
  submitLabel,
  onSubmit,
  defaults = {},
}: {
  specs: FieldSpec[];
  submitLabel: string;
  onSubmit: (values: Record<string, unknown>) => Promise<unknown>;
  defaults?: Record<string, unknown>;
}) {
  const schema = z.object(
    Object.fromEntries(
      specs.map((s) => [s.name, s.required ? z.string().trim().min(1, 'Obavezno polje.') : z.string().trim()]),
    ),
  );
  const initial = Object.fromEntries(specs.map((s) => [s.name, s.type === 'select' && s.required ? (s.options?.[0]?.value ?? '') : '']));
  const form = useForm<Record<string, string>>({ resolver: zodResolver(schema), defaultValues: initial });
  const [error, setError] = useState<unknown>(null);

  const submit = form.handleSubmit(async (values) => {
    // Empty optional fields are left out, so the database defaults apply.
    const data = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== ''));
    try {
      await onSubmit({ ...defaults, ...data });
      setError(null);
      form.reset(initial);
    } catch (e) {
      setError(e);
    }
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <div className="grid gap-3 md:grid-cols-2">
        {specs.map((spec) => {
          const id = `new-${spec.name}`;
          const fieldError = form.formState.errors[spec.name];
          return (
            <div key={spec.name} className={cn('flex flex-col gap-1.5', spec.wide && 'md:col-span-2')}>
              <Label htmlFor={id} className="text-xs text-muted-foreground">
                {spec.label}
                {spec.required ? ' *' : ''}
              </Label>
              <FieldInput
                spec={spec}
                id={id}
                value={form.watch(spec.name) ?? ''}
                onChange={(v) => form.setValue(spec.name, v, { shouldValidate: form.formState.isSubmitted })}
              />
              {fieldError && <p className="text-xs text-destructive">{String(fieldError.message)}</p>}
            </div>
          );
        })}
      </div>
      <div>
        <Button type="submit" size="sm" variant="outline" disabled={form.formState.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
      <ErrorText error={error} />
    </form>
  );
}

export function options<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
