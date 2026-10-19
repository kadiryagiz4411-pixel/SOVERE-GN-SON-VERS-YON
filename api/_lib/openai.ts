import { firstEnv } from './env.js';

export const OPENAI_DUMMY_KEY = 'dummy-key-to-prevent-crash';

export const OPENAI_KEY_MISSING_PAYLOAD = {
  error: 'OPENAI_KEY_MISSING',
  message:
    'OPENAI_API_KEY is not configured in environment variables. Please check Vercel Settings -> Environment Variables.',
} as const;

const KEY_ALIASES = [
  'OPENAI_API_KEY',
  'VITE_OPENAI_API_KEY',
  'NEXT_PUBLIC_OPENAI_API_KEY',
  'OPENAI_SECRET_KEY',
  'OPEN_AI_API_KEY',
];

function cleanKey(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

function readRuntimeEnv(key: string): string {
  const fromFirst = cleanKey(firstEnv(key));
  if (fromFirst) return fromFirst;
  try {
    const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const fromProc = cleanKey(proc?.[key]);
    if (fromProc) return fromProc;
  } catch {
    /* ignore */
  }
  try {
    const deno = (globalThis as { Deno?: { env?: { get?: (name: string) => string | undefined } } }).Deno;
    const fromDeno = cleanKey(deno?.env?.get?.(key));
    if (fromDeno) return fromDeno;
  } catch {
    /* ignore */
  }
  return '';
}

export function getOpenAIApiKey(): string {
  for (const alias of KEY_ALIASES) {
    const key = readRuntimeEnv(alias);
    if (key && key !== OPENAI_DUMMY_KEY) return key;
  }
  return '';
}

export function isOpenAIApiKeyConfigured(key = getOpenAIApiKey()): boolean {
  return Boolean(key) && key !== OPENAI_DUMMY_KEY && key.length > 10;
}

export function getOpenAIClient(): { apiKey: string } {
  const apiKey = getOpenAIApiKey();
  if (!isOpenAIApiKeyConfigured(apiKey)) {
    console.warn(
      'OPENAI_API_KEY is missing. Checked OPENAI_API_KEY, VITE_OPENAI_API_KEY, and NEXT_PUBLIC_OPENAI_API_KEY.',
    );
    throw new Error(OPENAI_KEY_MISSING_PAYLOAD.message);
  }
  return { apiKey };
}
