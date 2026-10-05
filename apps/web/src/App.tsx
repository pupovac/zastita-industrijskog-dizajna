import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { KnowledgePage } from './features/knowledge/KnowledgePage';
import { ProjectsPage } from './features/projects/ProjectsPage';
import { ResumeProject } from './features/workspace/ResumeProject';
import { StepPage } from './features/workspace/StepPage';
import { WorkspaceLayout } from './features/workspace/WorkspaceLayout';

const router = createBrowserRouter([
  { path: '/', element: <ProjectsPage /> },
  {
    path: '/projects/:projectId',
    element: <WorkspaceLayout />,
    children: [
      { index: true, element: <ResumeProject /> },
      { path: 'steps/:stepKey', element: <StepPage /> },
      { path: 'knowledge', element: <KnowledgePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
