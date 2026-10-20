/**
 * AI Servis Başlatıcı — tek kaynak OpenAI anahtar çözümlemesi.
 *
 * 1) Kullanıcı BYOK
 * 2) Env aliases (OPENAI_API_KEY, VITE_OPENAI_API_KEY, NEXT_PUBLIC_OPENAI_API_KEY)
 * 3) Yoksa throw yok — boş string + uyarı (UI toast çağıran tarafta)
 */

export const BYOK_STORAGE_KEY = 'sovereign_byok_key';

function uiLanguage(): string {
  try {
    return localStorage.getItem('sovereign-language') || 'en';
  } catch {
    return 'en';
  }
}

export const AI_NOT_CONFIGURED_MESSAGE_EN =
  'OPENAI_API_KEY is not configured in Vercel Environment Variables. Add it for Production, or enter a key in Settings.';
export const AI_NOT_CONFIGURED_MESSAGE_TR =
  "OPENAI_API_KEY Vercel Production ortamında yok. Lütfen Vercel'e ekleyin veya Ayarlar'dan API anahtarınızı girin.";

export const AI_NOT_CONFIGURED_MESSAGE = AI_NOT_CONFIGURED_MESSAGE_EN;

export function aiNotConfiguredMessage(): string {
  return uiLanguage() === 'tr' ? AI_NOT_CONFIGURED_MESSAGE_TR : AI_NOT_CONFIGURED_MESSAGE_EN;
}

function isUsableKey(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 10;
}

function readStoredByok(): string {
  try {
    const byok = localStorage.getItem(BYOK_STORAGE_KEY);
    return isUsableKey(byok) ? byok.trim() : '';
  } catch {
    return '';
  }
}

function readEnvAlias(key: string): string {
  try {
    const meta = (import.meta.env as Record<string, string | undefined>)[key];
    if (isUsableKey(meta)) return String(meta).trim();
  } catch { /* ignore */ }
  try {
    const node = typeof process !== 'undefined' ? process.env?.[key] : undefined;
    if (isUsableKey(node)) return String(node).trim();
  } catch { /* ignore */ }
  return '';
}

function readViteSystemKey(): string {
  return (
    readEnvAlias('OPENAI_API_KEY') ||
    readEnvAlias('VITE_OPENAI_API_KEY') ||
    readEnvAlias('NEXT_PUBLIC_OPENAI_API_KEY') ||
    ''
  );
}

export const getActiveApiKey = (userCustomKey?: string | null): string => {
  if (isUsableKey(userCustomKey)) return userCustomKey.trim();
  const storedByok = readStoredByok();
  if (storedByok) return storedByok;
  const envKey = readViteSystemKey();
  if (envKey) return envKey;
  console.warn('No active OpenAI API key found in BYOK or VITE_OPENAI_API_KEY');
  return '';
};

/** @deprecated Use getActiveApiKey — never throws. */
export const getOpenAIApiKey = (userCustomKey?: string | null): string => getActiveApiKey(userCustomKey);

export function resolveOpenAIKey(userCustomKey?: string | null): string {
  return getActiveApiKey(userCustomKey);
}

export function hasByokKeyStored(): boolean {
  return !!readStoredByok();
}

export function isAiNotConfiguredError(err: unknown): boolean {
  return err instanceof Error && (
    err.message.startsWith('AI_NOT_CONFIGURED') ||
    err.message.startsWith('OPENAI_KEY_MISSING') ||
    err.message.includes("API Anahtarınızı") ||
    err.message.includes('OPENAI_API_KEY is not configured')
  );
}
