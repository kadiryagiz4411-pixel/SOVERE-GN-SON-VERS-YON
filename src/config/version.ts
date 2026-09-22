/**
 * src/config/version.ts
 * ──────────────────────────────────────────────────────────────────────────
 * Single source of truth for the app version.
 *
 * Bump APP_VERSION whenever a breaking localStorage schema change is shipped.
 * On the next page load the startup routine in main.tsx will detect the
 * mismatch, wipe stale cached state (while preserving auth), and perform a
 * one-time hard reload so users get a clean slate.
 */

export const APP_VERSION = '2.1.0';
export const VERSION_STORAGE_KEY = 'sovereign_app_version';

/**
 * Keys that must NEVER be wiped during a version-bump cache flush.
 * Add any additional auth / session keys here.
 */
export const PRESERVED_KEYS: ReadonlySet<string> = new Set([
  'sb-access-token',
  'sb-refresh-token',
  'supabase.auth.token',
  // Sovereign per-user settings that should survive version bumps
  'sovereign_byok_key',
]);
