import type { InformationKind, SourceType } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { KindBadge } from '@/components/StatusBadge';
import { SourceReference } from '@/components/SourceReference';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Provenance of a record and the user's actions on it. POTVRDI is the only way a record
 * becomes confirmed; a confirmed recommendation is adopted as the user's decision.
 */
export function RecordControls({
  record,
  onConfirm,
  onDelete,
  confirmPending,
  error,
  detail,
  url,
}: {
  record: {
    kind?: InformationKind;
    sourceType: SourceType;
    sourceReference: string | null;
    verified: boolean;
    confidence?: number | null;
  };
  onConfirm?: () => void;
  onDelete?: () => void;
  confirmPending?: boolean;
  error?: unknown;
  detail?: string | null;
  url?: string | null;
}) {
  const confirmedFact = record.verified && record.kind === 'FACT';
  return (
    <div className="flex flex-col gap-2 border-t pt-2">
      <div className="flex flex-wrap items-center gap-2">
        {record.kind && <KindBadge kind={record.kind} confirmedUserFact={confirmedFact} />}
        {!confirmedFact && (
          <Badge variant={record.verified ? 'success' : 'warning'}>
            {record.verified ? (record.kind === 'RECOMMENDATION' ? 'USVOJENO' : 'POTVRĐENO') : 'Nije potvrđeno'}
          </Badge>
        )}
        {record.confidence !== null && record.confidence !== undefined && (
          <span className="text-xs text-muted-foreground">pouzdanost {Math.round(record.confidence * 100)}%</span>
        )}
        <div className="ml-auto flex gap-2">
          {onConfirm && !record.verified && (
            <Button size="sm" onClick={onConfirm} disabled={confirmPending}>
              POTVRDI
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (window.confirm('Obrisati ovaj zapis?')) onDelete();
              }}
            >
              Obriši
            </Button>
          )}
        </div>
      </div>
      <SourceReference sourceType={record.sourceType} reference={record.sourceReference} detail={detail} url={url} />
      <ErrorText error={error} />
    </div>
  );
}
