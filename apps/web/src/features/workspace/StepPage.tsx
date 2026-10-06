import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProject, useSteps, useUpdateProject } from '@/api/hooks';
import { ErrorText } from '@/components/ErrorText';
import { FILING_PHASE_NOTE, STEP_PHASE_LABEL } from '@/lib/labels';
import { DocumentUploadStep } from '../steps/DocumentUploadStep';
import { InterviewStep } from '../steps/InterviewStep';
import { PlaceholderStep } from '../steps/PlaceholderStep';
import { ProjectSetupStep } from '../steps/ProjectSetupStep';
import { StepStatusCard } from './StepStatusCard';

export function StepPage() {
  const { projectId = '', stepKey = '' } = useParams();
  const steps = useSteps(projectId);
  const project = useProject(projectId);
  const updateProject = useUpdateProject(projectId);
  const step = steps.data?.find((s) => s.stepKey === stepKey);

  // Remember where the user is, so reopening the project resumes here.
  const currentStepKey = project.data?.currentStepKey;
  const { mutate } = updateProject;
  useEffect(() => {
    if (step && currentStepKey && currentStepKey !== step.stepKey) mutate({ currentStepKey: step.stepKey });
  }, [step, currentStepKey, mutate]);

  if (steps.error) return <ErrorText error={steps.error} />;
  if (!steps.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  if (!step) return <p className="text-sm text-muted-foreground">Korak ne postoji.</p>;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <div className="text-xs text-muted-foreground">
          Korak {step.position} od {steps.data.length} · {STEP_PHASE_LABEL[step.phase]}
        </div>
        <h1 className="text-xl font-semibold">{step.title}</h1>
        {step.phase === 'FILING' && <p className="mt-1 text-sm text-muted-foreground">{FILING_PHASE_NOTE}</p>}
      </div>
      <StepStatusCard projectId={projectId} step={step} />
      <StepBody projectId={projectId} stepKey={step.stepKey} />
    </div>
  );
}

function StepBody({ projectId, stepKey }: { projectId: string; stepKey: string }) {
  switch (stepKey) {
    case 'PROJECT_SETUP':
      return <ProjectSetupStep projectId={projectId} />;
    case 'PRODUCT_INTERVIEW':
      return <InterviewStep projectId={projectId} stepKey={stepKey} />;
    case 'DOCUMENT_UPLOAD':
      return <DocumentUploadStep projectId={projectId} />;
    default:
      return <PlaceholderStep />;
  }
}
