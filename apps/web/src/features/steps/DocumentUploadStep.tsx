import { useState } from 'react';
import { fileContentUrl } from '@/api/client';
import {
  useCreateConflict,
  useFiles,
  useResolveConflict,
  useReviewIssues,
  useUpdateFileRole,
  useUploadFile,
} from '@/api/hooks';
import type { FileRole, ReviewIssue, UploadedFile } from '@/api/types';
import { ErrorText } from '@/components/ErrorText';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EXTRACTION_STATUS_LABEL, FILE_ROLE_LABEL, formatBytes, formatDateTime } from '@/lib/labels';
import { FilePreview } from './FilePreview';

const ROLES = Object.keys(FILE_ROLE_LABEL) as FileRole[];
const selectClass = 'h-9 rounded-md border border-input bg-card px-2 text-sm shadow-xs';

export function DocumentUploadStep({ projectId }: { projectId: string }) {
  const files = useFiles(projectId);
  const [compare, setCompare] = useState<string[]>([]);

  const toggleCompare = (id: string) =>
    setCompare((current) => (current.includes(id) ? current.filter((c) => c !== id) : [...current, id].slice(-2)));

  const selected = (files.data ?? []).filter((f) => compare.includes(f.id));

  return (
    <div className="flex flex-col gap-6">
      <UploadCard projectId={projectId} />

      <Card>
        <CardHeader>
          <CardTitle>Dostavljeni dokumenti</CardTitle>
          <CardDescription>Original se čuva nepromenjen. Izaberite dva dokumenta za uporedni prikaz.</CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorText error={files.error} />
          {files.data?.length === 0 && <p className="text-sm text-muted-foreground">Još nema dokumenata.</p>}
          <ul className="divide-y">
            {files.data?.map((file) => (
              <FileRow
                key={file.id}
                projectId={projectId}
                file={file}
                selected={compare.includes(file.id)}
                onToggle={() => toggleCompare(file.id)}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      {selected.length === 2 && (
        <CompareCard projectId={projectId} a={selected[0]} b={selected[1]} onClose={() => setCompare([])} />
      )}

      <ConflictsCard projectId={projectId} />
    </div>
  );
}

function UploadCard({ projectId }: { projectId: string }) {
  const upload = useUploadFile(projectId);
  const [role, setRole] = useState<FileRole>('PHOTO');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Otpremanje</CardTitle>
        <CardDescription>PDF, DOCX, PNG, JPG/JPEG, SVG (uključujući CAD prikaze izvezene u te formate).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="role">Vrsta</Label>
            <select id="role" className={selectClass} value={role} onChange={(e) => setRole(e.target.value as FileRole)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {FILE_ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
          <Input
            type="file"
            className="max-w-sm"
            accept=".pdf,.docx,.png,.jpg,.jpeg,.svg"
            multiple
            disabled={upload.isPending}
            onChange={async (e) => {
              const list = Array.from(e.target.files ?? []);
              e.target.value = '';
              for (const file of list) {
                await upload.mutateAsync({ file, role }).catch(() => undefined);
              }
            }}
          />
          {upload.isPending && <span className="text-sm text-muted-foreground">Otpremanje i obrada…</span>}
        </div>
        <ErrorText error={upload.error} />
      </CardContent>
    </Card>
  );
}

function FileRow({
  projectId,
  file,
  selected,
  onToggle,
}: {
  projectId: string;
  file: UploadedFile;
  selected: boolean;
  onToggle: () => void;
}) {
  const updateRole = useUpdateFileRole(projectId);
  const needsManual = file.extractionStatus === 'FAILED' || file.extractionStatus === 'NOT_SUPPORTED';

  return (
    <li className="flex flex-wrap items-start gap-3 py-3">
      <input type="checkbox" className="mt-1" checked={selected} onChange={onToggle} aria-label="Uporedi" />
      <div className="min-w-0 flex-1">
        <a href={fileContentUrl(file.id)} target="_blank" rel="noreferrer" className="font-medium hover:underline">
          {file.originalName}
        </a>
        <div className="text-xs text-muted-foreground">
          {formatBytes(file.sizeBytes)} · {formatDateTime(file.createdAt)} · SHA-256 {file.sha256.slice(0, 12)}…
        </div>
        <div className="mt-1 text-sm">{file.summary}</div>
        {needsManual && (
          <p className="mt-1 text-sm text-amber-800">
            Dokument nije bilo moguće automatski obraditi. Proverite ga ručno ili dostavite čitljiviju verziju (npr. PDF sa
            tekstualnim slojem).
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={needsManual ? 'warning' : 'muted'}>{EXTRACTION_STATUS_LABEL[file.extractionStatus]}</Badge>
        <select
          aria-label="Vrsta dokumenta"
          className={selectClass}
          value={file.role}
          onChange={(e) => updateRole.mutate({ fileId: file.id, role: e.target.value as FileRole })}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {FILE_ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}

function CompareCard({
  projectId,
  a,
  b,
  onClose,
}: {
  projectId: string;
  a: UploadedFile;
  b: UploadedFile;
  onClose: () => void;
}) {
  const createConflict = useCreateConflict(projectId);
  const [attribute, setAttribute] = useState('');
  const [description, setDescription] = useState('');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Uporedni prikaz</CardTitle>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Zatvori
          </Button>
        </div>
        <CardDescription>
          Ako se prikazi ne slažu, označite neslaganje. Sistem ga ne rešava sam — vi birate koja verzija je tačna.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FilePreview file={a} />
          <FilePreview file={b} />
        </div>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            createConflict.mutate(
              { fileAId: a.id, fileBId: b.id, attribute, description },
              {
                onSuccess: () => {
                  setAttribute('');
                  setDescription('');
                },
              },
            );
          }}
        >
          <Label htmlFor="attribute">Karakteristika koja se razlikuje</Label>
          <Input
            id="attribute"
            placeholder="npr. profil ivice, boja završnog sloja"
            value={attribute}
            onChange={(e) => setAttribute(e.target.value)}
          />
          <Textarea placeholder="Opis neslaganja (opciono)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <div>
            <Button type="submit" variant="outline" disabled={!attribute.trim() || createConflict.isPending}>
              Označi neslaganje
            </Button>
          </div>
          <ErrorText error={createConflict.error} />
        </form>
      </CardContent>
    </Card>
  );
}

function ConflictsCard({ projectId }: { projectId: string }) {
  const issues = useReviewIssues(projectId);
  const conflicts = (issues.data ?? []).filter((i) => i.type === 'CONFLICT');
  if (conflicts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Neslaganja između dokumenata</CardTitle>
        <CardDescription>Otvoreno neslaganje blokira slanje koraka na pregled.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {conflicts.map((c) => (
          <ConflictItem key={c.id} projectId={projectId} issue={c} />
        ))}
      </CardContent>
    </Card>
  );
}

function ConflictItem({ projectId, issue }: { projectId: string; issue: ReviewIssue }) {
  const resolve = useResolveConflict(projectId);
  const [note, setNote] = useState('');
  const options = [issue.fileA, issue.fileB].filter((f): f is UploadedFile => Boolean(f));

  return (
    <div className="flex flex-col gap-2 rounded-md border px-3 py-2">
      <div className="flex items-center gap-2">
        <Badge variant={issue.status === 'OPEN' ? 'danger' : 'success'}>
          {issue.status === 'OPEN' ? 'OTVORENO' : 'REŠENO'}
        </Badge>
        <span className="font-medium">{issue.title}</span>
      </div>
      {issue.description && <p className="text-sm text-muted-foreground">{issue.description}</p>}
      {issue.status === 'OPEN' ? (
        <>
          <p className="text-sm">Koja verzija je tačna?</p>
          <Input placeholder="Napomena (opciono)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {options.map((file) => (
              <Button
                key={file.id}
                size="sm"
                variant="outline"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate({ issueId: issue.id, chosenFileId: file.id, note })}
              >
                Tačno je: {file.originalName}
              </Button>
            ))}
          </div>
          <ErrorText error={resolve.error} />
        </>
      ) : (
        <p className="text-sm">
          Odluka korisnika: tačna je verzija „{issue.chosenFile?.originalName ?? '—'}"
          {issue.resolutionNote ? ` — ${issue.resolutionNote}` : ''}
          {issue.resolvedAt ? ` (${formatDateTime(issue.resolvedAt)})` : ''}
        </p>
      )}
    </div>
  );
}
