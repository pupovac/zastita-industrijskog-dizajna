import { useState } from 'react';
import {
  useCollection,
  useConfirmFunctionAnswer,
  useConfirmRecord,
  useCreateRecord,
  useDeleteRecord,
  useFunctionAnalysisQuestions,
  useSaveFunctionAnswer,
  useUpdateRecord,
} from '@/api/hooks';
import type { DesignFeatureRecord, DesignVariant, FeatureCategory, FunctionAnalysisAnswer } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { AddRecordForm, AutosaveField, FieldSpec, options, RecordFields } from '@/components/fields';
import { RecordControls } from '@/components/RecordControls';
import { StepNotice } from '@/components/StepNotice';
import { KindBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FEATURE_CATEGORY_LABEL, FUNCTIONALITY_RISK_LABEL } from '@/lib/labels';

const CATEGORY_ORDER: (FeatureCategory | null)[] = ['A_VISUAL', 'B_MIXED', 'C_TECHNICAL', 'D_UNCLEAR', null];
const RISK_TONE = { LOW_RISK: 'success', NEEDS_FURTHER_REVIEW: 'warning', HIGH_FUNCTIONAL_DEPENDENCE: 'danger' } as const;

function featureSpecs(variants: DesignVariant[]): FieldSpec[] {
  return [
    { name: 'name', label: 'Karakteristika', type: 'text', required: true },
    { name: 'category', label: 'Kategorija', type: 'select', options: options(FEATURE_CATEGORY_LABEL) },
    { name: 'description', label: 'Opis onoga što se vidi', type: 'textarea', wide: true },
    { name: 'categoryRationale', label: 'Obrazloženje kategorije', type: 'textarea' },
    { name: 'functionalityRisk', label: 'Klasifikacija rizika', type: 'select', options: options(FUNCTIONALITY_RISK_LABEL) },
    { name: 'riskRationale', label: 'Obrazloženje rizika', type: 'textarea' },
    { name: 'variantId', label: 'Varijanta', type: 'select', options: variants.map((v) => ({ value: v.id, label: v.name })) },
  ];
}

/** Step 6: "Mapa vizuelnih karakteristika proizvoda" and the technical-function module (§11). */
export function VisualAnalysisStep({ projectId }: { projectId: string }) {
  const features = useCollection<DesignFeatureRecord>(projectId, 'design-features');
  const variants = useCollection<DesignVariant>(projectId, 'design-variants');
  const create = useCreateRecord(projectId, 'design-features');

  if (features.error) return <ErrorText error={features.error} />;
  if (!features.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  const specs = featureSpecs(variants.data ?? []);
  const risks = Object.keys(FUNCTIONALITY_RISK_LABEL) as (keyof typeof FUNCTIONALITY_RISK_LABEL)[];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapa vizuelnih karakteristika proizvoda</CardTitle>
          <CardDescription>
            Kategorije A–D. Karakteristike iz kategorije B se ne izbacuju automatski — za njih se obrazlaže zašto ih treba
            pažljivo razmotriti. Sistem ne donosi konačnu pravnu odluku.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          {risks.map((risk) => (
            <Badge key={risk} variant={RISK_TONE[risk]}>
              {FUNCTIONALITY_RISK_LABEL[risk]}: {features.data.filter((f) => f.functionalityRisk === risk).length}
            </Badge>
          ))}
          <Badge variant="muted">Bez klasifikacije: {features.data.filter((f) => !f.functionalityRisk).length}</Badge>
        </CardContent>
      </Card>

      {CATEGORY_ORDER.map((category) => {
        const items = features.data.filter((f) => f.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category ?? 'none'} className="flex flex-col gap-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {category ? FEATURE_CATEGORY_LABEL[category] : 'Bez kategorije'}
            </h2>
            {items.map((feature) => (
              <FeatureCard key={feature.id} projectId={projectId} feature={feature} specs={specs} />
            ))}
          </section>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Dodaj karakteristiku</CardTitle>
          <CardDescription>Upisuje se kao vaša izjava; agenti dodaju svoje predloge kao AI zaključke.</CardDescription>
        </CardHeader>
        <CardContent>
          <AddRecordForm
            specs={specs.slice(0, 3)}
            submitLabel="Dodaj karakteristiku"
            defaults={{ kind: 'USER_STATEMENT', sourceType: 'USER' }}
            onSubmit={(values) => create.mutateAsync(values)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureCard({ projectId, feature, specs }: { projectId: string; feature: DesignFeatureRecord; specs: FieldSpec[] }) {
  const update = useUpdateRecord(projectId, 'design-features');
  const confirm = useConfirmRecord(projectId, 'design-features');
  const remove = useDeleteRecord(projectId, 'design-features');
  const [open, setOpen] = useState(false);
  const answered = feature.functionAnalysis.filter((a) => a.answer.trim()).length;

  return (
    <Card className="gap-3 py-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{feature.name}</span>
          {feature.functionalityRisk && (
            <Badge variant={RISK_TONE[feature.functionalityRisk]}>{FUNCTIONALITY_RISK_LABEL[feature.functionalityRisk]}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <RecordFields
          specs={specs}
          record={feature as unknown as Record<string, unknown> & { id: string }}
          onSave={(patch) => update.mutateAsync({ id: feature.id, ...patch })}
        />
        {feature.category === 'B_MIXED' && (
          <StepNotice tone="info">
            Mešovita karakteristika: ne izbacuje se automatski. Obrazložite zašto je izgled biran i šta je uslovljeno funkcijom.
          </StepNotice>
        )}
        {feature.functionalityRisk === 'HIGH_FUNCTIONAL_DEPENDENCE' && (
          <StepNotice tone="warning">
            PREPORUKA (pravilo projekta, §11): ako ovaj element pre svega deluje tehnički, proverite sa zastupnikom da li bi za
            njega bila primerenija dodatna zaštita patentom, malim patentom ili drugim pravom. To se ne meša sa sadržajem
            prijave industrijskog dizajna.
          </StepNotice>
        )}
        <div>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setOpen((o) => !o)}>
            {open ? 'Sakrij' : 'Prikaži'} „Tehnička funkcija naspram vizuelnog dizajna" ({answered}/8)
          </Button>
        </div>
        {open && <FunctionAnalysis projectId={projectId} feature={feature} />}
        <RecordControls
          record={feature}
          onConfirm={() => confirm.mutate(feature.id)}
          onDelete={() => remove.mutate(feature.id)}
          confirmPending={confirm.isPending}
          error={confirm.error ?? remove.error ?? update.error}
        />
      </CardContent>
    </Card>
  );
}

function FunctionAnalysis({ projectId, feature }: { projectId: string; feature: DesignFeatureRecord }) {
  const questions = useFunctionAnalysisQuestions();
  const save = useSaveFunctionAnswer(projectId);
  const confirm = useConfirmFunctionAnswer(projectId);

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
      {questions.data?.map((q) => {
        const answer: FunctionAnalysisAnswer | undefined = feature.functionAnalysis.find((a) => a.questionNumber === q.number);
        return (
          <div key={q.number} className="flex flex-col gap-1.5">
            <AutosaveField
              idPrefix={`${feature.id}-q${q.number}`}
              spec={{ name: `q${q.number}`, label: `${q.number}. ${q.text}`, type: 'textarea' }}
              initial={answer?.answer ?? ''}
              onSave={(value) => save.mutateAsync({ featureId: feature.id, questionNumber: q.number, answer: value ?? '' })}
            />
            {answer && (
              <div className="flex flex-wrap items-center gap-2">
                <KindBadge kind={answer.kind} confirmedUserFact={answer.kind === 'FACT' && answer.verified} />
                {!answer.verified && answer.answer.trim() && answer.kind !== 'RECOMMENDATION' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirm.mutate({ featureId: feature.id, questionNumber: q.number })}
                    disabled={confirm.isPending}
                  >
                    POTVRDI
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <ErrorText error={save.error ?? confirm.error} />
    </div>
  );
}
