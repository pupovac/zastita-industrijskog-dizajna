/**
 * Placeholder views of a generic stepped facade panel for the demo project. They are
 * invented, schematic and watermarked "DEMO" — never material for a real application.
 */
export type PlaceholderView = 'PERSPECTIVE' | 'FRONT' | 'SIDE' | 'TOP' | 'DETAIL';

const W = 640;
const H = 480;

function frame(body: string, caption: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <title>DEMO – ${caption}</title>
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${body}
  <text x="${W / 2}" y="${H / 2 + 40}" text-anchor="middle" font-family="Arial, sans-serif" font-size="150" font-weight="700"
    fill="#d9534f" fill-opacity="0.12" transform="rotate(-25 ${W / 2} ${H / 2})">DEMO</text>
  <text x="16" y="${H - 16}" font-family="Arial, sans-serif" font-size="14" fill="#6b7280">DEMO – izmišljen prikaz: ${caption}</text>
</svg>
`;
}

const face = '#e7e5e4';
const side = '#c8c4c0';
const top = '#d6d3d1';
const stroke = 'stroke="#57534e" stroke-width="2" stroke-linejoin="round"';

export function placeholderSvg(view: PlaceholderView): string {
  switch (view) {
    case 'PERSPECTIVE':
      return frame(
        `<polygon points="120,150 470,150 470,370 120,370" fill="${face}" ${stroke}/>
  <polygon points="120,150 170,110 520,110 470,150" fill="${top}" ${stroke}/>
  <polygon points="470,150 520,110 520,330 470,370" fill="${side}" ${stroke}/>
  <polyline points="470,150 482,140 482,350 470,360" fill="none" ${stroke}/>
  <polyline points="120,370 132,360 482,360" fill="none" ${stroke}/>`,
        'perspektivni prikaz',
      );
    case 'FRONT':
      return frame(
        `<rect x="120" y="110" width="400" height="260" fill="${face}" ${stroke}/>
  <polyline points="500,110 500,350 120,350" fill="none" stroke="#a8a29e" stroke-width="2" stroke-dasharray="6 4"/>`,
        'pogled spreda',
      );
    case 'SIDE':
      return frame(
        `<polygon points="290,90 330,90 330,330 350,330 350,390 310,390 310,150 290,150" fill="${side}" ${stroke}/>`,
        'pogled sa desne strane (stepenasti profil)',
      );
    case 'TOP':
      return frame(
        `<polygon points="120,200 500,200 500,220 520,220 520,260 140,260 140,240 120,240" fill="${top}" ${stroke}/>`,
        'pogled odozgo',
      );
    case 'DETAIL':
      return frame(
        `<polygon points="200,120 380,120 380,280 440,280 440,380 260,380 260,220 200,220" fill="${face}" ${stroke}/>
  <circle cx="380" cy="280" r="70" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="8 6"/>`,
        'detalj stepenaste ivice',
      );
  }
}
