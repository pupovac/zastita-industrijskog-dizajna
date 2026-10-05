import { useState } from 'react';
import { useConfirmFact, useUpdateFact } from '@/api/hooks';
import type { Fact } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { KindBadge } from '@/components/StatusBadge';
import { SourceReference } from '@/components/SourceReference';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime, KIND_LABEL } from '@/lib/labels';

type Mode = 'view' | 'edit' | 'detail';

/**
 * One piece of information with its provenance. POTVRDI is the only way an item
 * becomes "POTVRĐENA ČINJENICA KORISNIKA"; the backend enforces the same rule.
 */
export function FactCard({ projectId, fact }: { projectId: string; fact: Fact }) {
  const confirm = useConfirmFact(projectId);
  const update = useUpdateFact(projectId);
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState('');
  const canConfirm = !fact.verified && fact.kind !== 'RECOMMENDATION';
  const text = fact.value || fact.statement;

  const save = () => {
    const next = mode === 'detail' ? `${text}\n${draft.trim()}` : draft.trim();
    const patch = fact.value ? { value: next } : { statement: next };
    update.mutate({ factId: fact.id, ...patch }, { onSuccess: () => setMode('view') });
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <KindBadge kind={fact.kind} confirmedUserFact={fact.confirmedUserFact} />
        {!fact.verified && fact.kind !== 'RECOMMENDATION' && (
          <span className="text-xs text-amber-700">Nije potvrđeno</span>
        )}
        {fact.originKind !== fact.kind && (
          <span className="text-xs text-muted-foreground">prvobitno: {KIND_LABEL[fact.originKind]}</span>
        )}
        {fact.confidence !== null && (
          <span className="text-xs text-muted-foreground">pouzdanost {Math.round(fact.confidence * 100)}%</span>
        )}
      </div>

      <div className="text-sm">
        {fact.value ? (
          <>
            <div className="text-muted-foreground">{fact.statement}</div>
            <div className="whitespace-pre-wrap">{fact.value}</div>
          </>
        ) : (
          <div className="whitespace-pre-wrap">{fact.statement}</div>
        )}
      </div>

      <SourceReference sourceType={fact.sourceType} reference={fact.sourceReference} />

      {fact.confirmedAt && (
        <div className="text-xs text-muted-foreground">Potvrdio korisnik {formatDateTime(fact.confirmedAt)}</div>
      )}

      {mode !== 'view' && (
        <div className="flex flex-col gap-2">
          <Textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={mode === 'detail' ? 'Dodatni detalj' : undefined}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={!draft.trim() || update.isPending}>
              Sačuvaj
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode('view')}>
              Otkaži
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Posle izmene stavka ponovo čeka vašu potvrdu.</p>
        </div>
      )}

      {mode === 'view' && (
        <div className="flex flex-wrap gap-2">
          {canConfirm && (
            <Button size="sm" onClick={() => confirm.mutate(fact.id)} disabled={confirm.isPending}>
              POTVRDI
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDraft(text);
              setMode('edit');
            }}
          >
            IZMENI
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDraft('');
              setMode('detail');
            }}
          >
            DODAJ DETALJ
          </Button>
        </div>
      )}
      <ErrorText error={confirm.error ?? update.error} />
    </div>
  );
}
