/**
 * A small, format-neutral document model. Every package document is built once
 * as blocks and rendered to Markdown, DOCX and PDF from the same structure, so the
 * three formats cannot drift apart.
 */
export type Block =
  | { type: 'heading'; text: string; level: 1 | 2 | 3 }
  | { type: 'paragraph'; text: string; tone?: 'normal' | 'note' | 'warning' }
  | { type: 'list'; items: string[] }
  | { type: 'table'; columns: string[]; rows: string[][] };

export interface DocModel {
  title: string;
  blocks: Block[];
}

export const NO_GUARANTEE_NOTICE =
  'Sistem pomaže u pripremi prijave i dokumentacije i nije zamena za registrovanog zastupnika za intelektualnu ' +
  'svojinu ili advokata. Sistem ne garantuje da će prijava biti prihvaćena i prijavu ne podnosi automatski.';

const escapeCell = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');

export function renderMarkdown(doc: DocModel): string {
  const out: string[] = [`# ${doc.title}`, ''];
  for (const block of doc.blocks) {
    switch (block.type) {
      case 'heading':
        out.push(`${'#'.repeat(block.level + 1)} ${block.text}`, '');
        break;
      case 'paragraph':
        out.push(block.tone && block.tone !== 'normal' ? `> ${block.text.replace(/\n/g, '\n> ')}` : block.text, '');
        break;
      case 'list':
        out.push(...block.items.map((i) => `- ${i.replace(/\n/g, '\n  ')}`), '');
        break;
      case 'table':
        out.push(`| ${block.columns.map(escapeCell).join(' | ')} |`);
        out.push(`|${block.columns.map(() => '---').join('|')}|`);
        out.push(...block.rows.map((r) => `| ${r.map(escapeCell).join(' | ')} |`), '');
        break;
    }
  }
  return `${out.join('\n').trimEnd()}\n`;
}
