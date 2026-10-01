/**
 * AI Servis Başlatıcı — tek kaynak OpenAI anahtar çözümlemesi.
 *
 * 1) Kullanıcı BYOK
 * 2) Vercel / Vite VITE_OPENAI_API_KEY
 * 3) Yoksa throw yok — boş string + uyarı (UI toast çağıran tarafta)
 */

export const BYOK_STORAGE_KEY = 'sovereign_byok_key';

export const AI_NOT_CONFIGURED_MESSAGE =
  "Lütfen Ayarlar'dan API Anahtarınızı girin";

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

function readViteSystemKey(): string {
  try {
    const vite = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
    if (isUsableKey(vite)) return String(vite).trim();
  } catch { /* ignore */ }
  try {
    const nodeKey = typeof process !== 'undefined' ? process.env?.VITE_OPENAI_API_KEY : undefined;
    if (isUsableKey(nodeKey)) return String(nodeKey).trim();
  } catch { /* ignore */ }
  return '';
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
    err.message.includes("API Anahtarınızı")
  );
}
