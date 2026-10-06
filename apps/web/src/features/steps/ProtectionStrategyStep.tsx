import {
  useCollection,
  useConfirmRecord,
  useConfirmStrategyItem,
  useCreateRecord,
  useDeleteRecord,
  useSaveStrategyItem,
  useStrategy,
  useUpdateRecord,
} from '@/api/hooks';
import type { DesignVariant, StrategyEntry } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { AddRecordForm, AutosaveField, FieldSpec, RecordFields } from '@/components/fields';
import { RecordControls } from '@/components/RecordControls';
import { SourceReference } from '@/components/SourceReference';
import { StepNotice } from '@/components/StepNotice';
import { KindBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { STRATEGY_VALUE_LABEL } from '@/lib/labels';

const VARIANT_SPECS: FieldSpec[] = [
  { name: 'name', label: 'Varijanta', type: 'text', required: true },
  { name: 'description', label: 'Po čemu se razlikuje', type: 'textarea' },
];

/** Step 8: protection strategy — every decision with its rationale and matrix references. */
export function ProtectionStrategyStep({ projectId }: { projectId: string }) {
  const strategy = useStrategy(projectId);
  if (strategy.error) return <ErrorText error={strategy.error} />;
  if (!strategy.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Svaka odluka nosi obrazloženje i oznake pravila iz Matrice zahteva (npr. MZ-120). Predlog agenta je PREPORUKA; tek kada
        ga usvojite, beleži se kao vaša odluka.
      </p>
      {strategy.data.map((entry) => (
        <StrategyCard key={entry.key} projectId={projectId} entry={entry} />
      ))}
      <VariantsCard projectId={projectId} />
    </div>
  );
}

function StrategyCard({ projectId, entry }: { projectId: string; entry: StrategyEntry }) {
  const save = useSaveStrategyItem(projectId);
  const confirm = useConfirmStrategyItem(projectId);
  const item = entry.item;
  const persist = (field: string) => (value: string | null) => save.mutateAsync({ key: entry.key, [field]: value ?? '' });
  const valueSpec: FieldSpec | null = entry.allowedValues
    ? {
        name: 'value',
        label: 'Odluka',
        type: 'select',
        options: entry.allowedValues.map((v) => ({ value: v, label: STRATEGY_VALUE_LABEL[v] ?? v })),
      }
    : null;

  return (
    <Card className="gap-3 py-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{entry.title}</CardTitle>
          {item && <KindBadge kind={item.kind} />}
          {item && <Badge variant={item.verified ? 'success' : 'warning'}>{item.verified ? 'USVOJENO' : 'Nije usvojeno'}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-2">
          {valueSpec && (
            <AutosaveField idPrefix={entry.key} spec={valueSpec} initial={item?.value ?? ''} onSave={persist('value')} />
          )}
          <AutosaveField
            idPrefix={entry.key}
            spec={{ name: 'details', label: valueSpec ? 'Pojedinosti' : 'Odluka i pojedinosti', type: 'textarea', wide: !valueSpec }}
            initial={item?.details ?? ''}
            onSave={persist('details')}
          />
          <AutosaveField
            idPrefix={entry.key}
            spec={{ name: 'rationale', label: 'Obrazloženje', type: 'textarea', wide: true }}
            initial={item?.rationale ?? ''}
            onSave={persist('rationale')}
          />
          <AutosaveField
            idPrefix={entry.key}
            spec={{ name: 'requirementRefs', label: 'Izvor (oznake iz Matrice, npr. MZ-120, MZ-123)', type: 'text', wide: true }}
            initial={item?.requirementRefs ?? ''}
            onSave={persist('requirementRefs')}
          />
        </div>
        {entry.requirements.map((r) => (
          <div key={r.id} className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{r.code}</Badge>
              <Badge variant={r.status === 'CONFIRMED' ? 'success' : 'warning'}>
                {r.status === 'CONFIRMED' ? 'POTVRĐENO' : 'NEPROVERENO'}
              </Badge>
            </div>
            <p className="pt-1">{r.requirementText}</p>
            <SourceReference
              sourceType={r.sourceType}
              reference={r.sourceReference}
              url={r.citations[0]?.sourceDocument.url}
              detail={r.citations.map((c) => `${c.sourceDocument.title} — ${c.location}`).join(' · ')}
            />
          </div>
        ))}
        {entry.unknownRequirementRefs.length > 0 && (
          <StepNotice tone="warning">
            Oznake nisu pronađene u uvezenoj Matrici: {entry.unknownRequirementRefs.join(', ')}. Odluka bez izvora se ne
            prikazuje kao da ga ima.
          </StepNotice>
        )}
        {item && !item.requirementRefs.trim() && (
          <p className="text-xs font-medium text-amber-700">Odluka još nema naveden izvor iz Matrice zahteva.</p>
        )}
        {item && !item.verified && (
          <div>
            <Button size="sm" onClick={() => confirm.mutate(entry.key)} disabled={confirm.isPending}>
              POTVRDI (usvoji odluku)
            </Button>
          </div>
        )}
        <ErrorText error={save.error ?? confirm.error} />
      </CardContent>
    </Card>
  );
}

function VariantsCard({ projectId }: { projectId: string }) {
  const variants = useCollection<DesignVariant>(projectId, 'design-variants');
  const create = useCreateRecord(projectId, 'design-variants');
  return (
    <Card>
      <CardHeader>
        <CardTitle>Varijante proizvoda</CardTitle>
        <CardDescription>Dimenzije, teksture, boje, profili ivica, ugaoni i završni paneli, dekorativne varijante.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ErrorText error={variants.error} />
        {variants.data?.map((v) => (
          <VariantItem key={v.id} projectId={projectId} variant={v} />
        ))}
        <AddRecordForm
          specs={VARIANT_SPECS}
          submitLabel="Dodaj varijantu"
          defaults={{ sourceType: 'USER' }}
          onSubmit={(values) => create.mutateAsync(values)}
        />
      </CardContent>
    </Card>
  );
}

function VariantItem({ projectId, variant }: { projectId: string; variant: DesignVariant }) {
  const update = useUpdateRecord(projectId, 'design-variants');
  const confirm = useConfirmRecord(projectId, 'design-variants');
  const remove = useDeleteRecord(projectId, 'design-variants');
  return (
    <div className="flex flex-col gap-2 rounded-md border px-3 py-2">
      <RecordFields
        specs={VARIANT_SPECS}
        record={variant as unknown as Record<string, unknown> & { id: string }}
        onSave={(patch) => update.mutateAsync({ id: variant.id, ...patch })}
      />
      <RecordControls
        record={variant}
        onConfirm={() => confirm.mutate(variant.id)}
        onDelete={() => remove.mutate(variant.id)}
        error={update.error ?? confirm.error ?? remove.error}
      />
    </div>
  );
}
