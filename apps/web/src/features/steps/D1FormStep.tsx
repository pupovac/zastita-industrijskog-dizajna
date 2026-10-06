import { useState } from 'react';
import { useConfirmD1Field, useD1, useSaveD1Field } from '@/api/hooks';
import type { D1Field } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { AutosaveField } from '@/components/fields';
import { SourceReference } from '@/components/SourceReference';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DEFERRED_TO_FILING_LABEL } from '@/lib/labels';
import { FilingQuestions } from './FilingQuestions';

const NOT_APPLICABLE = 'Ne primenjuje se';

/** Step 12: every field of form D-1 with its value or "nedostaje". */
export function D1FormStep({ projectId }: { projectId: string }) {
  const fields = useD1(projectId);
  if (fields.error) return <ErrorText error={fields.error} />;
  if (!fields.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  const missing = fields.data.filter((f) => f.missing).length;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Obrazac D-1 — Zahtev za priznanje prava na industrijski dizajn</CardTitle>
          <CardDescription>
            Polja prema obrascu D-1 (Z-04) i „D-1 vodiču po poljima" iz rezultata istraživanja. Nedostaje: {missing} od{' '}
            {fields.data.length}. Polje „Popunjava Zavod" se ne popunjava.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {fields.data.map((field) => (
            <D1FieldRow key={field.key} projectId={projectId} field={field} />
          ))}
        </CardContent>
      </Card>
      <FilingQuestions projectId={projectId} stepKey="D1_FORM_DATA" />
    </div>
  );
}

function D1FieldRow({ projectId, field }: { projectId: string; field: D1Field }) {
  const save = useSaveD1Field(projectId);
  const confirm = useConfirmD1Field(projectId);
  // Remounts the editor when a value is set by a button, so the field shows it.
  const [revision, setRevision] = useState(0);
  const value = field.value;

  return (
    <div className="flex flex-col gap-2 rounded-md border px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{field.number}</Badge>
        {field.missing ? <Badge variant="warning">nedostaje</Badge> : <Badge variant="muted">uneto</Badge>}
        {field.deferredToFiling && <Badge variant="muted">{DEFERRED_TO_FILING_LABEL}</Badge>}
        {value?.verified && <Badge variant="success">POTVRĐENO</Badge>}
      </div>
      <AutosaveField
        key={revision}
        idPrefix={`d1-${field.key}`}
        spec={{ name: 'value', label: field.label, type: 'textarea', hint: field.hint }}
        initial={value?.value ?? ''}
        onSave={(v) => save.mutateAsync({ fieldKey: field.key, value: v ?? '' })}
      />
      <div className="flex flex-wrap items-center gap-2">
        {field.conditional && field.missing && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              save.mutate({ fieldKey: field.key, value: NOT_APPLICABLE }, { onSuccess: () => setRevision((r) => r + 1) })
            }
          >
            Ne primenjuje se
          </Button>
        )}
        {value && !value.verified && value.value.trim() && (
          <Button size="sm" variant="outline" onClick={() => confirm.mutate(field.key)} disabled={confirm.isPending}>
            POTVRDI
          </Button>
        )}
      </div>
      <SourceReference
        sourceType="DOCUMENT"
        reference={`${field.legalBasis} [${field.requirementRefs.join(', ')}]`}
        detail="Obrazac D-1 (Z-04) i Matrica zahteva ZIS-a"
      />
      <ErrorText error={save.error ?? confirm.error} />
    </div>
  );
}
