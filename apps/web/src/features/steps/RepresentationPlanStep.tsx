import {
  useCollection,
  useConfirmRecord,
  useCreateRecord,
  useDeleteRecord,
  useUpdateRecord,
  useUploadFile,
} from '@/api/hooks';
import type { Representation } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { AddRecordForm, FieldSpec, options, RecordFields } from '@/components/fields';
import { RecordControls } from '@/components/RecordControls';
import { StepNotice } from '@/components/StepNotice';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ASSESSMENT_LABEL,
  ASSESSMENT_TONE,
  REPRESENTATION_MEDIUM_LABEL,
  REPRESENTATION_REQUIREMENT_LABEL,
} from '@/lib/labels';
import { FilePreview } from './FilePreview';

const PLAN_SPECS: FieldSpec[] = [
  { name: 'viewName', label: 'Prikaz', type: 'text', required: true },
  {
    name: 'requirement',
    label: 'Obavezan ili preporučen',
    type: 'select',
    options: options(REPRESENTATION_REQUIREMENT_LABEL),
    required: true,
  },
  { name: 'purpose', label: 'Zašto je potreban', type: 'textarea' },
  { name: 'featureShown', label: 'Koju karakteristiku pokazuje', type: 'textarea' },
  { name: 'medium', label: 'Medij', type: 'select', options: options(REPRESENTATION_MEDIUM_LABEL) },
  { name: 'mediumRationale', label: 'Zašto taj medij', type: 'textarea' },
];

const ASSESSMENT_SPECS: FieldSpec[] = [
  { name: 'assessment', label: 'Ocena dostavljene slike', type: 'select', options: options(ASSESSMENT_LABEL), wide: true },
  { name: 'assessmentNote', label: 'Razlog ocene', type: 'textarea', wide: true },
];

/** Step 9: "Plan prikaza dizajna" — every view with purpose, medium, the delivered image and its assessment. */
export function RepresentationPlanStep({ projectId }: { projectId: string }) {
  const views = useCollection<Representation>(projectId, 'representations');
  const create = useCreateRecord(projectId, 'representations');

  if (views.error) return <ErrorText error={views.error} />;
  if (!views.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  const mandatory = views.data.filter((v) => v.requirement === 'MANDATORY');
  const ready = mandatory.filter((v) => v.uploadedFileId && v.assessment === 'ACCEPTABLE').length;

  return (
    <div className="flex flex-col gap-6">
      <StepNotice tone="info">
        Prikaz industrijskog dizajna nije tehnički proizvodni crtež: bez kota, strelica dimenzija, tehničkih oznaka, brojeva
        delova, preseka i tehničkih napomena, osim ako ih aktuelna ZIS pravila izričito dozvoljavaju (pravila u Matrici
        zahteva, oblast „prikazi").
      </StepNotice>
      <p className="text-sm text-muted-foreground">
        Obavezni prikazi spremni (dostavljeni i ocenjeni kao PRIHVATLJIVO): {ready} od {mandatory.length}.
      </p>
      {views.data.map((view) => (
        <RepresentationCard key={view.id} projectId={projectId} view={view} />
      ))}
      <Card>
        <CardHeader>
          <CardTitle>Dodaj prikaz u plan</CardTitle>
          <CardDescription>
            Npr. perspektivni prikaz, pogled spreda, pozadi, sa leve i desne strane, odozgo, odozdo, dodatna perspektiva.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddRecordForm
            specs={PLAN_SPECS}
            submitLabel="Dodaj prikaz"
            defaults={{ sourceType: 'USER' }}
            onSubmit={(values) => create.mutateAsync(values)}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function RepresentationCard({ projectId, view }: { projectId: string; view: Representation }) {
  const update = useUpdateRecord(projectId, 'representations');
  const confirm = useConfirmRecord(projectId, 'representations');
  const remove = useDeleteRecord(projectId, 'representations');
  const upload = useUploadFile(projectId);
  const save = (patch: Record<string, unknown>) => update.mutateAsync({ id: view.id, ...patch });
  const record = view as unknown as Record<string, unknown> & { id: string };

  const attach = async (file: File) => {
    const uploaded = await upload.mutateAsync({ file, role: view.medium === 'PHOTO' ? 'PHOTO' : 'RENDER' });
    await save({ uploadedFileId: uploaded.id });
  };

  return (
    <Card className="gap-3 py-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">1.{view.position}</Badge>
          <span className="font-medium">{view.viewName}</span>
          <Badge variant={view.requirement === 'MANDATORY' ? 'secondary' : 'muted'}>
            {REPRESENTATION_REQUIREMENT_LABEL[view.requirement]}
          </Badge>
          {view.assessment && <Badge variant={ASSESSMENT_TONE[view.assessment]}>{ASSESSMENT_LABEL[view.assessment]}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <RecordFields specs={PLAN_SPECS} record={record} onSave={save} />
          <div className="flex flex-col gap-2">
            {view.uploadedFile ? (
              <FilePreview file={view.uploadedFile} />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                Slika nije dostavljena
              </div>
            )}
            <label className="inline-flex h-8 w-fit cursor-pointer items-center rounded-md border bg-card px-3 text-sm shadow-xs hover:bg-accent">
              {view.uploadedFile ? 'Otpremi novu sliku' : 'Otpremi sliku'}
              <input
                type="file"
                className="sr-only"
                accept=".png,.jpg,.jpeg,.svg,.pdf"
                disabled={upload.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) void attach(file).catch(() => undefined);
                }}
              />
            </label>
            <RecordFields specs={ASSESSMENT_SPECS} record={record} onSave={save} />
          </div>
        </div>
        <RecordControls
          record={view}
          onConfirm={() => confirm.mutate(view.id)}
          onDelete={() => remove.mutate(view.id)}
          confirmPending={confirm.isPending}
          error={upload.error ?? update.error ?? confirm.error ?? remove.error}
        />
      </CardContent>
    </Card>
  );
}
