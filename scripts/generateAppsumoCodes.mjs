/**
 * Bulk-generate AppSumo license codes and write them to a CSV file.
 *
 * Usage:
 *   node scripts/generateAppsumoCodes.mjs --tier 1 --count 25 --out appsumo-tier1.csv
 *
 * Requires SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY
 * in the environment. The service role key is never printed.
 * Do not commit the CSV. Codes are inserted as unredeemed rows.
 */
import { writeFileSync } from 'fs';

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
}

const tier = Number(arg('tier', ''));
const count = Number(arg('count', ''));
const out = arg('out', '');

if (![1, 2, 3].includes(tier) || !Number.isInteger(count) || count < 1 || count > 500 || !out) {
  console.error('Usage: node scripts/generateAppsumoCodes.mjs --tier 1|2|3 --count 1-500 --out codes.csv');
  process.exit(1);
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before generating codes.');
  process.exit(1);
}

const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/generate_appsumo_codes`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ p_count: count, p_tier_level: tier }),
});

const payload = await response.json().catch(() => null);
if (!response.ok || !Array.isArray(payload)) {
  const message = payload && typeof payload === 'object' ? (payload.message || payload.error || response.status) : response.status;
  console.error(`Code generation failed: ${message}`);
  process.exit(1);
}

const names = { 1: 'Starter', 2: 'Pro', 3: 'Agency' };
const lines = ['code,tier_level,tier_name'];
for (const row of payload) {
  const code = String(row.code || '').replace(/"/g, '');
  const level = Number(row.tier_level);
  if (!code) continue;
  lines.push(`${code},${level},${names[level] || ''}`);
}

writeFileSync(out, `${lines.join('\n')}\n`, 'utf8');
console.log(`Wrote ${lines.length - 1} ${names[tier]} codes to ${out}`);
