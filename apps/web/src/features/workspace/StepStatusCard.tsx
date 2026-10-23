import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '@/api/client';
import { useTransitionStep } from '@/api/hooks';
import type { ProjectStep, StepStatus } from '@/api/types';
import { StepStatusBadge } from '@/components/StatusBadge';
import { StepNotice } from '@/components/StepNotice';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  STEP_APPROVAL_RULE,
  STEP_STATUS_HELP,
  STEP_STATUS_HINT,
  stepActionsFor,
  type StepAction,
} from '@/lib/labels';
import {
  lockedBy,
  lockedTooltip,
  nextStep,
  previousStep,
  stepTransitionFeedback,
  transitionErrorHint,
  type StepFeedback,
} from '@/lib/step-feedback';

const STATUS_ORDER: StepStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'WAITING_FOR_USER',
  'BLOCKED',
  'READY_FOR_REVIEW',
  'APPROVED',
];

/** Secondary moves stay quiet; the single forward move is the highlighted button. */
function buttonVariant(action: StepAction): 'default' | 'outline' | 'ghost' {
  if (action.primary) return 'default';
  return action.to === 'BLOCKED' ? 'ghost' : 'outline';
}

export function StepStatusCard({
  projectId,
  step,
  steps,
}: {
  projectId: string;
  step: ProjectStep;
  steps: ProjectStep[];
}) {
  const transition = useTransitionStep(projectId);
  const [reasonFor, setReasonFor] = useState<StepStatus | null>(null);
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<StepFeedback | null>(null);

  const previous = previousStep(steps, step);
  const locked = lockedBy(steps, step);
  // The web UI always acts as the user; agent-only moves (e.g. "Čeka korisnika") are not offered.
  const actions = stepActionsFor(step.status, 'USER');

  const move = (to: StepStatus, withReason?: string) => {
    const from = step.status;
    setFeedback(null);
    transition.mutate(
      { stepKey: step.stepKey, to, reason: withReason },
      {
        onSuccess: (updated) => {
          setReasonFor(null);
          setReason('');
          setFeedback(stepTransitionFeedback(from, to, nextStep(updated, step)));
        },
      },
    );
  };

  const error = transition.error;
  const errorCode = error instanceof ApiError ? error.code : undefined;
  const errorHint = transitionErrorHint(errorCode, previous);

  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">Status koraka</span>
          <StepStatusBadge status={step.status} />
          {step.openBlockingItems > 0 && (
            <span className="text-xs text-destructive">
              Otvorenih blokirajućih stavki: {step.openBlockingItems}
            </span>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                key={action.to}
                size="sm"
                variant={buttonVariant(action)}
                disabled={transition.isPending}
                onClick={() => (action.needsReason ? setReasonFor(action.to) : move(action.to))}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {locked ? lockedTooltip(locked) : STEP_STATUS_HINT[step.status]}
        </p>

        {feedback && (
          <StepNotice tone={feedback.tone} role="status">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="flex-1 font-medium">{feedback.message}</p>
              {feedback.unlockedStep && (
                <Link
                  to={`/projects/${projectId}/steps/${feedback.unlockedStep.stepKey}`}
                  className="underline underline-offset-4"
                >
                  Otvori korak {feedback.unlockedStep.position}
                </Link>
              )}
              <button type="button" className="text-xs underline-offset-4 hover:underline" onClick={() => setFeedback(null)}>
                Zatvori
              </button>
            </div>
          </StepNotice>
        )}

        {error && (
          <StepNotice tone="danger" role="alert">
            <p className="font-medium">
              {error instanceof Error ? error.message : 'Promena statusa nije uspela.'}
            </p>
            {errorHint && <p>{errorHint}</p>}
          </StepNotice>
        )}

        {step.blockedByBlockerFindings > 0 && (
          <p className="text-sm text-destructive">
            Korak je zatvoren dok postoji nerešen nalaz BLOCKER iz nezavisne provere ({step.blockedByBlockerFindings}).
          </p>
        )}
        {step.status === 'BLOCKED' && step.blockedReason && (
          <p className="text-sm">
            <span className="text-muted-foreground">Razlog blokade: </span>
            {step.blockedReason}
          </p>
        )}

        {reasonFor && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              move(reasonFor, reason);
            }}
          >
            <Input
              autoFocus
              placeholder="Razlog blokade"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button type="submit" size="sm" disabled={!reason.trim() || transition.isPending}>
              Potvrdi
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setReasonFor(null)}>
              Otkaži
            </Button>
          </form>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
            Šta znače statusi i ko odobrava korak?
          </summary>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            {STATUS_ORDER.map((status) => (
              <div key={status} className="contents">
                <dt className="pt-0.5">
                  <StepStatusBadge status={status} />
                </dt>
                <dd className="text-muted-foreground">{STEP_STATUS_HELP[status]}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 font-medium">{STEP_APPROVAL_RULE}</p>
        </details>
      </CardContent>
    </Card>
  );
}
