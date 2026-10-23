import { cn } from '@/lib/utils';

export type StepNoticeTone = 'info' | 'success' | 'warning' | 'danger';

/** A short, sober notice line inside a step (no decorative elements). */
export function StepNotice({
  tone = 'info',
  role,
  className,
  children,
}: {
  tone?: StepNoticeTone;
  role?: 'status' | 'alert';
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role={role}
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        tone === 'info' && 'border-sky-200 bg-sky-50 text-sky-900',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
        tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-900',
        tone === 'danger' && 'border-red-200 bg-red-50 text-red-900',
        className,
      )}
    >
      {children}
    </div>
  );
}
