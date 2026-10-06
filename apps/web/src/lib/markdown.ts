/**
 * A deliberately small Markdown reader for the research documents written by the
 * agents (headings, paragraphs, lists, tables, quotes). Anything else is shown as text.
 * Rendering never interprets HTML, so the content cannot inject markup.
 */
export type MdBlock =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'quote'; text: string }
  | { type: 'rule' };

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'));

export function parseMarkdown(source: string): MdBlock[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: MdBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ type: 'rule' });
      i++;
      continue;
    }
    if (line.trim().startsWith('|') && /^\s*\|?[\s:-]+\|/.test(lines[i + 1] ?? '')) {
      const header = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      blocks.push({ type: 'table', header, rows });
      continue;
    }
    const listItem = /^\s*([-*]|\d+\.)\s+(.*)$/;
    if (listItem.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && (listItem.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        const match = listItem.exec(lines[i]);
        if (match) items.push(match[2].trim());
        else items[items.length - 1] += ` ${lines[i].trim()}`;
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) quote.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', text: quote.join(' ') });
      continue;
    }
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|\s*[-*]\s|\s*\d+\.\s|\||>)/.test(lines[i])) {
      paragraph.push(lines[i++].trim());
    }
    if (paragraph.length === 0) paragraph.push(lines[i++].trim());
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}

export type InlinePart = { kind: 'text' | 'strong' | 'code' | 'ref'; text: string };

/** **bold**, `code` and matrix/source references like [MZ-001] or [NS-02, MZ-010]. */
export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[((?:MZ|NS|Z|N|P)-[\w/.–-]+(?:,\s*(?:MZ|NS|Z|N|P)-[\w/.–-]+)*)\]/g;
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index! > last) parts.push({ kind: 'text', text: text.slice(last, m.index) });
    if (m[1]) parts.push({ kind: 'strong', text: m[1] });
    else if (m[2]) parts.push({ kind: 'code', text: m[2] });
    else parts.push({ kind: 'ref', text: m[3] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}
