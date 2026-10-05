import { extname } from 'node:path';

export type SupportedFileKind = 'PDF' | 'DOCX' | 'PNG' | 'JPEG' | 'SVG';

const BY_EXTENSION: Record<string, SupportedFileKind> = {
  '.pdf': 'PDF',
  '.docx': 'DOCX',
  '.png': 'PNG',
  '.jpg': 'JPEG',
  '.jpeg': 'JPEG',
  '.svg': 'SVG',
};

export const CANONICAL_MIME: Record<SupportedFileKind, string> = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  PNG: 'image/png',
  JPEG: 'image/jpeg',
  SVG: 'image/svg+xml',
};

export const ACCEPTED_EXTENSIONS = Object.keys(BY_EXTENSION);

/**
 * Determines the file kind from its name and verifies the content signature, so a
 * renamed file is not mistaken for a supported format. Returns null if unsupported.
 */
export function detectFileKind(originalName: string, content: Buffer): SupportedFileKind | null {
  const kind = BY_EXTENSION[extname(originalName).toLowerCase()];
  if (!kind) return null;
  const head = content.subarray(0, 512);
  switch (kind) {
    case 'PDF':
      return head.subarray(0, 5).toString('latin1') === '%PDF-' ? kind : null;
    case 'DOCX':
      // DOCX is a ZIP container.
      return head[0] === 0x50 && head[1] === 0x4b ? kind : null;
    case 'PNG':
      return head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ? kind : null;
    case 'JPEG':
      return head[0] === 0xff && head[1] === 0xd8 ? kind : null;
    case 'SVG':
      return /<svg[\s>]/i.test(content.subarray(0, 4096).toString('utf8')) ? kind : null;
  }
}
