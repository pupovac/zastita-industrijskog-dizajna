/**
 * Version chains of uploaded files. Replacing a file keeps the original stored and
 * marks it with `replacedById`, so a document is a chain `v1 -> v2 -> ... -> current`.
 * Only the head of each chain (replacedById === null) is a current document; the
 * rest are its previous versions.
 */

export interface VersionedFile {
  id: string;
  replacedById: string | null;
}

export interface FilePreviousVersion {
  id: string;
  originalName: string;
  createdAt: Date;
}

export type CurrentFile<T extends VersionedFile> = T & { previousVersions: FilePreviousVersion[] };

export function isCurrentFile<T extends VersionedFile>(file: T): boolean {
  return file.replacedById === null;
}

/**
 * Groups files into current documents, each carrying its previous versions (oldest first).
 * A replaced file whose successor is missing (e.g. the newer version was deleted) is
 * not a current document and is dropped: it was superseded by the user's explicit action.
 */
export function groupFileVersions<T extends VersionedFile & { originalName: string; createdAt: Date }>(
  files: T[],
): CurrentFile<T>[] {
  const predecessorOf = new Map<string, T>();
  for (const file of files) {
    if (file.replacedById !== null) predecessorOf.set(file.replacedById, file);
  }

  return files.filter(isCurrentFile).map((current) => {
    const previousVersions: FilePreviousVersion[] = [];
    const seen = new Set<string>([current.id]);
    let cursor = predecessorOf.get(current.id);
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      previousVersions.unshift({ id: cursor.id, originalName: cursor.originalName, createdAt: cursor.createdAt });
      cursor = predecessorOf.get(cursor.id);
    }
    return { ...current, previousVersions };
  });
}
