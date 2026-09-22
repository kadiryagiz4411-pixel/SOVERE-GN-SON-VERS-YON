import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { APP_VERSION, VERSION_STORAGE_KEY, PRESERVED_KEYS } from "./config/version.ts";

// ── 1. Aggressive Service Worker Unregister ──────────────────────────────────
// Removes any stale Workbox / PWA service workers so cached assets from a
// previous build can never serve outdated JS/CSS.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().catch(() => {});
    }
  }).catch(() => {});
}

// ── 2. Version-based localStorage cache flush ────────────────────────────────
// If the stored version mismatches the current APP_VERSION, wipe all stale
// cached state (but preserve auth tokens and user-owned keys), then do a
// single hard reload so the app starts fresh.
try {
  const stored = localStorage.getItem(VERSION_STORAGE_KEY);
  if (stored !== APP_VERSION) {
    // Collect all keys to remove (everything except preserved ones).
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !PRESERVED_KEYS.has(k) && k !== VERSION_STORAGE_KEY) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => { try { localStorage.removeItem(k); } catch {} });
    localStorage.setItem(VERSION_STORAGE_KEY, APP_VERSION);

    // Only reload once — guard against infinite loops.
    if (stored !== null) {
      window.location.reload();
    }
  }
} catch {
  // localStorage unavailable (private mode / storage full) — silent no-op.
}

// ── Global DOM patch ────────────────────────────────────────────────────────
// Prevents React "removeChild / insertBefore" crashes caused by Google
// Translate and other browser extensions that mutate the DOM outside React's
// virtual tree. The patch simply no-ops on parent/child mismatches instead of
// throwing, so React's reconciler continues without a fatal error.
if (typeof window !== 'undefined') {
  const _removeChild = Node.prototype.removeChild;
  // @ts-expect-error – override generic signature with a safe guard
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      console.warn('[Sovereign DOM Patch] Prevented removeChild mismatch:', child);
      return child;
    }
    return _removeChild.apply(this, [child]) as T;
  };

  const _insertBefore = Node.prototype.insertBefore;
  // @ts-expect-error – override generic signature with a safe guard
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, refNode: Node | null): T {
    if (refNode && refNode.parentNode !== this) {
      console.warn('[Sovereign DOM Patch] Prevented insertBefore mismatch:', refNode);
      return newNode;
    }
    return _insertBefore.apply(this, [newNode, refNode]) as T;
  };
}

// Add pwa-standalone class for native-feel CSS when running as installed app
if (
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true
) {
  document.documentElement.classList.add("pwa-standalone");
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
