/**
 * Sovereign Content Script — v1.7.7
 *
 * Live viewport observer. Never reuses a previous job node or scraped text.
 * Every scroll / click / tab-switch re-queries the screen-center DOM.
 * Auto-Fill never submits the form.
 *
 * ARCHITECTURE — HOST-PAGE ISOLATION
 * ─────────────────────────────────────────────────────────────────────────────
 * Chrome MV3 content scripts run in an ISOLATED WORLD: host-page JS variables
 * are unreachable.  However, uncaught exceptions from Upwork's dash-api.min.js
 * (WebSocket reconnects), Nuxt SSR hydration, and Google Translate DOM injections
 * still fire 'error' and 'unhandledrejection' events on the shared window object,
 * and can appear in the DevTools console as if they were extension errors.
 *
 * Three-layer isolation strategy (applied below):
 *   Layer 1 — installHostPageNoiseSuppressor()
 *             Capture-phase window.addEventListener('error') and
 *             ('unhandledrejection') that intercepts events whose source
 *             filename / message / stack matches known Upwork/Nuxt/GTranslate
 *             patterns. Only calls stopImmediatePropagation(), never preventDefault().
 *
 *   Layer 2 — installWebSocketMessageFilter()
 *             window.addEventListener('message') that silently drops
 *             postMessage events from host-page WebSocket clients
 *             (dash-api.min.js posts status frames to the page).
 *
 *   Layer 3 — safeCall() wrapper
 *             Every event listener, MutationObserver callback, IntersectionObserver
 *             callback, and scraping function is wrapped in a shared try/catch so
 *             a host-page DOM mutation racing our read never propagates a throw
 *             into the Chrome extension runtime.
 */

/* ── 0. safeCall: universal try/catch wrapper ─────────────────────────────── */

/**
 * Invoke fn() and silently absorb any exception it throws.
 * Returns `fallback` when an exception is caught (default: undefined).
 * This is the cornerstone of Layer 3 isolation.
 */
function safeCall(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

/* ── 1. Layer 1: Host-page error / rejection suppressor ──────────────────── */

(function installHostPageNoiseSuppressor() {
  // Patterns that identify Upwork host-page noise — NOT extension errors.
  // Match against: ev.filename, ev.message, rejection reason stack/message.
  const NOISE_PATTERNS = [
    // Upwork WebSocket / analytics client
    'dash-api.min.js',
    'dash-api.js',
    'analytics.min.js',
    'socket.io',
    'sockjs',
    'WebSocket',
    'ws://',
    'wss://',
    // Nuxt SSR artifacts
    '__nuxt',
    'hydration',
    '_nuxt/',
    'nuxt',
    // Google Translate
    'google_translate_element',
    'translate.google.com',
    'translate.googleapis.com',
    'goog-te-',
    'VIpgJd',
    // Generic browser-level noise
    'ResizeObserver loop',
    'Script error',          // cross-origin script errors (no useful info anyway)
    'NS_ERROR',              // Firefox XUL/XPCOM noise
    'AbortError',            // fetch() aborted by host page
    'NetworkError',          // service worker network failures from host page
    'Failed to fetch',       // idem
    'Load failed',           // Safari variant of the above
    'cancelled',             // idem
    'Extension context',     // extension own disconnection message (harmless)
  ];

  const isKnownNoise = (str) => {
    if (!str) return false;
    const s = String(str);
    return NOISE_PATTERNS.some((p) => s.includes(p));
  };

  // error events — synchronous exceptions and script-load failures
  window.addEventListener('error', (ev) => {
    if (
      isKnownNoise(ev?.filename) ||
      isKnownNoise(ev?.message) ||
      isKnownNoise(ev?.error?.stack) ||
      isKnownNoise(ev?.error?.message)
    ) {
      ev.stopImmediatePropagation();
      // Never call ev.preventDefault() — browser still logs to Sources tab.
    }
  }, /* capture */ true);

  // unhandledrejection — async/Promise failures from host-page code
  window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev?.reason;
    const str = String(reason?.stack || reason?.message || reason || '');
    if (isKnownNoise(str) || isKnownNoise(reason?.fileName)) {
      ev.stopImmediatePropagation();
    }
  }, /* capture */ true);
})();

/* ── 2. Layer 2: WebSocket postMessage filter ────────────────────────────── */

(function installWebSocketMessageFilter() {
  // Upwork's dash-api.min.js posts status frames to the page via postMessage.
  // We intercept them in capture phase and stop propagation so they never
  // reach any extension listener.  We only drop messages that are clearly
  // from Upwork's internal WebSocket client — never touch messages that look
  // like they could be from a Sovereign component.
  const WS_TYPE_PATTERNS = [
    'WS_',            // "WS_CONNECTED", "WS_DISCONNECTED", etc.
    'socket',
    'SOCKET',
    'websocket',
    'heartbeat',
    'ping',
    'pong',
    '__nuxt',
    'nuxt-hydration',
    'hydration-mismatch',
  ];

  const isUpworkFrame = (data) => {
    if (!data || typeof data !== 'object') return false;
    // Sovereign messages always start with SOVEREIGN_
    const t = String(data.type || data.name || '');
    if (t.startsWith('SOVEREIGN_')) return false;
    return WS_TYPE_PATTERNS.some((p) => t.includes(p));
  };

  window.addEventListener('message', (ev) => {
    try {
      if (isUpworkFrame(ev.data)) {
        ev.stopImmediatePropagation();
        // Never preventDefault() — we only suppress, not cancel.
      }
    } catch {
      // ignore any ev.data parse error
    }
  }, /* capture */ true);
})();

/* ── 3. Constants & shared state ─────────────────────────────────────────── */

const isTopFrame = window === window.top;
const SCROLL_DEBOUNCE_MS   = 70;
const MUTATION_DEBOUNCE_MS = 120;
const CLICK_DEBOUNCE_MS    = 40;

// Nuxt hydration burst guard.
// When Upwork's SSR replaces the DOM, hundreds of MutationObserver callbacks
// fire in < 100ms. We track the burst rate and suspend scraping until settled.
let mutationBurstCount = 0;
let mutationBurstTimer = 0;
let nuxtHydrating      = false;

function recordMutationBurst() {
  mutationBurstCount += 1;
  clearTimeout(mutationBurstTimer);
  nuxtHydrating = mutationBurstCount > 30;
  mutationBurstTimer = setTimeout(() => {
    mutationBurstCount = 0;
    nuxtHydrating      = false;
  }, 400);
}

let evaluateTimer     = 0;
let scanTimer         = 0;
let observeTimer      = 0;
let viewportObserver  = null;
let mutationObserver  = null;
let watchingViewport  = false;
let lastPublishedHash = '';

/* ── 4. Utility functions ────────────────────────────────────────────────── */

function markSovereignHost() {
  safeCall(() => {
    const version = typeof EXTENSION_VERSION !== 'undefined' ? EXTENSION_VERSION : '1.7.7';
    document.documentElement.setAttribute('data-sovereign-extension', version);
    window.postMessage({ type: 'SOVEREIGN_EXTENSION_READY', version }, '*');
  });
}

function captureSovereignSession() {
  safeCall(() => {
    const host = String(location.hostname || '');
    if (!/(^|\.)sovereignapp\.pro$/i.test(host)) return;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('sb-') || !key.includes('auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const accessToken =
        parsed?.access_token ||
        parsed?.currentSession?.access_token ||
        '';
      const email =
        parsed?.user?.email ||
        parsed?.currentSession?.user?.email ||
        parsed?.user?.user_metadata?.email ||
        '';
      if (!accessToken) continue;
      chrome.storage.local.set({
        'sovereign.session.v1': { accessToken, email, at: Date.now() },
      });
      try {
        chrome.runtime.sendMessage({ type: 'SYNC_SESSION', accessToken, email });
      } catch {
        /* background may be asleep */
      }
      break;
    }
  });
}

function candidateSelectors() {
  return safeCall(() => {
    const drawers  = typeof SOVEREIGN_DRAWER_SELECTORS !== 'undefined' ? SOVEREIGN_DRAWER_SELECTORS : [];
    const details  = typeof SOVEREIGN_DETAIL_SELECTORS !== 'undefined' ? SOVEREIGN_DETAIL_SELECTORS : [];
    const cards    = typeof SOVEREIGN_CARD_SELECTORS   !== 'undefined' ? SOVEREIGN_CARD_SELECTORS   : [];
    const cvs      = typeof SOVEREIGN_CV_SELECTORS     !== 'undefined' ? SOVEREIGN_CV_SELECTORS     : [];
    const mains    = typeof SOVEREIGN_MAIN_SELECTORS   !== 'undefined' ? SOVEREIGN_MAIN_SELECTORS   : [];
    return drawers.concat(details).concat(cards).concat(cvs).concat(mains).concat([
      '[data-job-id]',
      '[data-jk]',
      'a[href*="/jobs/"]',
      'a[href*="/job/"]',
    ]);
  }, []);
}

function invalidateViewportState() {
  safeCall(() => {
    if (typeof clearSovereignMarks === 'function') clearSovereignMarks();
  });
}

/* ── 5. Scraping pipeline — all wrapped in safeCall ─────────────────────── */

function scrapeFresh(force) {
  return safeCall(() => {
    invalidateViewportState();
    if (typeof extractActiveJob === 'function') {
      return extractActiveJob({ force: Boolean(force), bypassFilters: Boolean(force) });
    }
    return null;
  }, null);
}

function postRuntime(payload) {
  safeCall(() => {
    chrome.runtime.sendMessage(payload, () => {
      void chrome.runtime.lastError;
    });
  });
}

function notifyScanning() {
  if (!isTopFrame) return;
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    safeCall(() => postRuntime({ type: 'VIEWPORT_SCANNING', at: Date.now() }));
  }, 60);
}

function classifyPayload(data) {
  return safeCall(() => {
    if (data?.contentType || data?.discarded) {
      return {
        contentType: data.contentType || '',
        kind:        data.kind || 'job',
        discarded:   Boolean(data.discarded),
        reason:      data.discardReason || data.reason || '',
      };
    }
    if (typeof classifyScrapedContent === 'function') {
      return classifyScrapedContent(data?.pageUrl, data?.jobTitle, data?.pageText, data?.isolated);
    }
    return { contentType: 'JOB_POSTING', kind: data?.kind || 'job', discarded: false };
  }, { contentType: 'JOB_POSTING', kind: 'job', discarded: false });
}

function publishTarget(data, force) {
  safeCall(() => {
    if (!isTopFrame || !data) return;
    const classified = classifyPayload(data);
    if (classified.discarded) {
      const dedupKey = `discard:${classified.reason || classified.contentType}`;
      if (lastPublishedHash === dedupKey) return;
      lastPublishedHash = dedupKey;
      postRuntime({
        type: 'JOB_TARGET_CHANGED',
        data: {
          discarded:     true,
          flushed:       true,
          contentType:   classified.contentType || '',
          discardReason: classified.reason || 'chrome',
          kind:          (classified.reason === 'chrome' || classified.reason === 'no-center-card') ? 'job' : 'list',
          hash:          dedupKey,
          scannedAt:     Date.now(),
        },
      });
      return;
    }
    if (!data.pageText && !data.jobDescription) return;
    const hash = data.hash || data.signature
      || (typeof hashScrapedText === 'function' ? hashScrapedText(data.pageText) : `${Date.now()}`);
    if (!force && hash && hash === lastPublishedHash) return;
    lastPublishedHash = hash;
    const payload = {
      ...data,
      hash,
      kind:        classified.kind,
      contentType: classified.contentType || data.contentType || 'JOB_POSTING',
      discarded:   false,
      scannedAt:   Date.now(),
      autoAnalyze: true,
    };
    postRuntime({ type: 'JOB_TARGET_CHANGED', data: payload });
    postRuntime({ type: 'VIEWPORT_FOCUS',     data: payload });
  });
}

/**
 * Core evaluation function.
 * Only runs when:
 *   a) force=true  (explicit user action: Scan Active Screen, click, hashchange)
 *   b) force=false AND not during a Nuxt hydration burst
 *
 * WebSocket events from dash-api.min.js do NOT call this function — the Layer 2
 * postMessage filter drops those frames before they can reach any listener.
 */
function evaluateViewport(force) {
  safeCall(() => {
    if (nuxtHydrating && !force) return;
    const data = scrapeFresh(force);
    publishTarget(data, force);
  });
}

function scheduleEvaluate(delay, force) {
  clearTimeout(evaluateTimer);
  const effective = (nuxtHydrating && !force) ? Math.max(delay, 600) : delay;
  evaluateTimer = setTimeout(() => safeCall(() => evaluateViewport(Boolean(force))), effective);
}

/* ── 6. DOM event handlers ──────────────────────────────────────────────── */

/**
 * Handles user click/keyup on a job card element.
 * Triggers a forced immediate scrape — this IS an explicit user interaction.
 * All DOM access is inside safeCall so a Nuxt-replaced node never throws.
 */
function onJobInteraction(event) {
  safeCall(() => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const selectors = candidateSelectors();
    const card = selectors.length
      ? target.closest(selectors.join(','))
      : target.closest('a, article, li, section');
    if (!card) return;
    lastPublishedHash = '';
    invalidateViewportState();
    notifyScanning();
    scheduleEvaluate(CLICK_DEBOUNCE_MS, true);
    setTimeout(() => safeCall(() => evaluateViewport(true)), 160);
  });
}

function observeCandidates() {
  if (!viewportObserver) return;
  safeCall(() => {
    candidateSelectors().forEach((selector) => {
      safeCall(() => {
        document.querySelectorAll(selector).forEach((el) => viewportObserver.observe(el));
      });
    });
  });
}

/* ── 7. startViewportWatch — all listeners wrapped ───────────────────────── */

function startViewportWatch() {
  if (watchingViewport || !isTopFrame) return;
  watchingViewport = true;

  // Click / keyup — explicit user interactions (force=true)
  document.addEventListener('click',  onJobInteraction, true);
  document.addEventListener('keyup',  onJobInteraction, true);

  // Scroll / wheel / resize — passive viewport changes (force=false)
  const onMove = () => safeCall(() => {
    invalidateViewportState();
    notifyScanning();
    scheduleEvaluate(SCROLL_DEBOUNCE_MS, false);
  });
  window.addEventListener('scroll', onMove, { passive: true, capture: true });
  window.addEventListener('wheel',  onMove, { passive: true, capture: true });
  window.addEventListener('resize', onMove, { passive: true });

  // Navigation — treat as force (the URL / page changed)
  window.addEventListener('hashchange', () => safeCall(() => {
    lastPublishedHash = '';
    invalidateViewportState();
    scheduleEvaluate(CLICK_DEBOUNCE_MS, true);
  }));
  window.addEventListener('popstate', () => safeCall(() => {
    lastPublishedHash = '';
    invalidateViewportState();
    scheduleEvaluate(CLICK_DEBOUNCE_MS, true);
  }));

  document.addEventListener('visibilitychange', () => safeCall(() => {
    lastPublishedHash = '';
    invalidateViewportState();
    if (document.visibilityState !== 'visible') return;
    scheduleEvaluate(CLICK_DEBOUNCE_MS, true);
  }));
  window.addEventListener('pageshow', () => safeCall(() => {
    lastPublishedHash = '';
    invalidateViewportState();
    scheduleEvaluate(CLICK_DEBOUNCE_MS, true);
  }));

  // IntersectionObserver — job cards entering / leaving the viewport
  viewportObserver = new IntersectionObserver(() => {
    safeCall(() => {
      notifyScanning();
      scheduleEvaluate(SCROLL_DEBOUNCE_MS, false);
    });
  }, {
    threshold:  [0, 0.2, 0.4, 0.6, 0.8, 1],
    rootMargin: '-6% 0px -10% 0px',
  });
  observeCandidates();

  // MutationObserver — DOM content changes (NOT WebSocket events)
  // WebSocket postMessage events are dropped by Layer 2 before they ever
  // reach here, so this callback only fires for genuine DOM mutations.
  mutationObserver = new MutationObserver((mutationsList) => {
    safeCall(() => {
      recordMutationBurst();
      clearTimeout(observeTimer);
      observeTimer = setTimeout(observeCandidates, 800);

      // Ignore mutations that are entirely translation/script/style artifacts.
      const relevant = mutationsList.some((m) => {
        if (m.type === 'attributes') {
          const t = m.target;
          // Skip class/lang changes on <html> and <body> (Google Translate does this)
          if (t === document.documentElement || t === document.body) return false;
          return true;
        }
        // childList: skip if ALL added/removed nodes are noise
        const allNoise = [...m.addedNodes, ...m.removedNodes].every((n) => {
          const tag = (n.nodeName || '').toLowerCase();
          if (tag === 'script' || tag === 'style' || tag === 'font' || tag === 'noscript') return true;
          if (n instanceof Element) {
            if (n.matches?.('#goog-gt-tt, [class*="goog-te-"], .skiptranslate, .goog-text-highlight')) return true;
            if (n.matches?.('[data-fetch-key], [nuxt-hydration]')) return true;
          }
          return false;
        });
        return !allNoise;
      });

      if (relevant) scheduleEvaluate(MUTATION_DEBOUNCE_MS, false);
    });
  });

  mutationObserver.observe(document.documentElement, {
    childList:       true,
    subtree:         true,
    attributes:      true,
    attributeFilter: ['class', 'data-job-id', 'data-test', 'aria-expanded'],
  });

  notifyScanning();
  scheduleEvaluate(CLICK_DEBOUNCE_MS, true);
}

/* ── 8. Initialise ────────────────────────────────────────────────────────── */

markSovereignHost();
captureSovereignSession();
// Scans run only when the side panel sends SCAN_ACTIVE_SCREEN. Do not watch
// scroll, mutations, or navigation — those were starting "Scanning..." on their own.

window.addEventListener('hashchange', () => { lastPublishedHash = ''; });
window.addEventListener('popstate', () => { lastPublishedHash = ''; });

if (/(^|\.)sovereignapp\.pro$/i.test(String(location.hostname || ''))) {
  window.addEventListener('focus',   captureSovereignSession);
  window.addEventListener('storage', captureSovereignSession);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') captureSovereignSession();
  });
  setInterval(captureSovereignSession, 15000);
}

/* ── 8b. Rankings flyout: paints LEFT of the Chrome side panel on the page ─ */

const SOVEREIGN_FLYOUT_HOST = 'sovereign-rank-host';
const SOVEREIGN_FLYOUT_STYLE = `
  :host { all: initial; }
  .wrap { position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; font-family: Inter, "Segoe UI", system-ui, sans-serif; }
  .backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.28); pointer-events: auto; opacity: 0; transition: opacity 180ms ease; }
  .panel {
    position: absolute; top: 12px; right: 12px; bottom: 12px;
    width: min(420px, calc(100vw - 24px));
    max-width: 46vw;
    background: #09090B; color: #f5f5f4;
    border: 1px solid rgba(212,175,55,.35);
    border-radius: 16px;
    box-shadow: -18px 0 48px rgba(0,0,0,.45);
    pointer-events: auto;
    display: flex; flex-direction: column;
    transform: translateX(110%);
    transition: transform 220ms ease;
    overflow: hidden;
  }
  .wrap.on .backdrop { opacity: 1; }
  .wrap.on .panel { transform: none; }
  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 14px 14px 10px; border-bottom: 1px solid rgba(212,175,55,.2); }
  header h2 { margin: 0; font-size: 16px; color: #E6C657; }
  header p { margin: 4px 0 0; font-size: 12px; color: #a8a29e; line-height: 1.4; }
  .x { width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(212,175,55,.2); background: transparent; color: #a8a29e; cursor: pointer; font-size: 16px; }
  .list { flex: 1; overflow: auto; padding: 12px; display: grid; gap: 10px; }
  .row { border: 1px solid rgba(212,175,55,.2); border-radius: 12px; padding: 12px; background: rgba(20,20,22,.85); }
  .top { display: flex; align-items: center; gap: 10px; }
  .score { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(#D4AF37 calc(var(--p,0)*1%), #27272a 0); flex-shrink: 0; }
  .score span { width: 38px; height: 38px; border-radius: 50%; background: #09090B; display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #E6C657; }
  .name { margin: 0; font-size: 14px; font-weight: 700; color: #f5f5f4; overflow-wrap: anywhere; }
  .meta { margin: 2px 0 0; font-size: 12px; color: #a8a29e; }
  .blurb { margin: 8px 0 0; font-size: 13px; line-height: 1.4; color: #e7e5e4; }
  .k { margin: 10px 0 4px; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #D4AF37; }
  .chips { font-size: 12px; line-height: 1.4; color: #d6d3d1; }
  .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
  .actions button { border: 0; border-radius: 10px; padding: 10px 8px; font-weight: 700; cursor: pointer; font-size: 12px; line-height: 1.25; }
  .proposal { background: linear-gradient(90deg,#D4AF37,#b8860b); color: #111; }
  .shortlist { background: #1e3a5f; color: #93c5fd; border: 1px solid rgba(59,130,246,.35); }
  .empty { padding: 24px 12px; text-align: center; color: #a8a29e; font-size: 13px; }
`;

function sovereignEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sovereignFlyoutHost() {
  let host = document.getElementById(SOVEREIGN_FLYOUT_HOST);
  if (host?.shadowRoot) return host;
  host?.remove();
  host = document.createElement('div');
  host.id = SOVEREIGN_FLYOUT_HOST;
  host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = SOVEREIGN_FLYOUT_STYLE;
  shadow.appendChild(style);
  const wrap = document.createElement('div');
  wrap.className = 'wrap';
  wrap.innerHTML = `
    <div class="backdrop" data-close="1"></div>
    <aside class="panel" role="dialog" aria-modal="true" aria-label="Candidate rankings">
      <header>
        <div>
          <h2>Candidate rankings</h2>
          <p class="job"></p>
        </div>
        <button class="x" type="button" data-close="1" aria-label="Close">✕</button>
      </header>
      <div class="list"></div>
    </aside>
  `;
  wrap.addEventListener('click', (event) => {
    const close = event.target.closest('[data-close]');
    if (close) {
      closeSovereignRankFlyout();
      return;
    }
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    if (!action || !id) return;
    try {
      chrome.runtime.sendMessage({ type: 'FLYOUT_ACTION', action, id }, () => void chrome.runtime.lastError);
    } catch (err) {
      console.warn('[sovereign] flyout action', err);
    }
    if (action === 'proposal') closeSovereignRankFlyout();
    if (action === 'shortlist') {
      btn.textContent = 'Shortlisted';
      btn.disabled = true;
    }
  });
  shadow.appendChild(wrap);
  (document.documentElement || document.body).appendChild(host);
  return host;
}

function openSovereignRankFlyout(payload) {
  const host = sovereignFlyoutHost();
  const root = host.shadowRoot;
  const wrap = root.querySelector('.wrap');
  const job = root.querySelector('.job');
  const list = root.querySelector('.list');
  const rows = Array.isArray(payload?.candidates) ? payload.candidates : [];
  if (job) {
    job.textContent = rows.length
      ? `${rows.length} ranked vs ${payload?.jobTitle || 'the active job brief'}`
      : 'Analyze CVs in Sovereign to fill this panel.';
  }
  if (list) {
    list.innerHTML = rows.length ? rows.map((row) => `
      <article class="row">
        <div class="top">
          <div class="score" style="--p:${Number(row.score) || 0}"><span>${sovereignEscape(String(row.score ?? '—'))}</span></div>
          <div>
            <p class="name">#${sovereignEscape(String(row.rank))} · ${sovereignEscape(row.name || 'Candidate')}</p>
            <p class="meta">Fit ${sovereignEscape(String(row.score))}/100</p>
          </div>
        </div>
        <p class="blurb">${sovereignEscape(row.summary || 'No summary yet.')}</p>
        <div class="k">Highlights</div>
        <div class="chips">${sovereignEscape((row.highlights || []).join(' · ') || 'None listed.')}</div>
        <div class="k">Skill gaps</div>
        <div class="chips">${sovereignEscape((row.gaps || []).join(' · ') || 'None listed.')}</div>
        <div class="actions">
          <button class="proposal" type="button" data-action="proposal" data-id="${sovereignEscape(row.id)}">Generate Tailored Proposal</button>
          <button class="shortlist" type="button" data-action="shortlist" data-id="${sovereignEscape(row.id)}" ${row.shortlisted ? 'disabled' : ''}>${row.shortlisted ? 'Shortlisted' : 'Shortlist Candidate'}</button>
        </div>
      </article>
    `).join('') : '<div class="empty">No scored candidates yet.</div>';
  }
  requestAnimationFrame(() => wrap?.classList.add('on'));
  return true;
}

function closeSovereignRankFlyout() {
  const host = document.getElementById(SOVEREIGN_FLYOUT_HOST);
  const wrap = host?.shadowRoot?.querySelector('.wrap');
  if (!wrap) {
    host?.remove();
    return;
  }
  wrap.classList.remove('on');
  window.setTimeout(() => {
    if (!wrap.classList.contains('on')) host.remove();
  }, 220);
}

/* ── 9. chrome.runtime.onMessage — explicit user-triggered actions only ──── */

/**
 * The message listener is the ONLY entry point for "Scan Active Screen" and
 * other explicit user actions.  Background WebSocket events from dash-api.min.js
 * are stopped at Layer 2 (postMessage filter) and never reach this listener.
 *
 * Every branch is wrapped in safeCall so a host-page DOM exception during
 * scraping cannot propagate an uncaught error into the Chrome runtime.
 */
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const type = request?.type;

  if (
    type === 'SCRAPE_PAGE'        ||
    type === 'RESCAN_PAGE'        ||
    type === 'SCAN_ACTIVE_SCREEN' ||
    type === 'FLUSH_VIEWPORT'
  ) {
    let replied = false;
    safeCall(() => {
      lastPublishedHash = '';
      invalidateViewportState();
      const data = scrapeFresh(true);
      publishTarget(data, true);
      replied = true;
      sendResponse({
        success: Boolean(data && (data.pageText || data.jobDescription || data.jobTitle)),
        data,
        scannedAt: Date.now(),
      });
    });
    if (!replied) {
      safeCall(() => sendResponse({ success: false, error: 'Could not read the active page.' }));
    }
    return true;
  }

  if (type === 'DETECT_PAGE_LANGUAGE') {
    safeCall(() => sendResponse({
      success: true,
      target_language: typeof detectPageLanguage === 'function' ? detectPageLanguage(document) : 'en',
    }));
    return true;
  }

  if (type === 'INJECT_PROPOSAL') {
    const run = typeof injectProposalToDOM === 'function'
      ? injectProposalToDOM
      : (typeof sovereignInjectProposal === 'function' ? sovereignInjectProposal : null);
    if (!run) {
      sendResponse({ success: false, error: 'Auto-Fill is not loaded. Reload the extension.' });
      return true;
    }
    Promise.resolve(safeCall(() => run(request.proposalText || '', request.extras || {}), false))
      .then((ok) => safeCall(() => sendResponse({ success: Boolean(ok) })))
      .catch((err) => safeCall(() => sendResponse({ success: false, error: err?.message || String(err) })));
    return true;
  }

  if (type === 'OPEN_RANKS_FLYOUT') {
    if (window.top !== window) return false;
    const ok = safeCall(() => openSovereignRankFlyout(request.payload || {}), false);
    sendResponse({ success: Boolean(ok) });
    return true;
  }

  if (type === 'CLOSE_RANKS_FLYOUT') {
    if (window.top !== window) return false;
    safeCall(() => closeSovereignRankFlyout());
    sendResponse({ success: true });
    return true;
  }

  return false;
});
