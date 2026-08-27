import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
