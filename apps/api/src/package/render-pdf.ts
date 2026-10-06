import PDFDocument from 'pdfkit';
import { Block, DocModel } from './doc-model';

// DejaVu covers Serbian Latin (č, ć, đ, š, ž); the standard PDF fonts do not.
const FONT_REGULAR = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans.ttf');
const FONT_BOLD = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf');
const MARGIN = 50;

type Pdf = PDFKit.PDFDocument;

function contentWidth(pdf: Pdf) {
  return pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;
}

function bottom(pdf: Pdf) {
  return pdf.page.height - pdf.page.margins.bottom;
}

function drawTable(pdf: Pdf, columns: string[], rows: string[][]) {
  const width = contentWidth(pdf);
  // Column widths follow the content, within limits, so short codes stay narrow.
  const weights = columns.map((c, i) =>
    Math.min(40, Math.max(8, c.length + 2, ...rows.map((r) => Math.min(60, (r[i] ?? '').length / 2)))),
  );
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (w / total) * width);
  const padding = 3;
  pdf.fontSize(8);

  const rowHeight = (cells: string[], bold: boolean) => {
    pdf.font(bold ? 'Bold' : 'Regular');
    return Math.max(...cells.map((text, i) => pdf.heightOfString(text || ' ', { width: widths[i] - 2 * padding }))) + 2 * padding;
  };
  const drawRow = (cells: string[], bold: boolean) => {
    const height = rowHeight(cells, bold);
    if (pdf.y + height > bottom(pdf)) {
      pdf.addPage();
      if (!bold) drawRow(columns, true);
    }
    const top = pdf.y;
    let x = pdf.page.margins.left;
    pdf.font(bold ? 'Bold' : 'Regular');
    cells.forEach((text, i) => {
      if (bold) pdf.rect(x, top, widths[i], height).fill('#f2f2f2').fillColor('#000');
      pdf.rect(x, top, widths[i], height).lineWidth(0.5).stroke('#bfbfbf');
      pdf.fillColor('#000').text(text || '', x + padding, top + padding, { width: widths[i] - 2 * padding });
      x += widths[i];
    });
    pdf.x = pdf.page.margins.left;
    pdf.y = top + height;
  };
  drawRow(columns, true);
  rows.forEach((r) => drawRow(columns.map((_, i) => r[i] ?? ''), false));
  pdf.moveDown(0.8);
}

function drawBlock(pdf: Pdf, block: Block) {
  const left = pdf.page.margins.left;
  switch (block.type) {
    case 'heading':
      if (pdf.y > bottom(pdf) - 60) pdf.addPage();
      pdf.moveDown(0.5).font('Bold').fontSize(block.level === 1 ? 15 : block.level === 2 ? 12.5 : 11);
      pdf.fillColor('#000').text(block.text, left, pdf.y, { width: contentWidth(pdf) });
      pdf.moveDown(0.3);
      break;
    case 'paragraph':
      pdf.font(block.tone === 'warning' ? 'Bold' : 'Regular').fontSize(block.tone === 'note' ? 9 : 10);
      pdf.fillColor(block.tone === 'warning' ? '#9c2b2b' : block.tone === 'note' ? '#555' : '#000');
      pdf.text(block.text, left, pdf.y, { width: contentWidth(pdf) });
      pdf.fillColor('#000').moveDown(0.5);
      break;
    case 'list':
      pdf.font('Regular').fontSize(10).fillColor('#000');
      pdf.list(block.items, left, pdf.y, { width: contentWidth(pdf) - 12, bulletRadius: 1.5 });
      pdf.moveDown(0.5);
      break;
    case 'table':
      drawTable(pdf, block.columns, block.rows);
      break;
  }
}

/** Review PDF of a document model, with page numbers and, for demo projects, a "DEMO" watermark on every page. */
export function renderPdf(doc: DocModel, options: { demo: boolean }): Promise<Buffer> {
  return new Promise((resolvePdf, reject) => {
    const pdf = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: { Title: doc.title, Creator: 'Zaštita industrijskog dizajna' },
    });
    const chunks: Buffer[] = [];
    pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdf.on('end', () => resolvePdf(Buffer.concat(chunks)));
    pdf.on('error', reject);
    pdf.registerFont('Regular', FONT_REGULAR);
    pdf.registerFont('Bold', FONT_BOLD);

    pdf.font('Bold').fontSize(18).text(doc.title);
    pdf.moveDown(0.5);
    doc.blocks.forEach((block) => drawBlock(pdf, block));

    const range = pdf.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      pdf.switchToPage(i);
      // Writing into the bottom margin must not start a new page.
      const margins = { ...pdf.page.margins };
      pdf.page.margins.bottom = 0;
      if (options.demo) {
        const cx = pdf.page.width / 2;
        const cy = pdf.page.height / 2;
        pdf.save().rotate(-35, { origin: [cx, cy] }).font('Bold').fontSize(140).fillColor('#c8c8c8').opacity(0.35);
        pdf.text('DEMO', cx - 300, cy - 80, { width: 600, align: 'center', lineBreak: false });
        pdf.restore();
      }
      pdf.opacity(1).font('Regular').fontSize(8).fillColor('#555');
      pdf.text(`${doc.title} · strana ${i - range.start + 1} od ${range.count}`, MARGIN, pdf.page.height - 30, {
        width: pdf.page.width - 2 * MARGIN,
        align: 'center',
        lineBreak: false,
      });
      pdf.page.margins.bottom = margins.bottom;
    }
    pdf.end();
  });
}
