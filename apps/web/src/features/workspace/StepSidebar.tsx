import { Lock } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useSteps } from '@/api/hooks';
import type { ProjectStep, StepPhase } from '@/api/types';
import { StepStatusBadge } from '@/components/StatusBadge';
import { ErrorText } from '@/components/ErrorText';
import { FILING_PHASE_NOTE, STEP_PHASE_LABEL } from '@/lib/labels';
import { lockedBy, lockedTooltip } from '@/lib/step-feedback';
import { cn } from '@/lib/utils';

const PHASES: StepPhase[] = ['DRAFTING', 'FILING'];

export function StepSidebar({ projectId }: { projectId: string }) {
  const steps = useSteps(projectId);
  const all = steps.data ?? [];

  return (
    <nav aria-label="Faze projekta" className="py-4">
      <div className="px-4 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Faze projekta</div>
      <ErrorText error={steps.error} />
      {PHASES.map((phase) => {
        const phaseSteps = all.filter((s) => s.phase === phase);
        if (phaseSteps.length === 0) return null;
        return (
          <section key={phase} aria-label={STEP_PHASE_LABEL[phase]} className="pb-2">
            <div className="px-4 pb-1 pt-3 text-xs font-medium text-muted-foreground">{STEP_PHASE_LABEL[phase]}</div>
            {phase === 'FILING' && <p className="px-4 pb-2 text-xs text-muted-foreground">{FILING_PHASE_NOTE}</p>}
            <ol>
              {phaseSteps.map((step) => {
                const locked = lockedBy(all, step);
                return (
                  <StepLink
                    key={step.stepKey}
                    projectId={projectId}
                    step={step}
                    lockedTooltip={locked ? lockedTooltip(locked) : null}
                  />
                );
              })}
            </ol>
          </section>
        );
      })}
    </nav>
  );
}

function StepLink({
  projectId,
  step,
  lockedTooltip,
}: {
  projectId: string;
  step: ProjectStep;
  lockedTooltip: string | null;
}) {
  return (
    <li>
      <NavLink
        to={`/projects/${projectId}/steps/${step.stepKey}`}
        title={lockedTooltip ?? undefined}
        className={({ isActive }) =>
          cn(
            'flex gap-3 border-l-2 px-4 py-2 text-sm hover:bg-accent',
            isActive ? 'border-primary bg-accent' : 'border-transparent',
          )
        }
      >
        <span className="w-5 shrink-0 text-right tabular-nums text-muted-foreground">{step.position}.</span>
        <span className="flex min-w-0 flex-col gap-1">
          <span className={cn('flex items-center gap-1.5 leading-snug', lockedTooltip && 'text-muted-foreground')}>
            {step.title}
            {lockedTooltip && (
              <>
                <Lock aria-hidden className="size-3 shrink-0" />
                <span className="sr-only">{lockedTooltip}</span>
              </>
            )}
          </span>
          <StepStatusBadge status={step.status} />
        </span>
      </NavLink>
    </li>
  );
}
