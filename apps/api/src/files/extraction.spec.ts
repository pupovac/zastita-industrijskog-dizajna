import { extractContent } from './extraction';
import { detectFileKind } from './file-types';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('detectFileKind', () => {
  it('accepts supported formats whose content matches the extension', () => {
    expect(detectFileKind('Foto.PNG', PNG)).toBe('PNG');
    expect(detectFileKind('slika.jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('JPEG');
    expect(detectFileKind('opis.pdf', Buffer.from('%PDF-1.7\n'))).toBe('PDF');
    expect(detectFileKind('opis.docx', Buffer.from([0x50, 0x4b, 0x03, 0x04]))).toBe('DOCX');
    expect(detectFileKind('crtez.svg', Buffer.from('<?xml version="1.0"?><svg width="1"></svg>'))).toBe('SVG');
  });

  it('rejects unsupported extensions and disguised content', () => {
    expect(detectFileKind('model.dwg', Buffer.from('x'))).toBeNull();
    expect(detectFileKind('opis.pdf', PNG)).toBeNull();
    expect(detectFileKind('foto.png', Buffer.from('%PDF-1.7'))).toBeNull();
    expect(detectFileKind('crtez.svg', Buffer.from('<html></html>'))).toBeNull();
  });
});

describe('extractContent', () => {
  it('reads image dimensions', async () => {
    const result = await extractContent('PNG', PNG);
    expect(result).toMatchObject({ status: 'EXTRACTED', metadata: { width: 1, height: 1 }, text: null });
  });

  it('extracts visible SVG text', async () => {
    const result = await extractContent(
      'SVG',
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><text>Pogled <tspan>spreda</tspan></text></svg>'),
    );
    expect(result.status).toBe('EXTRACTED');
    expect(result.text).toBe('Pogled spreda');
    expect(result.metadata).toMatchObject({ width: 20, height: 10 });
  });

  it('reports failure instead of inventing content for a broken document', async () => {
    const result = await extractContent('DOCX', Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0]));
    expect(result.status).toBe('FAILED');
    expect(result.text).toBeNull();
    expect(result.summary).toContain('ručna provera');
  });
});
