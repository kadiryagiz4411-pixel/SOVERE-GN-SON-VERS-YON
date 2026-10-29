/**
 * buildExtensionZip.mjs
 *
 * Packs public/extension/ → public/sovereign-extension.zip at build time so
 * the landing page can serve it as a plain <a download> link with zero JS.
 *
 * Run via: node scripts/buildExtensionZip.mjs
 * Wired automatically as "prebuild" in package.json.
 *
 * Cache-bust strategy:
 *   Before zipping, a BUILD_AT timestamp is injected into config.js so Chrome
 *   always sees a content change between builds — even when the manifest version
 *   hasn't been manually bumped. This prevents Chrome from serving a stale
 *   background.js or content.js from its internal extension cache.
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
const CONFIG_JS = join(EXT_DIR, 'config.js');

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

// Inject a BUILD_AT timestamp into config.js before reading files into the zip.
// This guarantees every zip has unique content so Chrome always reloads all
// extension scripts when the user installs/updates the packed .zip.
const buildAt = new Date().toISOString();
if (existsSync(CONFIG_JS)) {
  let configSrc = readFileSync(CONFIG_JS, 'utf8');
  // Replace an existing BUILD_AT line or append it if missing.
  const stampLine = `const BUILD_AT = '${buildAt}'; // auto-injected by buildExtensionZip.mjs`;
  const withoutStamps = configSrc.replace(/^const BUILD_AT\s*=.*\r?\n?/gm, '');
  if (withoutStamps !== configSrc) {
    const lines = withoutStamps.split('\n');
    lines.splice(1, 0, stampLine);
    configSrc = lines.join('\n');
  } else {
    // Insert after the first line (usually a comment block header).
    const lines = configSrc.split('\n');
    // Find the end of any leading block comment, or just prepend after line 0.
    let insertAt = 0;
    for (let i = 0; i < lines.length; i++) {
      insertAt = i;
      if (lines[i].trim() && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('/*') && !lines[i].trim().startsWith('*')) break;
    }
    lines.splice(insertAt + 1, 0, stampLine);
    configSrc = lines.join('\n');
  }
  writeFileSync(CONFIG_JS, configSrc, 'utf8');
  console.log(`[buildExtensionZip] Stamped BUILD_AT=${buildAt} into config.js`);
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
