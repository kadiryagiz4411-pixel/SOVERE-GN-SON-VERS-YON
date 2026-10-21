export function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, x-extension-id, x-sovereign-key, Cache-Control, Pragma, Accept, X-Requested-With, Origin',
    Vary: 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
    'Access-Control-Max-Age': '86400',
  };
}

export const corsHeaders: Record<string, string> = getCorsHeaders();

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(), 'Content-Type': 'application/json' },
  });
}

/** Chrome extension preflight cannot follow 301/308 redirects — answer OPTIONS with 200 in place. */
export function preflight(): Response {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(),
  });
}

export const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

export function jsonNoStore(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(),
      ...NO_STORE_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

export function preflightNoStore(): Response {
  return new Response(null, {
    status: 200,
    headers: { ...getCorsHeaders(), ...NO_STORE_HEADERS },
  });
}

export async function readJsonBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  return (await req.json().catch(() => ({}))) as T;
}
