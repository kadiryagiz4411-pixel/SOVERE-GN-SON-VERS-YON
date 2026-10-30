/**
 * Generate 5000 unique SOV- license codes.
 *
 * Codes are SOV- plus 8 uppercase hex characters from SHA-256, which is
 * uppercase alphanumeric. The same sequence is what the database insert uses,
 * so the text file and appsumo_codes stay the same set.
 *
 * Usage: node scripts/generateSovLicenseCodes.mjs
 * appsumo_codes.txt and appsumo_codes.csv are local only. Do not commit them.
 */
import { createHash } from 'crypto';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const COUNT = 5000;
const TIERS = ['tier_1', 'tier_2', 'tier_3'];

function rowAt(index) {
  const hex = createHash('sha256').update(`sov-license-v1:${index}`).digest('hex');
  const tierLevel = (parseInt(hex.slice(8, 10), 16) % 3) + 1;
  return {
    code: `SOV-${hex.slice(0, 8).toUpperCase()}`,
    tier: TIERS[tierLevel - 1],
    tier_level: tierLevel,
  };
}

const rows = Array.from({ length: COUNT }, (_, index) => rowAt(index));
const unique = new Set(rows.map((row) => row.code));
if (unique.size !== COUNT) {
  console.error(`Expected ${COUNT} unique codes, got ${unique.size}`);
  process.exit(1);
}

const body = `${rows.map((row) => row.code).join('\n')}\n`;
writeFileSync(join(root, 'appsumo_codes.txt'), body, 'utf8');
writeFileSync(join(root, 'appsumo_codes.csv'), body, 'utf8');

const sorted = [...unique].sort();
const digest = createHash('sha256').update(sorted.join('\n')).digest('hex');
const tierCounts = rows.reduce((acc, row) => {
  acc[row.tier] += 1;
  return acc;
}, { tier_1: 0, tier_2: 0, tier_3: 0 });

console.log(`count=${rows.length}`);
console.log(`sha256=${digest}`);
console.log(`tier_1=${tierCounts.tier_1} tier_2=${tierCounts.tier_2} tier_3=${tierCounts.tier_3}`);
console.log('file=appsumo_codes.csv');
