import { PRESERVED_KEYS } from '@/config/version';
import { unlockBodyScroll } from '@/lib/unlockScroll';

const BOOT_EVENT = 'sovereign:boot-timeout';

/** Dispatched once when the global boot watchdog fires. */
export const BOOT_TIMEOUT_EVENT = BOOT_EVENT;

/** Hard cap for first paint. Auth/API/scripts must not block past this. */
export const BOOT_TIMEOUT_MS = 3000;

export function emitBootTimeout(): void {
  unlockBodyScroll();
  try {
    window.dispatchEvent(new Event(BOOT_EVENT));
  } catch {
    /* ignore */
  }
}

/**
 * Clears transient client state and reloads. Auth tokens are kept so the
 * user is not signed out by a recovery click.
 */
export function resetAppState(): void {
  unlockBodyScroll();
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }

  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (PRESERVED_KEYS.has(key) || key.startsWith('sb-')) continue;
      toRemove.push(key);
    }
    toRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
  } catch {
    /* ignore */
  }

  window.location.replace(`${window.location.pathname}${window.location.search}`);
}
