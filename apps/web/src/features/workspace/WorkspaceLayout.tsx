import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { useProject } from '@/api/hooks';
import { ErrorText } from '@/components/ErrorText';
import { cn } from '@/lib/utils';
import { ContextPanel } from './ContextPanel';
import { StepSidebar } from './StepSidebar';

export function WorkspaceLayout() {
  const { projectId = '' } = useParams();
  const project = useProject(projectId);
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="flex items-center gap-6 px-6 py-3">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Projekti
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">{project.data?.name ?? '…'}</div>
            <div className="text-xs text-muted-foreground">Prijava za priznanje prava na industrijski dizajn</div>
          </div>
          {project.data && (
            <div className="flex w-56 flex-col gap-1" aria-label="Napredak">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Odobreni koraci</span>
                <span className="tabular-nums">{project.data.progressPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${project.data.progressPercent}%` }} />
              </div>
            </div>
          )}
        </div>
        <nav className="flex gap-1 px-6">
          {[
            { to: `/projects/${projectId}/steps/${project.data?.currentStepKey ?? 'PROJECT_SETUP'}`, label: 'Koraci', match: 'steps' },
            { to: `/projects/${projectId}/knowledge`, label: 'Znanje o projektu', match: 'knowledge' },
          ].map((tab) => (
            <NavLink
              key={tab.match}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'border-b-2 px-3 py-2 text-sm',
                  isActive || location.pathname.includes(`/${tab.match}`)
                    ? 'border-primary font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <ErrorText error={project.error} />

      <div className="grid flex-1 grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="border-r bg-card">
          <StepSidebar projectId={projectId} />
        </aside>
        <main className="min-w-0 px-8 py-6">
          <Outlet />
        </main>
        <aside className="border-l bg-card">
          <ContextPanel projectId={projectId} />
        </aside>
      </div>
    </div>
  );
}
