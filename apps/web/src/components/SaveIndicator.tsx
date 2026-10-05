import { SAVE_STATE_LABEL, type SaveState } from '@/lib/use-autosave';
import { cn } from '@/lib/utils';

export function SaveIndicator({ state, error }: { state: SaveState; error?: string | null }) {
  if (state === 'idle') return null;
  return (
    <span
      role="status"
      title={error ?? undefined}
      className={cn('text-xs', state === 'error' ? 'text-destructive' : 'text-muted-foreground')}
    >
      {SAVE_STATE_LABEL[state]}
    </span>
  );
}
