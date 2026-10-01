/**
 * AI Servis Başlatıcı — tek kaynak OpenAI anahtar çözümlemesi.
 * Vite/Vercel istemcisi ve (forward edilen) Supabase Edge Function gövdesi
 * aynı öncelik sırasını kullanır.
 *
 * 1) Kullanıcı BYOK (Bring Your Own Key)
 * 2) Vercel / Vite VITE_OPENAI_API_KEY
 * 3) Yoksa sessiz çökme yok — net AI_NOT_CONFIGURED hatası
 */

export const BYOK_STORAGE_KEY = 'sovereign_byok_key';

const SK_PREFIX = 'sk-';

export const AI_NOT_CONFIGURED_MESSAGE =
  "AI_NOT_CONFIGURED: Lütfen sistem VITE_OPENAI_API_KEY değişkenini kontrol edin veya Ayarlar'dan kendi OpenAI API anahtarınızı girin.";

function isSkKey(value: unknown): value is string {
  return typeof value === 'string' && value.trim().startsWith(SK_PREFIX);
}

function readStoredByok(): string {
  try {
    const byok = localStorage.getItem(BYOK_STORAGE_KEY);
    return isSkKey(byok) ? byok.trim() : '';
  } catch {
    return '';
  }
}

function readViteSystemKey(): string {
  try {
    const systemKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
    return isSkKey(systemKey) ? String(systemKey).trim() : '';
  } catch {
    return '';
  }
}

/**
 * Kök çözümleyici. Geçerli bir anahtar yoksa throw eder.
 */
export const getOpenAIApiKey = (userCustomKey?: string | null): string => {
  // 1. Öncelik: Kullanıcının BYOK ile girdiği kendi anahtarı
  if (isSkKey(userCustomKey)) {
    return userCustomKey.trim();
  }
  const storedByok = readStoredByok();
  if (storedByok) return storedByok;

  // 2. Öncelik: Vercel ortam değişkenlerindeki sistem anahtarı
  const systemKey = readViteSystemKey();
  if (systemKey) return systemKey;

  // 3. Hiçbiri yoksa sessiz çökme yerine net hata
  throw new Error(AI_NOT_CONFIGURED_MESSAGE);
};

/**
 * Throw etmeyen sarmalayıcı — UI “anahtar var mı?” kontrolleri için.
 */
export function resolveOpenAIKey(userCustomKey?: string | null): string {
  try {
    return getOpenAIApiKey(userCustomKey);
  } catch {
    return '';
  }
}

export function hasByokKeyStored(): boolean {
  return !!readStoredByok();
}

export function isAiNotConfiguredError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith('AI_NOT_CONFIGURED');
}
