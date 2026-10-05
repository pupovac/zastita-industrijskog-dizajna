import { fileContentUrl } from '@/api/client';
import type { UploadedFile } from '@/api/types';
import { FILE_ROLE_LABEL } from '@/lib/labels';

/** Read-only preview of the stored original. */
export function FilePreview({ file }: { file: UploadedFile }) {
  const url = fileContentUrl(file.id);
  return (
    <figure className="flex min-w-0 flex-col gap-2">
      <div className="flex h-72 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
        {file.mimeType.startsWith('image/') ? (
          <img src={url} alt={file.originalName} className="max-h-full max-w-full object-contain" />
        ) : file.mimeType === 'application/pdf' ? (
          <iframe src={url} title={file.originalName} className="h-full w-full" />
        ) : (
          <div className="max-h-full overflow-auto p-3 text-xs whitespace-pre-wrap text-muted-foreground">
            {file.extractedText?.slice(0, 3000) || 'Pregled nije dostupan.'}
          </div>
        )}
      </div>
      <figcaption className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{file.originalName}</span> · {FILE_ROLE_LABEL[file.role]}
      </figcaption>
    </figure>
  );
}
