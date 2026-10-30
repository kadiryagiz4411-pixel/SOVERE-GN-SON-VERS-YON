/**
 * Generate 5000 unique SOV- license codes.
 *
 * Writes appsumo_codes.txt in the project root (one code per line, no header)
 * and SQL batches that insert the same codes with a random tier_1, tier_2, or
 * tier_3 and is_redeemed = false.
 *
 * Usage: node scripts/generateSovLicenseCodes.mjs
 * The license file and SQL batches are local only. Do not commit them.
 */
import { createHash, randomInt } from 'crypto';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const COUNT = 5000;
const SUFFIX_LENGTH = 8;
const BATCH_SIZE = 500;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const TIERS = ['tier_1', 'tier_2', 'tier_3'];

function suffix() {
  let value = '';
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) {
    value += ALPHABET[randomInt(ALPHABET.length)];
  }
  return value;
}

const codes = new Set();
while (codes.size < COUNT) {
  codes.add(`SOV-${suffix()}`);
}

const rows = [...codes].map((code) => {
  const tier = TIERS[randomInt(TIERS.length)];
  return { code, tier, tier_level: Number(tier.slice(-1)) };
});

const listPath = join(root, 'appsumo_codes.txt');
writeFileSync(listPath, `${rows.map((row) => row.code).join('\n')}\n`, 'utf8');

const batchDir = join(root, 'scripts', '.sov-insert');
rmSync(batchDir, { recursive: true, force: true });
mkdirSync(batchDir, { recursive: true });

for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
  const chunk = rows.slice(offset, offset + BATCH_SIZE);
  const values = chunk
    .map((row) => `('${row.code}','${row.tier}',${row.tier_level},false)`)
    .join(',\n');
  const index = String(offset / BATCH_SIZE).padStart(2, '0');
  const sql = `INSERT INTO public.appsumo_codes (code, tier, tier_level, is_redeemed)\nVALUES\n${values};\n`;
  writeFileSync(join(batchDir, `batch-${index}.sql`), sql, 'utf8');
}

const sorted = rows.map((row) => row.code).sort();
const digest = createHash('sha256').update(sorted.join('\n')).digest('hex');
const tierCounts = rows.reduce((acc, row) => {
  acc[row.tier] += 1;
  return acc;
}, { tier_1: 0, tier_2: 0, tier_3: 0 });

console.log(`count=${rows.length}`);
console.log(`sha256=${digest}`);
console.log(`tier_1=${tierCounts.tier_1} tier_2=${tierCounts.tier_2} tier_3=${tierCounts.tier_3}`);
console.log('file=appsumo_codes.txt');
