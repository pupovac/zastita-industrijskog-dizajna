import { useState } from 'react';
import { useTransitionStep } from '@/api/hooks';
import type { ProjectStep, StepStatus } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { StepStatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { STEP_ACTIONS } from '@/lib/labels';

export function StepStatusCard({ projectId, step }: { projectId: string; step: ProjectStep }) {
  const transition = useTransitionStep(projectId);
  const [reasonFor, setReasonFor] = useState<StepStatus | null>(null);
  const [reason, setReason] = useState('');

  const move = (to: StepStatus, withReason?: string) =>
    transition.mutate(
      { stepKey: step.stepKey, to, reason: withReason },
      {
        onSuccess: () => {
          setReasonFor(null);
          setReason('');
        },
      },
    );

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
            {STEP_ACTIONS[step.status].map((action) => (
              <Button
                key={action.to}
                size="sm"
                variant={action.to === 'APPROVED' ? 'default' : 'outline'}
                disabled={transition.isPending}
                onClick={() => (action.needsReason ? setReasonFor(action.to) : move(action.to))}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </div>
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
        <ErrorText error={transition.error} />
      </CardContent>
    </Card>
  );
}
