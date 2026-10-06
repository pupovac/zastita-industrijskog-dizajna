import { cn } from '@/lib/utils';

/** A short, sober notice line inside a step (no decorative elements). */
export function StepNotice({ tone = 'info', children }: { tone?: 'info' | 'warning' | 'danger'; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        tone === 'info' && 'border-sky-200 bg-sky-50 text-sky-900',
        tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-900',
        tone === 'danger' && 'border-red-200 bg-red-50 text-red-900',
      )}
    >
      {children}
    </div>
  );
}
