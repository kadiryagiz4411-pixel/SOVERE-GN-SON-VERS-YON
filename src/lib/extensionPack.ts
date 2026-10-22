const EXTENSION_FILES = [
  'manifest.json',
  'background.js',
  'config.js',
  'content.js',
  'inject.js',
  'scraper.js',
  'sidepanel.html',
  'sidepanel.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
  'assets/logo.png',
  'assets/icon16.png',
  'assets/icon48.png',
  'assets/icon128.png',
];

export const EXTENSION_FILES_PUBLIC = EXTENSION_FILES;

export async function downloadSovereignExtensionZip(): Promise<boolean> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const folder = zip.folder('sovereign-extension');
  if (!folder) return false;

  const results = await Promise.all(
    EXTENSION_FILES.map(async (file) => {
      const res = await fetch(`/extension/${file}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return null;
      return { file, buf: await res.arrayBuffer() };
    }),
  );

  let added = 0;
  for (const item of results) {
    if (!item) continue;
    folder.file(item.file, item.buf);
    added += 1;
  }
  if (added < 4) return false;

  const blob = await zip.generateAsync({ type: 'blob' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = 'sovereign-extension.zip';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 2000);
  return true;
}
