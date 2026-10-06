import { Link } from 'react-router-dom';
import { useKnowledge } from '@/api/hooks';
import type { MissingInfoType } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { ErrorText } from '@/components/ErrorText';
import { DEFERRED_TO_FILING_LABEL } from '@/lib/labels';

const TYPE_LABEL: Record<MissingInfoType, string> = {
  PROJECT_FIELD: 'Podatak projekta',
  REQUIRED_QUESTION: 'Obavezno pitanje',
  UNCONFIRMED_INFORMATION: 'Čeka potvrdu',
  OPEN_QUESTION: 'Otvoreno pitanje',
  CONFLICT: 'Konflikt',
  DOCUMENT_NEEDS_MANUAL_REVIEW: 'Dokument',
  DEFERRED_TO_FILING: DEFERRED_TO_FILING_LABEL,
};

/** Right-hand side: the permanent project context and what is still missing. */
export function ContextPanel({ projectId }: { projectId: string }) {
  const knowledge = useKnowledge(projectId);
  const k = knowledge.data;

  return (
    <div className="flex flex-col gap-6 p-4 text-sm">
      <ErrorText error={knowledge.error} />
      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Kontekst projekta</h2>
        {k && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">Proizvod</dt>
            <dd>{k.project.productName || '—'}</dd>
            <dt className="text-muted-foreground">Podnosilac</dt>
            <dd>{k.project.applicantName || '—'}</dd>
            <dt className="text-muted-foreground">Autor</dt>
            <dd>{k.project.designerName || '—'}</dd>
            <dt className="text-muted-foreground">Dokumenti</dt>
            <dd>{k.sections.documents.length}</dd>
            <dt className="text-muted-foreground">Potvrđeno</dt>
            <dd>
              {
                [...k.sections.productFacts, ...k.sections.visualFeatures.facts].filter((f) => f.confirmedUserFact)
                  .length
              }{' '}
              činjenica
            </dd>
          </dl>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Nedostajuće informacije {k ? `(${k.missingInfo.length})` : ''}
        </h2>
        {k?.missingInfo.length === 0 && <p className="text-muted-foreground">Nema otvorenih stavki.</p>}
        <ul className="flex flex-col gap-2">
          {k?.missingInfo.map((item) => (
            <li key={`${item.type}-${item.refId}`} className="rounded-md border px-3 py-2">
              <div className="mb-1 flex flex-wrap items-center gap-1">
                <Badge variant={item.blocking ? 'danger' : 'muted'}>{TYPE_LABEL[item.type]}</Badge>
                {item.blocking && <Badge variant="danger">Blokira</Badge>}
              </div>
              {item.stepKey ? (
                <Link to={`/projects/${projectId}/steps/${item.stepKey}`} className="hover:underline">
                  {item.label}
                </Link>
              ) : (
                <Link to={`/projects/${projectId}/knowledge`} className="hover:underline">
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
