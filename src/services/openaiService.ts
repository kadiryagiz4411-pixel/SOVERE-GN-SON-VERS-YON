/**
 * openaiService.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Thin OpenAI wrapper used by:
 *   • Browser context  → reads VITE_OPENAI_API_KEY via import.meta.env
 *   • Supabase Edge Fn → reads OPENAI_API_KEY via process.env (Deno compat)
 *
 * Never expose a raw API key in client bundles in production.
 * Prefer routing calls through a Supabase Edge Function instead.
 */

import OpenAI from 'openai';
import { getActiveApiKey, resolveOpenAIKey } from '@/lib/apiKeyResolver';
import { toastOpenAIFailure } from '@/lib/openaiErrors';

/** Resolve API key for Vite (BYOK → VITE) then Node/Deno OPENAI_API_KEY. */
const resolveApiKey = (): string => {
  const resolved = resolveOpenAIKey();
  if (resolved) return resolved;
  if (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY?.startsWith('sk-')) {
    return process.env.OPENAI_API_KEY.trim();
  }
  return '';
};

/**
 * Lazily-resolved OpenAI client.
 * Returns a new instance each call so it always picks up the latest key
 * (e.g. after the user saves a BYOK key in Profile → Settings).
 */
const getOpenAIClient = () =>
  new OpenAI({ apiKey: resolveApiKey() || 'sk-placeholder', dangerouslyAllowBrowser: true });

// Backwards-compat alias used by testOpenAIConnection / generateProposal below.
const openai = { chat: { completions: { create: (...args: Parameters<OpenAI['chat']['completions']['create']>) => getOpenAIClient().chat.completions.create(...args) } }, models: { list: () => getOpenAIClient().models.list() } };

// ─── Connection test ──────────────────────────────────────────────────────────

export async function testOpenAIConnection(): Promise<
  | { success: true; status: 200; message: string; modelCount: number }
  | { success: false; error: string }
> {
  try {
    const models = await openai.models.list();
    return {
      status: 200,
      success: true,
      message: 'OpenAI API Bağlantısı Başarılı',
      modelCount: models.data.length,
    };
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    console.error('OpenAI Bağlantı Hatası:', err);

    if (err?.status === 401) {
      return { success: false, error: 'API Key geçersiz veya hatalı.' };
    }
    if (err?.status === 429) {
      return { success: false, error: 'OpenAI bakiyeniz/kotanız dolmuş.' };
    }
    return {
      success: false,
      error: err?.message ?? 'Bilinmeyen bir OpenAI hatası oluştu.',
    };
  }
}

// ─── Proposal generation ──────────────────────────────────────────────────────

export async function generateProposal(userData: unknown): Promise<Record<string, unknown>> {
  const key = resolveApiKey() || getActiveApiKey();
  if (!key) {
    toastOpenAIFailure();
    return {};
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: JSON.stringify(userData) }],
      response_format: { type: 'json_object' },
    });

    return JSON.parse(response.choices[0].message.content ?? '{}') as Record<string, unknown>;
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number; code?: string };
    console.error('PROPOSAL_GENERATE_ERROR:', {
      message: err.message,
      status: err.status,
      code: err.code,
    });
    toastOpenAIFailure(err.status);
    return {};
  }
}
