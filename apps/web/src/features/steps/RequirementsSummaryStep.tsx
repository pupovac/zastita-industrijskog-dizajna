import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRequirements, useResearchReport } from '@/api/hooks';
import type { MatrixRequirement, ResearchReportSection } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { Markdown } from '@/components/Markdown';
import { KindBadge } from '@/components/StatusBadge';
import { SourceReference } from '@/components/SourceReference';
import { selectClass } from '@/components/fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ImportResearchCard } from './ImportResearchCard';

const UNVERIFIED = 'NEPROVERENO – potrebno potvrditi sa ZIS-om ili registrovanim zastupnikom.';

/** Step 3: "Rezultati inicijalnog istraživanja" (§17) and the "Matrica zahteva ZIS-a". */
export function RequirementsSummaryStep({ projectId }: { projectId: string }) {
  const report = useResearchReport(projectId);
  const requirements = useRequirements(projectId);
  const navigate = useNavigate();

  if (report.error || requirements.error) return <ErrorText error={report.error ?? requirements.error} />;
  if (!report.data || !requirements.data) return <p className="text-sm text-muted-foreground">Učitavanje…</p>;
  if (report.data.length === 0) return <ImportResearchCard projectId={projectId} />;

  const summary = report.data.filter((s) => s.code.startsWith('A.'));
  const detailed = report.data.filter((s) => !s.code.startsWith('A.') && s.code !== 'INTRO');
  const intro = report.data.find((s) => s.code === 'INTRO');

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rezultati inicijalnog istraživanja</CardTitle>
          {intro && <CardDescription>{intro.sourceReference}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {summary.map((section) => (
            <ReportSection key={section.id} section={section} />
          ))}
          <div className="border-t pt-4">
            <Button onClick={() => navigate(`/projects/${projectId}/steps/PRODUCT_INTERVIEW`)}>Započni pripremu prijave</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detaljne sekcije B–N</CardTitle>
          <CardDescription>Obavezni elementi, prikazi, opis, D-1, prilozi, takse, rokovi, pretraga, pitanja i dokumenti.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {detailed.map((section) => (
            <details key={section.id} className="rounded-md border px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium">
                {section.code}. {section.heading}
              </summary>
              <div className="pt-3">
                <Markdown source={section.body} />
                <p className="pt-2 text-xs text-muted-foreground">Izvor: {section.sourceReference}</p>
              </div>
            </details>
          ))}
        </CardContent>
      </Card>

      <RequirementsMatrix requirements={requirements.data} />
    </div>
  );
}

function ReportSection({ section }: { section: ResearchReportSection }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{section.heading}</h2>
      <Markdown source={section.body} />
    </section>
  );
}

function RequirementsMatrix({ requirements }: { requirements: MatrixRequirement[] }) {
  const [area, setArea] = useState('');
  const [phase, setPhase] = useState('');
  const [status, setStatus] = useState('');
  const [onlyDiscrepancies, setOnlyDiscrepancies] = useState(false);

  const areas = useMemo(
    () => [...new Map(requirements.map((r) => [r.areaCode, r.area])).entries()],
    [requirements],
  );
  const phases = useMemo(
    () =>
      [...new Map(requirements.flatMap((r) => r.phases).map((p) => [p.number, p.name])).entries()].sort((a, b) => a[0] - b[0]),
    [requirements],
  );
  const filtered = requirements.filter(
    (r) =>
      (!area || r.areaCode === area) &&
      (!phase || r.phases.some((p) => String(p.number) === phase)) &&
      (!status || r.status === status) &&
      (!onlyDiscrepancies || r.isDiscrepancy),
  );
  const discrepancies = requirements.filter((r) => r.isDiscrepancy).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matrica zahteva ZIS-a</CardTitle>
        <CardDescription>
          {requirements.length} zahteva · {requirements.filter((r) => r.status === 'UNVERIFIED').length} neproverenih ·{' '}
          {discrepancies} neusklađenosti između izvora
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid gap-2 md:grid-cols-4">
          <select aria-label="Oblast" className={selectClass} value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Sve oblasti</option>
            {areas.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
          <select aria-label="Faza" className={selectClass} value={phase} onChange={(e) => setPhase(e.target.value)}>
            <option value="">Sve faze</option>
            {phases.map(([n, name]) => (
              <option key={n} value={String(n)}>
                {name}
              </option>
            ))}
          </select>
          <select aria-label="Status" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Svi statusi</option>
            <option value="CONFIRMED">POTVRĐENO</option>
            <option value="UNVERIFIED">NEPROVERENO</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyDiscrepancies} onChange={(e) => setOnlyDiscrepancies(e.target.checked)} />
            Samo neusklađenosti
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Prikazano: {filtered.length}</p>
        <div className="flex flex-col gap-2">
          {filtered.map((r) => (
            <RequirementRow key={r.id} requirement={r} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RequirementRow({ requirement: r }: { requirement: MatrixRequirement }) {
  return (
    <div
      className={
        r.isDiscrepancy
          ? 'flex flex-col gap-1.5 rounded-md border border-amber-300 bg-amber-50/60 px-3 py-2'
          : 'flex flex-col gap-1.5 rounded-md border px-3 py-2'
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{r.code}</Badge>
        <KindBadge kind={r.kind} />
        <Badge variant={r.status === 'CONFIRMED' ? 'success' : 'warning'}>
          {r.status === 'CONFIRMED' ? 'POTVRĐENO' : 'NEPROVERENO'}
        </Badge>
        {r.isDiscrepancy && <Badge variant="warning">NEUSKLAĐENOST IZVORA</Badge>}
        <span className="text-xs text-muted-foreground">{r.area}</span>
      </div>
      <p className="text-sm">{r.requirementText}</p>
      {r.status === 'UNVERIFIED' && <p className="text-xs font-medium text-amber-800">{UNVERIFIED}</p>}
      {r.precedence && <p className="text-xs text-muted-foreground">Prednost: {r.precedence}</p>}
      {r.impactOnApplication && <p className="text-xs text-muted-foreground">Uticaj na prijavu: {r.impactOnApplication}</p>}
      <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
        {r.phases.map((p) => (
          <span key={p.number} className="rounded bg-muted px-1.5 py-0.5">
            {p.name}
          </span>
        ))}
        {r.openItems.length > 0 && <span className="rounded bg-muted px-1.5 py-0.5">Otvoreno: {r.openItems.join(', ')}</span>}
      </div>
      <SourceReference
        sourceType={r.sourceType}
        reference={r.sourceReference}
        url={r.citations[0]?.sourceDocument.url ?? r.citations[0]?.sourceDocument.source.url}
        detail={r.citations
          .map((c) => `${c.sourceDocument.source.code ?? ''} ${c.sourceDocument.title}${c.location ? ` — ${c.location}` : ''}`.trim())
          .join(' · ') + ` · pristupljeno ${r.accessDate}`}
      />
    </div>
  );
}
