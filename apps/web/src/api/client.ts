export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

/**
 * The web UI always acts as the user. Agents call the API with `X-Actor-Type: AGENT`
 * and the backend enforces what only a user may do (confirm, approve, resolve).
 */
const ACTOR_HEADERS = { 'X-Actor-Type': 'USER' };

async function parse<T>(res: Response): Promise<T> {
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.code, body?.message ?? `Greška ${res.status}`);
  }
  return body as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return parse<T>(await fetch(`/api${path}`, { headers: ACTOR_HEADERS }));
}

export async function apiSend<T>(method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  return parse<T>(
    await fetch(`/api${path}`, {
      method,
      headers: { ...ACTOR_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    }),
  );
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return parse<T>(await fetch(`/api${path}`, { method: 'POST', headers: ACTOR_HEADERS, body: form }));
}

export function fileContentUrl(fileId: string): string {
  return `/api/files/${fileId}/content`;
}

export function generatedDocumentUrl(documentId: string): string {
  return `/api/generated-documents/${documentId}/content`;
}

export function localCopyUrl(sourceId: string, index: number): string {
  return `/api/sources/${sourceId}/local-copies/${index}`;
}
