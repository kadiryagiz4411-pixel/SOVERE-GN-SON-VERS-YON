/**
 * Supabase Edge Function OpenAI key resolution.
 *
 * 1) Client-forwarded BYOK / Vercel VITE key (`customApiKey` in JSON body)
 * 2) Supabase secret OPENAI_API_KEY (Deno.env)
 * 3) Explicit 400 JSON — never crash with an uncaught Deno exception
 */

export const AI_NOT_CONFIGURED_MESSAGE =
  "AI_NOT_CONFIGURED: Lütfen sistem OPENAI_API_KEY (Supabase) veya VITE_OPENAI_API_KEY (Vercel) değişkenini kontrol edin veya Ayarlar'dan kendi OpenAI API anahtarınızı girin.";

function isSkKey(value: unknown): value is string {
  return typeof value === 'string' && value.trim().startsWith('sk-');
}

export function resolveEdgeOpenAIKey(body: unknown): string {
  const rec = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const clientKey = typeof rec.customApiKey === 'string' ? rec.customApiKey.trim() : '';
  if (isSkKey(clientKey)) return clientKey;

  const systemKey = (Deno.env.get('OPENAI_API_KEY') ?? '').trim();
  if (isSkKey(systemKey)) return systemKey;

  throw new Error(AI_NOT_CONFIGURED_MESSAGE);
}

export function missingOpenAIKeyResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      error: AI_NOT_CONFIGURED_MESSAGE,
      code: 'AI_NOT_CONFIGURED',
    }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
