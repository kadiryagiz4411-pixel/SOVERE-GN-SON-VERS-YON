import { json, preflight } from '../_lib/cors.js';
import { exposeApi } from '../_lib/http.js';
import { normalizeAffiliateCode, recordAffiliateClick } from '../_lib/affiliate.js';

export const config = { runtime: 'nodejs' };

async function handleRequest(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const body = await req.json().catch(() => ({})) as { code?: string; path?: string; utm?: string };
  const code = normalizeAffiliateCode(body.code);
  if (code.length < 4) return json({ ok: false, error: 'Invalid code' }, 400);
  try {
    await recordAffiliateClick(code, body.path, body.utm);
    return json({ ok: true });
  } catch (err) {
    console.error('[affiliate/track]', err);
    return json({ ok: false }, 200);
  }
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const POST = api.POST;
export default api;
