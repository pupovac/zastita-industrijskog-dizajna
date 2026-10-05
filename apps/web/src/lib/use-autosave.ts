import { useCallback, useEffect, useRef, useState } from 'react';

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/**
 * Persists a value shortly after every change (and immediately on flush/unmount),
 * so user input is never held only in the browser until the end of a step.
 * With `merge`, changes made within one delay window are combined (e.g. field patches).
 */
export function useAutosave<T>(
  save: (value: T) => Promise<unknown>,
  options: { delayMs?: number; merge?: (pending: T, next: T) => T } = {},
) {
  const { delayMs = 600, merge } = options;
  const mergeRef = useRef(merge);
  mergeRef.current = merge;
  const [state, setState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    setState('saving');
    try {
      await saveRef.current(next.value);
      setError(null);
      setState(pending.current ? 'pending' : 'saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Čuvanje nije uspelo.');
      setState('error');
    }
  }, []);

  const schedule = useCallback(
    (value: T) => {
      const previous = pending.current;
      pending.current = { value: previous && mergeRef.current ? mergeRef.current(previous.value, value) : value };
      setState('pending');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delayMs);
    },
    [delayMs, flush],
  );

  useEffect(
    () => () => {
      void flush();
    },
    [flush],
  );

  return { schedule, flush, state, error };
}

export const SAVE_STATE_LABEL: Record<SaveState, string> = {
  idle: '',
  pending: 'Izmene čekaju čuvanje…',
  saving: 'Čuvanje…',
  saved: 'Sačuvano',
  error: 'Greška pri čuvanju',
};
