import { env } from './env.js';

export const OPENAI_DUMMY_KEY = 'dummy-key-to-prevent-crash';

export const AI_BUSY_MESSAGE =
  'AI engine is currently updating. Please try again in a few moments.';

export const OPENAI_KEY_MISSING_PAYLOAD = {
  error: 'AI_BUSY',
  message: AI_BUSY_MESSAGE,
} as const;

const KEY_ALIASES = [
  'OPENAI_API_KEY',
  'NEXT_PUBLIC_OPENAI_API_KEY',
  'VITE_OPENAI_API_KEY',
  'OPEN_AI_KEY',
  'OPEN_AI_API_KEY',
  'OPENAI_SECRET_KEY',
];

function cleanKey(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/^Bearer\s+/i, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
}

export function getOpenAIApiKey(): string {
  for (const alias of KEY_ALIASES) {
    const key = cleanKey(env(alias));
    if (key && key !== OPENAI_DUMMY_KEY && key.length > 10) return key;
  }
  return '';
}

export function isOpenAIApiKeyConfigured(key = getOpenAIApiKey()): boolean {
  return Boolean(key) && key !== OPENAI_DUMMY_KEY && key.length > 10;
}

export function getOpenAIClient(): { apiKey: string } {
  const apiKey = getOpenAIApiKey();
  if (!isOpenAIApiKeyConfigured(apiKey)) {
    console.error('CRITICAL: OpenAI API Key could not be resolved from process.env runtime.');
    throw new Error(AI_BUSY_MESSAGE);
  }
  return { apiKey };
}
