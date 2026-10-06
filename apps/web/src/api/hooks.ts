import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, apiUpload } from './client';
import type {
  ApplicationSectionRecord,
  D1Field,
  Decision,
  Fact,
  FinalSignoff,
  InterviewGroup,
  MatrixRequirement,
  OpenQuestion,
  PackageStatus,
  ResearchImportSummary,
  ResearchReportSection,
  ReviewCheck,
  SignoffRole,
  StrategyEntry,
  StrategyItemKey,
  FileRole,
  Knowledge,
  Project,
  ProjectStep,
  Question,
  ReviewIssue,
  StepStatus,
  UploadedFile,
  UserAnswer,
} from './types';

export const keys = {
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  steps: (id: string) => ['projects', id, 'steps'] as const,
  questions: (id: string, stepKey: string) => ['projects', id, 'questions', stepKey] as const,
  files: (id: string) => ['projects', id, 'files'] as const,
  reviewIssues: (id: string) => ['projects', id, 'review-issues'] as const,
  knowledge: (id: string) => ['projects', id, 'knowledge'] as const,
  collection: (id: string, path: string) => ['projects', id, 'collection', path] as const,
  requirements: (id: string, filter: string) => ['projects', id, 'requirements', filter] as const,
  report: (id: string) => ['projects', id, 'research-report'] as const,
  strategy: (id: string) => ['projects', id, 'strategy'] as const,
  sections: (id: string) => ['projects', id, 'application-sections'] as const,
  d1: (id: string) => ['projects', id, 'd1'] as const,
  package: (id: string) => ['projects', id, 'package'] as const,
  signoffs: (id: string) => ['projects', id, 'signoffs'] as const,
  openQuestions: (id: string, stepKey: string) => ['projects', id, 'open-questions', stepKey] as const,
  decisions: (id: string) => ['projects', id, 'decisions'] as const,
};

export const useProjects = () => useQuery({ queryKey: keys.projects, queryFn: () => apiGet<Project[]>('/projects') });

export const useProject = (id: string) =>
  useQuery({ queryKey: keys.project(id), queryFn: () => apiGet<Project>(`/projects/${id}`) });

export const useSteps = (id: string) =>
  useQuery({ queryKey: keys.steps(id), queryFn: () => apiGet<ProjectStep[]>(`/projects/${id}/steps`) });

export const useQuestions = (id: string, stepKey: string) =>
  useQuery({
    queryKey: keys.questions(id, stepKey),
    queryFn: () => apiGet<Question[]>(`/projects/${id}/questions?stepKey=${encodeURIComponent(stepKey)}`),
  });

export const useFiles = (id: string) =>
  useQuery({ queryKey: keys.files(id), queryFn: () => apiGet<UploadedFile[]>(`/projects/${id}/files`) });

export const useReviewIssues = (id: string) =>
  useQuery({ queryKey: keys.reviewIssues(id), queryFn: () => apiGet<ReviewIssue[]>(`/projects/${id}/review-issues`) });

export const useKnowledge = (id: string) =>
  useQuery({ queryKey: keys.knowledge(id), queryFn: () => apiGet<Knowledge>(`/projects/${id}/knowledge`) });

/** Anything that changes project memory invalidates every view of this project. */
function useInvalidateProject(projectId: string) {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: keys.project(projectId) });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; productName?: string }) => apiSend<Project>('POST', '/projects', dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.projects }),
  });
}

export function useUpdateProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Project>) => apiSend<Project>('PATCH', `/projects/${projectId}`, patch),
    onSuccess: (project) => {
      qc.setQueryData<Project>(keys.project(projectId), (old) => (old ? { ...old, ...project } : old));
      void qc.invalidateQueries({ queryKey: keys.knowledge(projectId) });
    },
  });
}

export function useTransitionStep(projectId: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ stepKey, to, reason }: { stepKey: string; to: StepStatus; reason?: string }) =>
      apiSend<ProjectStep[]>('POST', `/projects/${projectId}/steps/${stepKey}/transition`, { to, reason }),
    onSuccess: (steps) => {
      qc.setQueryData(keys.steps(projectId), steps);
      void invalidate();
    },
  });
}

export function useSaveAnswer(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ questionId, value, attachmentFileId }: { questionId: string; value: string; attachmentFileId?: string | null }) =>
      apiSend<UserAnswer>('PUT', `/projects/${projectId}/answers/${questionId}`, { value, attachmentFileId }),
    onSuccess: () => void invalidate(),
  });
}

export function useUploadFile(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ file, role }: { file: File; role: FileRole }) => {
      const form = new FormData();
      form.append('role', role);
      form.append('file', file);
      return apiUpload<UploadedFile>(`/projects/${projectId}/files`, form);
    },
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateFileRole(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ fileId, role }: { fileId: string; role: FileRole }) =>
      apiSend<UploadedFile>('PATCH', `/files/${fileId}`, { role }),
    onSuccess: () => void invalidate(),
  });
}

export function useCreateConflict(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: (dto: { fileAId: string; fileBId: string; attribute: string; description?: string }) =>
      apiSend<ReviewIssue>('POST', `/projects/${projectId}/conflicts`, dto),
    onSuccess: () => void invalidate(),
  });
}

export function useResolveConflict(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ issueId, chosenFileId, note }: { issueId: string; chosenFileId: string; note?: string }) =>
      apiSend<ReviewIssue>('POST', `/review-issues/${issueId}/resolve-conflict`, { chosenFileId, note }),
    onSuccess: () => void invalidate(),
  });
}

export function useConfirmFact(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: (factId: string) => apiSend<Fact>('POST', `/facts/${factId}/confirm`, { explicitUserConfirmation: true }),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateFact(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ factId, ...patch }: { factId: string; statement?: string; value?: string }) =>
      apiSend<Fact>('PATCH', `/facts/${factId}`, patch),
    onSuccess: () => void invalidate(),
  });
}

export function useAnswerOpenQuestion(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) =>
      apiSend('POST', `/open-questions/${id}/answer`, { answer }),
    onSuccess: () => void invalidate(),
  });
}

// ---------------------------------------------------------------------------
// Generic project-memory collections (design features, prior designs, ...)
// ---------------------------------------------------------------------------

/** Collections with the same REST shape: GET/POST /projects/:id/<path>, PATCH/DELETE /<path>/:id, POST /<path>/:id/confirm. */
export type CollectionPath =
  | 'design-variants'
  | 'design-features'
  | 'sources'
  | 'source-documents'
  | 'source-requirements'
  | 'research-findings'
  | 'prior-designs'
  | 'search-coverage'
  | 'representations'
  | 'agent-tasks';

export const useCollection = <T>(projectId: string, path: CollectionPath) =>
  useQuery({ queryKey: keys.collection(projectId, path), queryFn: () => apiGet<T[]>(`/projects/${projectId}/${path}`) });

export function useCreateRecord<T>(projectId: string, path: CollectionPath) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiSend<T>('POST', `/projects/${projectId}/${path}`, data),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateRecord<T>(projectId: string, path: CollectionPath) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Record<string, unknown>) => apiSend<T>('PATCH', `/${path}/${id}`, patch),
    onSuccess: () => void invalidate(),
  });
}

export function useDeleteRecord(projectId: string, path: CollectionPath) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: (id: string) => apiSend('DELETE', `/${path}/${id}`),
    onSuccess: () => void invalidate(),
  });
}

export function useConfirmRecord(projectId: string, path: CollectionPath) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: (id: string) => apiSend('POST', `/${path}/${id}/confirm`, { explicitUserConfirmation: true }),
    onSuccess: () => void invalidate(),
  });
}

// ---------------------------------------------------------------------------
// Research (steps 2–3)
// ---------------------------------------------------------------------------

export const useRequirements = (projectId: string) =>
  useQuery({
    queryKey: keys.requirements(projectId, 'all'),
    queryFn: () => apiGet<MatrixRequirement[]>(`/projects/${projectId}/requirements`),
  });

export const useResearchReport = (projectId: string) =>
  useQuery({ queryKey: keys.report(projectId), queryFn: () => apiGet<ResearchReportSection[]>(`/projects/${projectId}/research-report`) });

export function useImportResearch(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: () => apiSend<ResearchImportSummary>('POST', `/projects/${projectId}/research/import`),
    onSuccess: () => void invalidate(),
  });
}

export const useInterviewGroups = () =>
  useQuery({ queryKey: ['interview-groups'], queryFn: () => apiGet<InterviewGroup[]>('/interview-groups'), staleTime: Infinity });

export const useFunctionAnalysisQuestions = () =>
  useQuery({
    queryKey: ['function-analysis-questions'],
    queryFn: () => apiGet<{ number: number; text: string }[]>('/function-analysis/questions'),
    staleTime: Infinity,
  });

export function useSaveFunctionAnswer(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ featureId, questionNumber, answer }: { featureId: string; questionNumber: number; answer: string }) =>
      apiSend('PUT', `/design-features/${featureId}/function-analysis/${questionNumber}`, { answer }),
    onSuccess: () => void invalidate(),
  });
}

export function useConfirmFunctionAnswer(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ featureId, questionNumber }: { featureId: string; questionNumber: number }) =>
      apiSend('POST', `/design-features/${featureId}/function-analysis/${questionNumber}/confirm`, {
        explicitUserConfirmation: true,
      }),
    onSuccess: () => void invalidate(),
  });
}

// ---------------------------------------------------------------------------
// Strategy (step 8)
// ---------------------------------------------------------------------------

export const useStrategy = (projectId: string) =>
  useQuery({ queryKey: keys.strategy(projectId), queryFn: () => apiGet<StrategyEntry[]>(`/projects/${projectId}/strategy`) });

export function useSaveStrategyItem(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ key, ...patch }: { key: StrategyItemKey } & Record<string, unknown>) =>
      apiSend('PUT', `/projects/${projectId}/strategy/${key}`, patch),
    onSuccess: () => void invalidate(),
  });
}

export function useConfirmStrategyItem(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: (key: StrategyItemKey) =>
      apiSend('POST', `/projects/${projectId}/strategy/${key}/confirm`, { explicitUserConfirmation: true }),
    onSuccess: () => void invalidate(),
  });
}

// ---------------------------------------------------------------------------
// Description drafting (step 10)
// ---------------------------------------------------------------------------

export const useApplicationSections = (projectId: string) =>
  useQuery({
    queryKey: keys.sections(projectId),
    queryFn: () => apiGet<ApplicationSectionRecord[]>(`/projects/${projectId}/application-sections`),
  });

export function useSaveWorkingDraft(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ sectionId, content }: { sectionId: string; content: string }) =>
      apiSend('PUT', `/application-sections/${sectionId}/working-draft`, { content }),
    onSuccess: () => void invalidate(),
  });
}

export function useAddDraftVersion(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ sectionId, content }: { sectionId: string; content: string }) =>
      apiSend('POST', `/application-sections/${sectionId}/versions`, { content }),
    onSuccess: () => void invalidate(),
  });
}

export function useConfirmSection(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: (sectionId: string) =>
      apiSend('POST', `/application-sections/${sectionId}/confirm`, { explicitUserConfirmation: true }),
    onSuccess: () => void invalidate(),
  });
}

// ---------------------------------------------------------------------------
// Independent review (step 11)
// ---------------------------------------------------------------------------

export const useReviewChecks = () =>
  useQuery({ queryKey: ['review-checks'], queryFn: () => apiGet<ReviewCheck[]>('/review-checks'), staleTime: Infinity });

export function useCreateFinding(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: (dto: Record<string, unknown>) => apiSend<ReviewIssue>('POST', `/projects/${projectId}/review-issues`, dto),
    onSuccess: () => void invalidate(),
  });
}

export function useChangeFindingStatus(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ issueId, status, note }: { issueId: string; status: string; note?: string }) =>
      apiSend<ReviewIssue>('POST', `/review-issues/${issueId}/status`, { status, note }),
    onSuccess: () => void invalidate(),
  });
}

// ---------------------------------------------------------------------------
// Filing (steps 12–14)
// ---------------------------------------------------------------------------

export const useD1 = (projectId: string) =>
  useQuery({ queryKey: keys.d1(projectId), queryFn: () => apiGet<D1Field[]>(`/projects/${projectId}/d1`) });

export function useSaveD1Field(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ fieldKey, ...patch }: { fieldKey: string; value?: string; notes?: string }) =>
      apiSend('PUT', `/projects/${projectId}/d1/${fieldKey}`, patch),
    onSuccess: () => void invalidate(),
  });
}

export function useConfirmD1Field(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: (fieldKey: string) =>
      apiSend('POST', `/projects/${projectId}/d1/${fieldKey}/confirm`, { explicitUserConfirmation: true }),
    onSuccess: () => void invalidate(),
  });
}

export const usePackage = (projectId: string) =>
  useQuery({ queryKey: keys.package(projectId), queryFn: () => apiGet<PackageStatus>(`/projects/${projectId}/package`) });

export function useGeneratePackage(projectId: string) {
  const qc = useQueryClient();
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: () => apiSend<PackageStatus>('POST', `/projects/${projectId}/package/generate`),
    onSuccess: (status) => {
      qc.setQueryData(keys.package(projectId), status);
      void invalidate();
    },
  });
}

export const useSignoffs = (projectId: string) =>
  useQuery({ queryKey: keys.signoffs(projectId), queryFn: () => apiGet<FinalSignoff[]>(`/projects/${projectId}/signoffs`) });

export function useCreateSignoff(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: (dto: { reviewerName: string; role: SignoffRole; note: string }) =>
      apiSend<FinalSignoff>('POST', `/projects/${projectId}/signoffs`, dto),
    onSuccess: () => void invalidate(),
  });
}

export const useOpenQuestions = (projectId: string, stepKey: string) =>
  useQuery({
    queryKey: keys.openQuestions(projectId, stepKey),
    queryFn: () => apiGet<OpenQuestion[]>(`/projects/${projectId}/open-questions?stepKey=${encodeURIComponent(stepKey)}`),
  });

export const useDecisions = (projectId: string) =>
  useQuery({ queryKey: keys.decisions(projectId), queryFn: () => apiGet<Decision[]>(`/projects/${projectId}/decisions`) });

export function useDeleteFile(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: (fileId: string) => apiSend('DELETE', `/files/${fileId}`),
    onSuccess: () => void invalidate(),
  });
}

export function useReplaceFile(projectId: string) {
  const invalidate = useInvalidateProject(projectId);
  return useMutation({
    mutationFn: ({ fileId, file }: { fileId: string; file: File }) => {
      const form = new FormData();
      form.append('file', file);
      return apiUpload<UploadedFile>(`/files/${fileId}/replace`, form);
    },
    onSuccess: () => void invalidate(),
  });
}
