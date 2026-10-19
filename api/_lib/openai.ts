import { firstEnv } from './env.js';

export const OPENAI_DUMMY_KEY = 'dummy-key-to-prevent-crash';

export const OPENAI_KEY_MISSING_PAYLOAD = {
  error: 'OPENAI_KEY_MISSING',
  message:
    'OpenAI API Key is not configured in environment variables. Please check Vercel settings and redeploy.',
} as const;

export function getOpenAIApiKey(): string {
  const key =
    firstEnv('OPENAI_API_KEY', 'VITE_OPENAI_API_KEY', 'NEXT_PUBLIC_OPENAI_API_KEY') || '';

  if (!key) {
    console.error(
      'CRITICAL ERROR: OpenAI API Key is missing across all runtime environments (OPENAI_API_KEY, VITE_OPENAI_API_KEY, NEXT_PUBLIC_OPENAI_API_KEY).',
    );
  }

  return key;
}

export function isOpenAIApiKeyConfigured(key = getOpenAIApiKey()): boolean {
  return Boolean(key) && key !== OPENAI_DUMMY_KEY;
}
