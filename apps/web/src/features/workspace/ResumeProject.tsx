import { Navigate, useParams } from 'react-router-dom';
import { useProject } from '@/api/hooks';

/** Opens the step the user last worked on. */
export function ResumeProject() {
  const { projectId = '' } = useParams();
  const project = useProject(projectId);
  if (!project.data) return null;
  return <Navigate to={`steps/${project.data.currentStepKey}`} replace />;
}
