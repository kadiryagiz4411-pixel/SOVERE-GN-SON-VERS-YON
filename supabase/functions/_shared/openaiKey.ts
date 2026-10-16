/**
 * Supabase Edge Function OpenAI key resolution.
 *
 * 1) Client-forwarded BYOK / Vercel VITE key (`customApiKey` in JSON body)
 * 2) Secrets: OPENAI_API_KEY, VITE_OPENAI_API_KEY, NEXT_PUBLIC_OPENAI_API_KEY
 * 3) Explicit JSON — never crash with an uncaught Deno exception
 */

export const OPENAI_DUMMY_KEY = 'dummy-key-to-prevent-crash';

export const AI_NOT_CONFIGURED_MESSAGE =
  "AI_NOT_CONFIGURED: Lütfen sistem OPENAI_API_KEY (Supabase) veya VITE_OPENAI_API_KEY (Vercel) değişkenini kontrol edin veya Ayarlar'dan kendi OpenAI API anahtarınızı girin.";

function isSkKey(value: unknown): value is string {
  return typeof value === 'string' && value.trim().startsWith('sk-');
}

export function getOpenAIApiKey(): string {
  const key = (
    Deno.env.get('OPENAI_API_KEY')
    ?? Deno.env.get('VITE_OPENAI_API_KEY')
    ?? Deno.env.get('NEXT_PUBLIC_OPENAI_API_KEY')
    ?? ''
  ).trim();

  if (!key || key === OPENAI_DUMMY_KEY) {
    console.error(
      'CRITICAL ERROR: OpenAI API Key is missing across all runtime environments (OPENAI_API_KEY, VITE_OPENAI_API_KEY, NEXT_PUBLIC_OPENAI_API_KEY).',
    );
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
      error: 'OPENAI_KEY_MISSING',
      code: 'AI_NOT_CONFIGURED',
      message:
        'OpenAI API Key is not configured in environment variables. Please check Vercel settings and redeploy.',
      detail: AI_NOT_CONFIGURED_MESSAGE,
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
