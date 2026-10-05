import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiSend, apiUpload } from './client';
import type {
  Fact,
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
