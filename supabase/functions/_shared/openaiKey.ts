/**
 * Supabase Edge Function OpenAI key resolution.
 *
 * 1) Client-forwarded BYOK / Vercel VITE key (`customApiKey` in JSON body)
 * 2) Secrets: OPENAI_API_KEY, VITE_OPENAI_API_KEY, NEXT_PUBLIC_OPENAI_API_KEY
 * 3) Explicit JSON — never crash with an uncaught Deno exception
 */

export const OPENAI_DUMMY_KEY = 'dummy-key-to-prevent-crash';

export const AI_BUSY_MESSAGE =
  'AI engine is currently updating. Please try again in a few moments.';

export const AI_NOT_CONFIGURED_MESSAGE = AI_BUSY_MESSAGE;

const KEY_ALIASES = [
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_OPENAI_API_KEY',
  'VITE_OPENAI_API_KEY',
  'OPEN_AI_KEY',
  'OPEN_AI_API_KEY',
  'OPENAI_SECRET_KEY',
];

function isSkKey(value: unknown): value is string {
  return typeof value === 'string' && value.trim().startsWith('sk-');
}

export function getOpenAIApiKey(): string {
  let key = '';
  for (const alias of KEY_ALIASES) {
    try {
      const value = String(Deno.env.get(alias) ?? '').trim();
      if (value && value !== OPENAI_DUMMY_KEY && value.length > 10) {
        key = value;
        break;
      }
    } catch {
      /* ignore */
    }
  }

  if (!key) {
    console.error('CRITICAL: OpenAI API Key could not be resolved from process.env runtime.');
  }

  return key === OPENAI_DUMMY_KEY ? '' : key;
}

export function resolveEdgeOpenAIKey(body: unknown): string {
  const rec = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const clientKey = typeof rec.customApiKey === 'string' ? rec.customApiKey.trim() : '';
  if (isSkKey(clientKey)) return clientKey;

  const systemKey = getOpenAIApiKey();
  if (isSkKey(systemKey)) return systemKey;

  throw new Error(AI_NOT_CONFIGURED_MESSAGE);
}

export function missingOpenAIKeyResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: 'AI_BUSY',
      message: AI_BUSY_MESSAGE,
    }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

export function tryResolveEdgeOpenAIKey(
  body: unknown,
  corsHeaders: Record<string, string>,
): { key: string } | { response: Response } {
  try {
    return { key: resolveEdgeOpenAIKey(body) };
  } catch {
    return { response: missingOpenAIKeyResponse(corsHeaders) };
  }
}
