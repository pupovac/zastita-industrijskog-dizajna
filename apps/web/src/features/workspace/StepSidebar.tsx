import { NavLink } from 'react-router-dom';
import { useSteps } from '@/api/hooks';
import { StepStatusBadge } from '@/components/StatusBadge';
import { ErrorText } from '@/components/ErrorText';
import { cn } from '@/lib/utils';

export function StepSidebar({ projectId }: { projectId: string }) {
  const steps = useSteps(projectId);

  return (
    <nav aria-label="Faze projekta" className="py-4">
      <div className="px-4 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Faze projekta</div>
      <ErrorText error={steps.error} />
      <ol>
        {steps.data?.map((step) => (
          <li key={step.stepKey}>
            <NavLink
              to={`/projects/${projectId}/steps/${step.stepKey}`}
              className={({ isActive }) =>
                cn(
                  'flex gap-3 border-l-2 px-4 py-2 text-sm hover:bg-accent',
                  isActive ? 'border-primary bg-accent' : 'border-transparent',
                )
              }
            >
              <span className="w-5 shrink-0 text-right tabular-nums text-muted-foreground">{step.position}.</span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="leading-snug">{step.title}</span>
                <StepStatusBadge status={step.status} />
              </span>
            </NavLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
