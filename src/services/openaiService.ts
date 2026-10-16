/**
 * openaiService.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Thin OpenAI wrapper used by:
 *   • Browser context  → reads VITE_ / NEXT_PUBLIC_ keys via getOpenAIApiKey()
 *   • Server / Vercel  → reads OPENAI_API_KEY
 *
 * Never instantiate the OpenAI SDK with an empty key — that crashes the app.
 */

import {
  createOpenAIClient,
  getOpenAIApiKey,
  isOpenAIApiKeyConfigured,
  OPENAI_DUMMY_KEY,
  OPENAI_KEY_MISSING_PAYLOAD,
} from '@/lib/ai/openai';
import { getActiveApiKey, resolveOpenAIKey } from '@/lib/apiKeyResolver';
import { toastOpenAIFailure } from '@/lib/openaiErrors';

/** Resolve API key for Vite (BYOK → env aliases) then Node OPENAI_API_KEY. */
const resolveApiKey = (): string => {
  const resolved = resolveOpenAIKey();
  if (resolved && resolved !== OPENAI_DUMMY_KEY) return resolved;
  return getOpenAIApiKey();
};

const getOpenAIClient = () => createOpenAIClient(resolveApiKey() || OPENAI_DUMMY_KEY);

const openai = {
  chat: {
    completions: {
      create: (...args: Parameters<ReturnType<typeof getOpenAIClient>['chat']['completions']['create']>) =>
        getOpenAIClient().chat.completions.create(...args),
    },
  },
  models: { list: () => getOpenAIClient().models.list() },
};

export { getOpenAIApiKey, openai };

// ─── Connection test ──────────────────────────────────────────────────────────

export async function testOpenAIConnection(): Promise<
  | { success: true; status: 200; message: string; modelCount: number }
  | { success: false; error: string }
> {
  const apiKey = resolveApiKey();
  if (!isOpenAIApiKeyConfigured(apiKey)) {
    return { success: false, error: OPENAI_KEY_MISSING_PAYLOAD.message };
  }

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
  if (!isOpenAIApiKeyConfigured(key)) {
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
