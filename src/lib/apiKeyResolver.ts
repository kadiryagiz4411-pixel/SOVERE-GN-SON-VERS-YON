/**
 * apiKeyResolver.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Single source-of-truth for OpenAI API key resolution.
 * Kept in its own tiny module so both aiService.ts AND edgeFunctions.ts can
 * import it without creating a circular dependency.
 *
 * Priority order (as specified):
 *   a) VITE_OPENAI_API_KEY  — admin-configured env var (Vercel / .env)
 *   b) sovereign_byok_key   — user's personal BYOK key from localStorage
 */

export const BYOK_STORAGE_KEY = 'sovereign_byok_key';

const SK_PREFIX = 'sk-';

/**
 * Returns the best available OpenAI API key, or an empty string when none
 * is configured.  Never throws.
 */
export function resolveOpenAIKey(): string {
  // a) Vercel / .env admin key (takes precedence so the shared key always works)
  try {
    const envKey = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) ?? '';
    if (envKey && envKey.startsWith(SK_PREFIX)) return envKey.trim();
  } catch {
    // import.meta may not be available in non-Vite contexts
  }

  // b) User's BYOK key stored in localStorage
  try {
    const byok = localStorage.getItem(BYOK_STORAGE_KEY);
    if (byok && byok.startsWith(SK_PREFIX)) return byok.trim();
  } catch {
    // localStorage unavailable (SSR / private-mode edge cases)
  }

  return '';
}

/**
 * Returns true when the user has stored a personal BYOK key in localStorage.
 * Used to show/hide the "BYOK ACTIVE" badge in the UI.
 */
export function hasByokKeyStored(): boolean {
  try {
    const k = localStorage.getItem(BYOK_STORAGE_KEY);
    return !!(k && k.startsWith(SK_PREFIX));
  } catch {
    return false;
  }
}
