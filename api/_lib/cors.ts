export function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-extension-id, x-sovereign-key',
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
