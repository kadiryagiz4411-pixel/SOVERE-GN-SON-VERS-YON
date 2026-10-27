/**
 * buildExtensionZip.mjs
 *
 * Packs public/extension/ → public/sovereign-extension.zip at build time so
 * the landing page can serve it as a plain <a download> link with zero JS.
 *
 * Run via: node scripts/buildExtensionZip.mjs
 * Wired automatically as "prebuild" in package.json.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';
import { createRequire } from 'module';

const __require = createRequire(import.meta.url);
const JSZip    = __require('jszip');

// Use cwd — avoids non-ASCII directory name issues on Windows.
const ROOT      = process.cwd();
const EXT_DIR   = join(ROOT, 'public', 'extension');
const OUT_FILE  = join(ROOT, 'public', 'sovereign-extension.zip');

function collectFiles(dir, base = dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(full, base));
    } else {
      files.push({ full, rel: relative(base, full).replace(/\\/g, '/') });
    }
  }
  return files;
}

if (!existsSync(EXT_DIR)) {
  console.warn('[buildExtensionZip] public/extension/ not found — skipping.');
  process.exit(0);
}

const zip    = new JSZip();
const folder = zip.folder('sovereign-extension');
const files  = collectFiles(EXT_DIR);

for (const { full, rel } of files) {
  folder.file(rel, readFileSync(full));
}

const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
writeFileSync(OUT_FILE, buf);
console.log(`[buildExtensionZip] ✓ ${OUT_FILE} (${(buf.length / 1024).toFixed(0)} KB, ${files.length} files)`);
