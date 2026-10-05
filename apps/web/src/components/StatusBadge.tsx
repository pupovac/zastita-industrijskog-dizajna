import type { InformationKind, StepStatus } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { CONFIRMED_USER_FACT_LABEL, KIND_LABEL, KIND_TONE, STEP_STATUS_LABEL, STEP_STATUS_TONE } from '@/lib/labels';

export function StepStatusBadge({ status }: { status: StepStatus }) {
  return <Badge variant={STEP_STATUS_TONE[status]}>{STEP_STATUS_LABEL[status]}</Badge>;
}

export function KindBadge({ kind, confirmedUserFact }: { kind: InformationKind; confirmedUserFact?: boolean }) {
  if (confirmedUserFact) return <Badge variant="success">{CONFIRMED_USER_FACT_LABEL}</Badge>;
  return <Badge variant={KIND_TONE[kind]}>{KIND_LABEL[kind]}</Badge>;
}
