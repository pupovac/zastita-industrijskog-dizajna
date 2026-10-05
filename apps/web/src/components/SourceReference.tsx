import { useState } from 'react';
import type { SourceType } from '@/api/types';
import { Button } from '@/components/ui/button';
import { SOURCE_TYPE_LABEL } from '@/lib/labels';

/**
 * „Prikaži izvor". A conclusion without a recorded source is labeled as such and is
 * never presented as if it had one.
 */
export function SourceReference({
  sourceType,
  reference,
  url,
  detail,
}: {
  sourceType: SourceType;
  reference: string | null;
  url?: string | null;
  detail?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const hasSource = Boolean(reference?.trim() || url);

  if (!hasSource) {
    return (
      <span className="text-xs text-muted-foreground">
        Izvor: {SOURCE_TYPE_LABEL[sourceType]} · <span className="font-medium text-amber-700">bez navedenog izvora</span>
      </span>
    );
  }

  return (
    <div className="text-xs">
      <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setOpen((o) => !o)}>
        {open ? 'Sakrij izvor' : 'Prikaži izvor'}
      </Button>
      {open && (
        <div className="mt-1 rounded-md border bg-muted/50 px-3 py-2 text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">{SOURCE_TYPE_LABEL[sourceType]}</span>
            {reference ? ` · ${reference}` : null}
          </div>
          {detail && <div>{detail}</div>}
          {url && (
            <a href={url} target="_blank" rel="noreferrer noopener" className="break-all text-primary underline">
              {url}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
