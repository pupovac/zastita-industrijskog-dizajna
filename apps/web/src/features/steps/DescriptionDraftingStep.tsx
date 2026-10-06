import { useState } from 'react';
import { useAddDraftVersion, useApplicationSections, useConfirmSection, useSaveWorkingDraft } from '@/api/hooks';
import type { ApplicationSectionRecord, DraftVersion } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { selectClass } from '@/components/fields';
import { SaveIndicator } from '@/components/SaveIndicator';
import { StepNotice } from '@/components/StepNotice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { diffWords } from '@/lib/diff';
import { ACTOR_LABEL, formatDateTime } from '@/lib/labels';
import { useAutosave } from '@/lib/use-autosave';
import { cn } from '@/lib/utils';

/** Checked automatically in every saved version (the backend runs the same check before packaging). */
const PATENT_TERMS = [
  'pronalazak',
  'patentni zahtev',
  'tehnički problem',
  'tehnički efekat',
  'inventivni nivo',
  'realizacija pronalaska',
  'pogrešan naziv postupka (patentiranje umesto prijave za priznanje prava na industrijski dizajn)',
];

/** Step 10: the description sections, their version history and comparison of versions. */
export function DescriptionDraftingStep({ projectId }: { projectId: string }) {
  const sections = useApplicationSections(projectId);
  if (sections.error) return <ErrorText error={sections.error} />;
  if (!sections.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  const withIssues = sections.data.filter((s) => (s.versions[0]?.terminologyIssues.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-6">
      <StepNotice tone="info">
        Opis se piše kao prijava industrijskog dizajna: linije, konture, oblik, proporcije, tekstura, boja i ukupan izgled,
        usklađeno sa prikazima. Svaka verzija se automatski proverava na patentnu terminologiju: {PATENT_TERMS.join(', ')}.
      </StepNotice>
      {withIssues.length > 0 && (
        <StepNotice tone="danger">
          Patentna terminologija pronađena u: {withIssues.map((s) => s.title).join(', ')}. Finalni paket se ne generiše dok
          se tekst ne ispravi.
        </StepNotice>
      )}
      {sections.data.map((section) => (
        <SectionEditor key={section.id} projectId={projectId} section={section} />
      ))}
    </div>
  );
}

function SectionEditor({ projectId, section }: { projectId: string; section: ApplicationSectionRecord }) {
  const saveDraft = useSaveWorkingDraft(projectId);
  const addVersion = useAddDraftVersion(projectId);
  const confirm = useConfirmSection(projectId);
  const latest = section.versions[0] ?? null;
  const [value, setValue] = useState(latest?.content ?? '');
  const [showHistory, setShowHistory] = useState(false);
  const autosave = useAutosave((content: string) => saveDraft.mutateAsync({ sectionId: section.id, content }));

  return (
    <Card className="gap-3 py-4">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{section.title}</CardTitle>
          {section.required && <Badge variant="outline">Obavezno</Badge>}
          <Badge variant={section.confirmed ? 'success' : 'warning'}>{section.confirmed ? 'POTVRĐENO' : 'Nije potvrđeno'}</Badge>
          {latest && (
            <span className="text-xs text-muted-foreground">
              verzija {latest.versionNumber} · {ACTOR_LABEL[latest.createdByActor]} · {formatDateTime(latest.createdAt)}
            </span>
          )}
          <span className="ml-auto">
            <SaveIndicator state={autosave.state} error={autosave.error} />
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          aria-label={section.title}
          className="min-h-28"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            autosave.schedule(e.target.value);
          }}
          onBlur={() => void autosave.flush()}
        />
        {latest && latest.terminologyIssues.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-destructive">Patentna terminologija:</span>
            {latest.terminologyIssues.map((m, i) => (
              <Badge key={i} variant="danger" title={`„${m.match}"`}>
                {m.term}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!value.trim() || addVersion.isPending}
            onClick={async () => {
              await autosave.flush();
              addVersion.mutate({ sectionId: section.id, content: value });
            }}
          >
            Sačuvaj kao novu verziju
          </Button>
          {!section.confirmed && latest?.content.trim() && (
            <Button
              size="sm"
              disabled={confirm.isPending || autosave.state === 'pending' || autosave.state === 'saving'}
              onClick={() => confirm.mutate(section.id)}
            >
              POTVRDI tekst
            </Button>
          )}
          {section.versions.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setShowHistory((s) => !s)}>
              {showHistory ? 'Sakrij' : 'Istorija verzija'} ({section.versions.length})
            </Button>
          )}
        </div>
        <ErrorText error={saveDraft.error ?? addVersion.error ?? confirm.error} />
        {showHistory && <VersionHistory versions={section.versions} />}
      </CardContent>
    </Card>
  );
}

function VersionHistory({ versions }: { versions: DraftVersion[] }) {
  const [left, setLeft] = useState(versions[1]?.versionNumber ?? versions[0].versionNumber);
  const [right, setRight] = useState(versions[0].versionNumber);
  const a = versions.find((v) => v.versionNumber === left);
  const b = versions.find((v) => v.versionNumber === right);
  const select = (value: number, onChange: (n: number) => void, label: string) => (
    <select aria-label={label} className={cn(selectClass, 'w-auto')} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {versions.map((v) => (
        <option key={v.id} value={v.versionNumber}>
          v{v.versionNumber} · {ACTOR_LABEL[v.createdByActor]} · {formatDateTime(v.createdAt)}
          {v.verified ? ' · potvrđena' : ''}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>Uporedi</span>
        {select(left, setLeft, 'Starija verzija')}
        <span>sa</span>
        {select(right, setRight, 'Novija verzija')}
      </div>
      {a && b && (
        <p className="whitespace-pre-wrap rounded-md border bg-card px-3 py-2 text-sm">
          {diffWords(a.content, b.content).map((part, i) => (
            <span
              key={i}
              className={cn(
                part.kind === 'added' && 'bg-emerald-100 text-emerald-900',
                part.kind === 'removed' && 'bg-red-100 text-red-900 line-through',
              )}
            >
              {part.text}
            </span>
          ))}
        </p>
      )}
      <p className="text-xs text-muted-foreground">Zeleno: dodato u novijoj verziji. Precrtano: uklonjeno.</p>
    </div>
  );
}
