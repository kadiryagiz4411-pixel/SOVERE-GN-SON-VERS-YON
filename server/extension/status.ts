import { jsonNoStore, preflight } from '../_lib/cors.js';
import { exposeApi } from '../_lib/http.js';

export const config = { runtime: 'nodejs', maxDuration: 10 };

async function handleRequest(req: Request): Promise<Response> {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') return preflight();
  return jsonNoStore({
    ok: true,
    success: true,
    message: 'Sovereign API is LIVE and fully reachable.',
    service: 'extension-status',
  });
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const HEAD = api.HEAD;
export const POST = api.POST;
export default api;
