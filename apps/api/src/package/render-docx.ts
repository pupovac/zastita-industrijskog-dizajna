import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { Block, DocModel } from './doc-model';

const HEADING = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3 } as const;
const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };

function paragraph(text: string, tone: 'normal' | 'note' | 'warning' = 'normal', bold = false): Paragraph {
  const lines = text.split('\n');
  return new Paragraph({
    spacing: { after: 120 },
    children: lines.map(
      (line, i) =>
        new TextRun({
          text: line,
          break: i > 0 ? 1 : 0,
          bold: bold || tone === 'warning',
          italics: tone === 'note',
          color: tone === 'warning' ? '9C2B2B' : tone === 'note' ? '595959' : undefined,
          size: 21,
        }),
    ),
  });
}

function table(columns: string[], rows: string[][]): Table {
  const cell = (text: string, header: boolean) =>
    new TableCell({
      borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder },
      shading: header ? { fill: 'F2F2F2' } : undefined,
      children: [paragraph(text, 'normal', header)],
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: columns.map((c) => cell(c, true)) }),
      ...rows.map((r) => new TableRow({ children: columns.map((_, i) => cell(r[i] ?? '', false)) })),
    ],
  });
}

function render(block: Block): (Paragraph | Table)[] {
  switch (block.type) {
    case 'heading':
      return [new Paragraph({ text: block.text, heading: HEADING[block.level], spacing: { before: 240, after: 120 } })];
    case 'paragraph':
      return [paragraph(block.text, block.tone)];
    case 'list':
      return block.items.map((item) => new Paragraph({ text: item, bullet: { level: 0 } }));
    case 'table':
      return [table(block.columns, block.rows), new Paragraph({ text: '' })];
  }
}

/** DOCX of a document model. A demo document carries a "DEMO" watermark in the header of every page. */
export async function renderDocx(doc: DocModel, options: { demo: boolean }): Promise<Buffer> {
  const header = options.demo
    ? new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'DEMO', bold: true, size: 120, color: 'D0D0D0' })],
          }),
        ],
      })
    : undefined;
  const document = new Document({
    title: doc.title,
    creator: 'Zaštita industrijskog dizajna',
    styles: { default: { document: { run: { font: 'Calibri' } } } },
    sections: [
      {
        headers: header ? { default: header } : undefined,
        children: [new Paragraph({ text: doc.title, heading: HeadingLevel.TITLE }), ...doc.blocks.flatMap(render)],
      },
    ],
  });
  return Packer.toBuffer(document);
}
