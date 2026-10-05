import { ExtractionStatus } from '@prisma/client';
import { imageSize } from 'image-size';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { SupportedFileKind } from './file-types';

export interface ExtractionResult {
  status: ExtractionStatus;
  text: string | null;
  metadata: Record<string, unknown>;
  summary: string;
  error: string | null;
}

const MAX_TEXT_LENGTH = 500_000;

/**
 * Extracts text and metadata. This never interprets content and never produces
 * facts; it only makes the document searchable and describable. On failure the
 * original stays stored and the user is asked to check the document manually.
 */
export async function extractContent(kind: SupportedFileKind, content: Buffer): Promise<ExtractionResult> {
  try {
    switch (kind) {
      case 'PDF': {
        const result = await pdfParse(content);
        const text = normalize(result.text);
        return ok(text, { pages: result.numpages, info: pickStrings(result.info) }, `PDF, ${result.numpages} str., ${text.length} znakova teksta.`);
      }
      case 'DOCX': {
        const result = await mammoth.extractRawText({ buffer: content });
        const text = normalize(result.value);
        return ok(text, {}, `DOCX dokument, ${text.length} znakova teksta.`);
      }
      case 'PNG':
      case 'JPEG': {
        const size = imageSize(content);
        return ok(null, { width: size.width, height: size.height, format: size.type }, `Slika ${size.width}×${size.height} px (${kind}).`);
      }
      case 'SVG': {
        const svg = content.toString('utf8');
        const size = safeImageSize(content);
        const text = normalize(
          Array.from(svg.matchAll(/<(?:text|title|desc)[^>]*>([\s\S]*?)<\/(?:text|title|desc)>/gi))
            .map((m) => m[1].replace(/<[^>]+>/g, ''))
            .join('\n'),
        );
        const dims = size ? `${size.width}×${size.height}` : 'nepoznatih dimenzija';
        return ok(text || null, { ...(size ?? {}), format: 'svg' }, `Vektorski crtež (SVG), ${dims}.`);
      }
    }
  } catch (e) {
    return {
      status: 'FAILED',
      text: null,
      metadata: {},
      summary: 'Automatska obrada nije uspela. Original je sačuvan; potrebna je ručna provera dokumenta.',
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function ok(text: string | null, metadata: Record<string, unknown>, summary: string): ExtractionResult {
  return { status: 'EXTRACTED', text, metadata, summary, error: null };
}

function normalize(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_TEXT_LENGTH);
}

function safeImageSize(content: Buffer): { width?: number; height?: number } | null {
  try {
    const { width, height } = imageSize(content);
    return { width, height };
  } catch {
    return null;
  }
}

function pickStrings(info: unknown): Record<string, string> {
  if (!info || typeof info !== 'object') return {};
  return Object.fromEntries(
    Object.entries(info as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === 'string'),
  );
}
