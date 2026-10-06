import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProject, useSteps, useUpdateProject } from '@/api/hooks';
import { ErrorText } from '@/components/ErrorText';
import { FILING_PHASE_NOTE, STEP_PHASE_LABEL } from '@/lib/labels';
import { D1FormStep } from '../steps/D1FormStep';
import { DescriptionDraftingStep } from '../steps/DescriptionDraftingStep';
import { DocumentUploadStep } from '../steps/DocumentUploadStep';
import { FinalPackageStep } from '../steps/FinalPackageStep';
import { FinalReviewStep } from '../steps/FinalReviewStep';
import { IndependentReviewStep } from '../steps/IndependentReviewStep';
import { InterviewStep } from '../steps/InterviewStep';
import { PriorDesignSearchStep } from '../steps/PriorDesignSearchStep';
import { ProjectSetupStep } from '../steps/ProjectSetupStep';
import { ProtectionStrategyStep } from '../steps/ProtectionStrategyStep';
import { RepresentationPlanStep } from '../steps/RepresentationPlanStep';
import { RequirementsSummaryStep } from '../steps/RequirementsSummaryStep';
import { VisualAnalysisStep } from '../steps/VisualAnalysisStep';
import { ZisResearchStep } from '../steps/ZisResearchStep';
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
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <div className="text-xs text-muted-foreground">
          Korak {step.position} od {steps.data.length} · {STEP_PHASE_LABEL[step.phase]}
        </div>
        <h1 className="text-xl font-semibold">{step.title}</h1>
        {step.phase === 'FILING' && <p className="mt-1 text-sm text-muted-foreground">{FILING_PHASE_NOTE}</p>}
      </div>
      <StepStatusCard projectId={projectId} step={step} />
      <StepBody key={`${projectId}-${step.stepKey}`} projectId={projectId} stepKey={step.stepKey} />
    </div>
  );
}

/** Every one of the 14 steps has its own working screen. */
function StepBody({ projectId, stepKey }: { projectId: string; stepKey: string }) {
  switch (stepKey) {
    case 'PROJECT_SETUP':
      return <ProjectSetupStep projectId={projectId} />;
    case 'ZIS_RESEARCH':
      return <ZisResearchStep projectId={projectId} />;
    case 'REQUIREMENTS_SUMMARY':
      return <RequirementsSummaryStep projectId={projectId} />;
    case 'PRODUCT_INTERVIEW':
      return <InterviewStep projectId={projectId} stepKey={stepKey} />;
    case 'DOCUMENT_UPLOAD':
      return <DocumentUploadStep projectId={projectId} />;
    case 'VISUAL_ANALYSIS':
      return <VisualAnalysisStep projectId={projectId} />;
    case 'PRIOR_DESIGN_SEARCH':
      return <PriorDesignSearchStep projectId={projectId} />;
    case 'PROTECTION_STRATEGY':
      return <ProtectionStrategyStep projectId={projectId} />;
    case 'REPRESENTATION_PLAN':
      return <RepresentationPlanStep projectId={projectId} />;
    case 'DESCRIPTION_DRAFTING':
      return <DescriptionDraftingStep projectId={projectId} />;
    case 'INDEPENDENT_REVIEW':
      return <IndependentReviewStep projectId={projectId} />;
    case 'D1_FORM_DATA':
      return <D1FormStep projectId={projectId} />;
    case 'FINAL_PACKAGE':
      return <FinalPackageStep projectId={projectId} />;
    case 'FINAL_APPLICANT_REVIEW':
      return <FinalReviewStep projectId={projectId} />;
    default:
      return <p className="text-sm text-muted-foreground">Nepoznat korak.</p>;
  }
}
