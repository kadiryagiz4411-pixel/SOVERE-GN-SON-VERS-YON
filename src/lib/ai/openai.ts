/**
 * Shared OpenAI client — never throw at import time when the key is missing.
 * Reads OPENAI_API_KEY, VITE_OPENAI_API_KEY, and NEXT_PUBLIC_OPENAI_API_KEY.
 */

export const OPENAI_DUMMY_KEY = 'dummy-key-to-prevent-crash';

function readEnvValue(key: string): string {
  try {
    const meta = (typeof import.meta !== 'undefined'
      ? (import.meta.env as Record<string, string | undefined>)
      : {}) as Record<string, string | undefined>;
    const fromMeta = String(meta[key] ?? '').trim();
    if (fromMeta) return fromMeta;
  } catch {
    /* ignore */
  }
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } })
      .process?.env ?? {};
    const fromProc = String(proc[key] ?? '').trim();
    if (fromProc) return fromProc;
  } catch {
    /* ignore */
  }
  return '';
}

let missingKeyLogged = false;

export function getOpenAIApiKey(): string {
  const key =
    readEnvValue('OPENAI_API_KEY') ||
    readEnvValue('VITE_OPENAI_API_KEY') ||
    readEnvValue('NEXT_PUBLIC_OPENAI_API_KEY') ||
    '';

  if (!key && !missingKeyLogged) {
    missingKeyLogged = true;
    console.error(
      'CRITICAL ERROR: OpenAI API Key is missing across all runtime environments (OPENAI_API_KEY, VITE_OPENAI_API_KEY, NEXT_PUBLIC_OPENAI_API_KEY).',
    );
  }

  return key;
}

export function isOpenAIApiKeyConfigured(key = getOpenAIApiKey()): boolean {
  return Boolean(key) && key !== OPENAI_DUMMY_KEY;
}

export const OPENAI_KEY_MISSING_PAYLOAD = {
  error: 'OPENAI_KEY_MISSING',
  message:
    'OpenAI API Key is not configured in environment variables. Please check Vercel settings and redeploy.',
} as const;

export type ChatCompletionParams = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
};

type HttpError = Error & { status?: number; code?: string };

async function openaiFetch(path: string, apiKey: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`https://api.openai.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err: HttpError = new Error(body || `OpenAI ${res.status}`);
    err.status = res.status;
    err.code = String(res.status);
    throw err;
  }
  return res;
}

/** Lightweight OpenAI-compatible client (no eager SDK crash when the key is missing). */
export class OpenAI {
  readonly apiKey: string;

  constructor(opts: { apiKey: string; dangerouslyAllowBrowser?: boolean }) {
    this.apiKey = opts.apiKey || OPENAI_DUMMY_KEY;
  }

  chat = {
    completions: {
      create: async (params: ChatCompletionParams) => {
        const res = await openaiFetch('/chat/completions', this.apiKey, {
          method: 'POST',
          body: JSON.stringify(params),
        });
        return res.json() as Promise<{
          choices: Array<{ message?: { content?: string | null } }>;
        }>;
      },
    },
  };

  models = {
    list: async () => {
      const res = await openaiFetch('/models', this.apiKey);
      return res.json() as Promise<{ data: unknown[] }>;
    },
  };
}

export function createOpenAIClient(apiKey?: string): OpenAI {
  return new OpenAI({
    apiKey: apiKey || getOpenAIApiKey() || OPENAI_DUMMY_KEY,
    dangerouslyAllowBrowser: true,
  });
}

export const openai = new OpenAI({
  apiKey: getOpenAIApiKey() || OPENAI_DUMMY_KEY,
  dangerouslyAllowBrowser: true,
});
