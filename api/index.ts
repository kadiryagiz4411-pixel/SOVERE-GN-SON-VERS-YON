/**
 * Single Hobby-plan Vercel function.
 * Every public /api/* URL is rewritten here so the deployment stays under
 * the 12 serverless-function limit. Handlers live in ../server and are not
 * deployed as their own functions.
 */
import { jsonNoStore, preflight } from '../server/_lib/cors.js';
import { exposeApi } from '../server/_lib/http.js';
import generateCv from '../server/generate-cv.js';
import generateFollowup from '../server/generate-followup.js';
import opportunities from '../server/opportunities.js';
import proposal from '../server/proposal.js';
import batchEvaluate from '../server/batch/evaluate.js';
import billingCheckout from '../server/billing/checkout.js';
import billingStatus from '../server/billing/status.js';
import billingWebhook from '../server/billing/webhook.js';
import extensionAutoFill from '../server/extension/auto-fill-payload.js';
import extensionMe from '../server/extension/me.js';
import extensionParseDom from '../server/extension/parse-dom.js';
import extensionRefresh from '../server/extension/refresh.js';
import extensionStatus from '../server/extension/status.js';
import affiliateMe from '../server/affiliate/me.js';
import affiliateTrack from '../server/affiliate/track.js';
import seoStacks from '../server/seo/stacks.js';

export const config = { runtime: 'nodejs', maxDuration: 60 };

type ApiModule = {
  fetch: (req: Request) => Response | Promise<Response>;
};

const ROUTES: Record<string, ApiModule> = {
  '/api/generate-cv': generateCv,
  '/api/smart-match': generateCv,
  '/api/optimize-proposal': generateCv,
  '/api/generate-followup': generateFollowup,
  '/api/opportunities': opportunities,
  '/api/proposal': proposal,
  '/api/batch/evaluate': batchEvaluate,
  '/api/billing/checkout': billingCheckout,
  '/api/billing/status': billingStatus,
  '/api/billing/webhook': billingWebhook,
  '/api/extension/auto-fill-payload': extensionAutoFill,
  '/api/extension/me': extensionMe,
  '/api/extension/parse-dom': extensionParseDom,
  '/api/extension/refresh': extensionRefresh,
  '/api/extension/status': extensionStatus,
  '/api/affiliate/me': affiliateMe,
  '/api/affiliate/track': affiliateTrack,
  '/api/seo/stacks': seoStacks,
};

function decodePath(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function normalizeApiPath(raw: string): string {
  let path = decodePath(String(raw || '').trim()).split('?')[0];
  if (!path) return '';
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.startsWith('/api/api/')) path = path.slice(4);
  if (path === '/api/index') return '/api';
  if (!path.startsWith('/api')) path = `/api${path}`;
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
  return path;
}

function resolveApiPath(req: Request): string {
  const url = new URL(req.url);
  const candidates = [
    url.searchParams.get('__route'),
    req.headers.get('x-invoke-path'),
    req.headers.get('x-vercel-original-path'),
    req.headers.get('x-matched-path'),
    req.headers.get('x-forwarded-uri'),
    url.pathname,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const path = normalizeApiPath(candidate);
    if (path && path !== '/api' && ROUTES[path]) return path;
  }
  for (const candidate of candidates) {
    if (!candidate) continue;
    const path = normalizeApiPath(candidate);
    if (path && path !== '/api') return path;
  }
  return '/api';
}

function requestForRoute(req: Request, apiPath: string): Request {
  const url = new URL(req.url);
  url.pathname = apiPath;
  url.searchParams.delete('__route');
  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers: req.headers,
  };
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    init.body = req.body;
    init.duplex = 'half';
  }
  return new Request(url, init);
}

async function handleRequest(req: Request): Promise<Response> {
  const apiPath = resolveApiPath(req);
  const handler = ROUTES[apiPath];
  if (!handler) {
    if (req.method === 'OPTIONS' || req.headers.get('access-control-request-method')) {
      return preflight();
    }
    if (apiPath === '/api' && (req.method === 'GET' || req.method === 'HEAD')) {
      return jsonNoStore({
        ok: true,
        success: true,
        message: 'Sovereign API is LIVE and fully reachable.',
        service: 'api',
      });
    }
    return jsonNoStore({ error: 'Not found' }, 404);
  }
  return handler.fetch(requestForRoute(req, apiPath));
}

const api = exposeApi(handleRequest);
export const OPTIONS = api.OPTIONS;
export const GET = api.GET;
export const HEAD = api.HEAD;
export const POST = api.POST;
export default api;
