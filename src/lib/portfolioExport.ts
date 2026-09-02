import JSZip from 'jszip';

export type PortfolioTheme = 'midnight' | 'ivory' | 'ocean';

export const PORTFOLIO_THEMES: Record<PortfolioTheme, { label: string; bg: string; text: string; accent: string; card: string }> = {
  midnight: { label: 'Midnight', bg: '#09090b', text: '#e4e4e7', accent: '#fbbf24', card: '#18181b' },
  ivory: { label: 'Ivory', bg: '#f8f5ef', text: '#1c1917', accent: '#b45309', card: '#ffffff' },
  ocean: { label: 'Ocean', bg: '#0b1d2a', text: '#e0f2fe', accent: '#38bdf8', card: '#123047' },
};

export interface PortfolioData {
  name: string;
  title: string;
  summary: string;
  skills: string;
  experience: string;
  projects: string;
  email: string;
  linkedin: string;
  github: string;
  theme: PortfolioTheme;
}

export function buildPortfolioCss(theme: PortfolioTheme): string {
  const t = PORTFOLIO_THEMES[theme];
  return `:root { color-scheme: ${theme === 'ivory' ? 'light' : 'dark'}; }
body { margin:0; font-family: Inter, system-ui, sans-serif; background:${t.bg}; color:${t.text}; }
.wrap { max-width: 880px; margin: 0 auto; padding: 48px 20px; }
h1 { font-size: 2.4rem; margin: 0; }
.title { color:${t.accent}; margin-top:6px; }
.muted { opacity:.72; }
.card { background:${t.card}; border:1px solid color-mix(in srgb, ${t.accent} 25%, transparent); border-radius:16px; padding:20px; margin-top:18px; }
.pills { display:flex; flex-wrap:wrap; gap:8px; }
.pill { border:1px solid color-mix(in srgb, ${t.accent} 45%, transparent); color:${t.accent}; border-radius:999px; padding:4px 10px; font-size:12px; }
a { color:${t.accent}; }
pre { white-space: pre-wrap; font-family: inherit; margin:0; }`;
}

export function buildPortfolioHtml(data: PortfolioData): string {
  const skills = data.skills.split(',').map((s) => s.trim()).filter(Boolean);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(data.name)} — Portfolio</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="wrap">
    <h1>${escapeHtml(data.name || 'Your Name')}</h1>
    <p class="title">${escapeHtml(data.title || 'Professional')}</p>
    <p class="muted">${escapeHtml(data.email)} ${data.linkedin ? '· ' + escapeHtml(data.linkedin) : ''} ${data.github ? '· ' + escapeHtml(data.github) : ''}</p>
    <div class="card"><h3>About</h3><p>${escapeHtml(data.summary || '')}</p></div>
    <div class="card"><h3>Skills</h3><div class="pills">${skills.map((s) => `<span class="pill">${escapeHtml(s)}</span>`).join('')}</div></div>
    <div class="card"><h3>Experience</h3><pre>${escapeHtml(data.experience || '')}</pre></div>
    <div class="card"><h3>Projects</h3><pre>${escapeHtml(data.projects || '')}</pre></div>
  </div>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildInlinePreview(data: PortfolioData): string {
  const html = buildPortfolioHtml(data);
  const css = buildPortfolioCss(data.theme);
  return html.replace('<link rel="stylesheet" href="styles.css" />', `<style>${css}</style>`);
}

export async function downloadPortfolioZip(data: PortfolioData): Promise<void> {
  const zip = new JSZip();
  zip.file('index.html', buildPortfolioHtml(data));
  zip.file('styles.css', buildPortfolioCss(data.theme));
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(data.name || 'portfolio').replace(/\s+/g, '-').toLowerCase()}-portfolio.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
