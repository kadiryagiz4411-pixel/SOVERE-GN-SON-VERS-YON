/**
 * Live viewport observer. Never reuses a previous job node or scraped
 * text. Every scroll/click/tab-switch re-queries the screen-center DOM.
 * Auto-Fill never submits the form.
 *
 * HOST-PAGE ISOLATION:
 *   Chrome MV3 content scripts run in an ISOLATED world — host-page JS cannot
 *   reach our variables. However, uncaught errors from Upwork's dash-api.min.js
 *   (WebSocket disconnects) and Nuxt hydration mismatches still fire 'error' and
 *   'unhandledrejection' events on the shared window object, which can appear in
 *   the DevTools console in a way that looks like extension errors. We suppress
 *   known host-page error patterns here so developers get a clean console.
 *
 *   We NEVER call event.preventDefault() on unknown errors — only on errors
 *   that are definitively identified as Upwork/Nuxt/GTranslate noise.
 */
(function installHostPageNoiseSuppressor() {
  // Patterns that identify Upwork host-page noise — NOT extension errors.
  const NOISE_SOURCES = [
    'dash-api.min.js',        // Upwork WebSocket client
    'dash-api.js',
    'analytics.min.js',       // Upwork analytics
    '__nuxt',                 // Nuxt hydration artifacts in error messages
    'hydration',              // "Hydration mismatch"
    'google_translate_element', // Google Translate JS
    'translate.google.com',
    'translate.googleapis.com',
    'content.js',             // suppress our own content.js errors from appearing as page errors
  ];

  const isKnownNoise = (src) => {
    if (!src) return false;
    const s = String(src);
    return NOISE_SOURCES.some((pattern) => s.includes(pattern));
  };

  window.addEventListener('error', (ev) => {
    // Only suppress if definitively from a known Upwork/Nuxt/GTranslate script.
    if (isKnownNoise(ev?.filename) || isKnownNoise(ev?.message)) {
      ev.stopImmediatePropagation();
      // Do NOT ev.preventDefault() — let the browser still mark the page as
      // having had an error (DevTools Network/Sources tabs still show it).
    }
  }, true); // capture phase so we run before any page listener

  window.addEventListener('unhandledrejection', (ev) => {
    const reason = String(ev?.reason?.stack || ev?.reason?.message || ev?.reason || '');
    if (isKnownNoise(reason) || isKnownNoise(ev?.reason?.fileName)) {
      ev.stopImmediatePropagation();
    }
  }, true);
})();

const isTopFrame = window === window.top;
const SCROLL_DEBOUNCE_MS = 70;
const MUTATION_DEBOUNCE_MS = 120;
const CLICK_DEBOUNCE_MS = 40;

// Nuxt hydration guard: when Upwork's Nuxt SSR is replacing the DOM, a burst
// of hundreds of MutationObserver callbacks fires in < 100ms. We track the
// burst rate and suspend scraping until the DOM settles.
let mutationBurstCount = 0;
let mutationBurstTimer = 0;
let nuxtHydrating = false;

function recordMutationBurst() {
  mutationBurstCount += 1;
  clearTimeout(mutationBurstTimer);
  // If > 30 mutations fired in a single animation frame, treat as hydration burst.
  nuxtHydrating = mutationBurstCount > 30;
  mutationBurstTimer = setTimeout(() => {
    mutationBurstCount = 0;
    nuxtHydrating = false;
  }, 400); // DOM is considered settled after 400ms of quiet
}

let evaluateTimer = 0;
let scanTimer = 0;
let observeTimer = 0;
let viewportObserver = null;
let mutationObserver = null;
let watchingViewport = false;
let lastPublishedHash = '';

function markSovereignHost() {
  try {
    const version = typeof EXTENSION_VERSION !== 'undefined' ? EXTENSION_VERSION : '1.6.8';
    document.documentElement.setAttribute('data-sovereign-extension', version);
    window.postMessage({ type: 'SOVEREIGN_EXTENSION_READY', version }, '*');
  } catch {
    // Page may be restricted.
  }
}

function captureSovereignSession() {
  try {
    const host = String(location.hostname || '');
    if (!/(^|\.)sovereignapp\.pro$/i.test(host)) return;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('sb-') || !key.includes('auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const accessToken = parsed?.access_token || parsed?.currentSession?.access_token || '';
      const email = parsed?.user?.email
        || parsed?.currentSession?.user?.email
        || parsed?.user?.user_metadata?.email
        || '';
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
  } catch {
    // Ignore locked storage.
  }
}

function candidateSelectors() {
  const drawers = typeof SOVEREIGN_DRAWER_SELECTORS !== 'undefined' ? SOVEREIGN_DRAWER_SELECTORS : [];
  const details = typeof SOVEREIGN_DETAIL_SELECTORS !== 'undefined' ? SOVEREIGN_DETAIL_SELECTORS : [];
  const cards = typeof SOVEREIGN_CARD_SELECTORS !== 'undefined' ? SOVEREIGN_CARD_SELECTORS : [];
  const cvs = typeof SOVEREIGN_CV_SELECTORS !== 'undefined' ? SOVEREIGN_CV_SELECTORS : [];
  const mains = typeof SOVEREIGN_MAIN_SELECTORS !== 'undefined' ? SOVEREIGN_MAIN_SELECTORS : [];
  return drawers.concat(details).concat(cards).concat(cvs).concat(mains).concat([
    '[data-job-id]',
    '[data-jk]',
    'a[href*="/jobs/"]',
    'a[href*="/job/"]',
  ]);
}

function invalidateViewportState() {
  if (typeof clearSovereignMarks === 'function') clearSovereignMarks();
}

function scrapeFresh(force) {
  invalidateViewportState();
  if (typeof extractActiveJob === 'function') {
    return extractActiveJob({ force: Boolean(force), bypassFilters: Boolean(force) });
  }
  return null;
}

function postRuntime(payload) {
  try {
    chrome.runtime.sendMessage(payload, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    // Side panel or worker may be closed.
  }
}

function notifyScanning() {
  if (!isTopFrame) return;
  clearTimeout(scanTimer);
  scanTimer = setTimeout(() => {
    postRuntime({ type: 'VIEWPORT_SCANNING', at: Date.now() });
  }, 60);
}

function classifyPayload(data) {
  if (data?.contentType || data?.discarded) {
    return {
      contentType: data.contentType || '',
      kind: data.kind || 'job',
      discarded: Boolean(data.discarded),
      reason: data.discardReason || data.reason || '',
    };
  }
  if (typeof classifyScrapedContent === 'function') {
    return classifyScrapedContent(data?.pageUrl, data?.jobTitle, data?.pageText, data?.isolated);
  }
  return { contentType: 'JOB_POSTING', kind: data?.kind || 'job', discarded: false };
}

function publishTarget(data, force) {
  if (!isTopFrame || !data) return;
  const classified = classifyPayload(data);
  if (classified.discarded) {
    if (lastPublishedHash === `discard:${classified.reason || classified.contentType}`) return;
    lastPublishedHash = `discard:${classified.reason || classified.contentType}`;
    postRuntime({
      type: 'JOB_TARGET_CHANGED',
      data: {
        discarded: true,
        flushed: true,
        contentType: classified.contentType || '',
        discardReason: classified.reason || 'chrome',
        kind: classified.reason === 'chrome' || classified.reason === 'no-center-card' ? 'job' : 'list',
        hash: lastPublishedHash,
        scannedAt: Date.now(),
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
    kind: classified.kind,
    contentType: classified.contentType || data.contentType || 'JOB_POSTING',
    discarded: false,
    scannedAt: Date.now(),
    autoAnalyze: true,
  };
  postRuntime({ type: 'JOB_TARGET_CHANGED', data: payload });
  postRuntime({ type: 'VIEWPORT_FOCUS', data: payload });
}

function evaluateViewport(force) {
  // Skip evaluation during Nuxt hydration bursts — the DOM is transitional
  // and would produce empty or mismatched results. Force-scans always proceed.
  if (nuxtHydrating && !force) return;
  const data = scrapeFresh(force);
  publishTarget(data, force);
}

function scheduleEvaluate(delay, force) {
  clearTimeout(evaluateTimer);
  // Extend the delay during hydration to let the DOM settle first.
  const effective = (nuxtHydrating && !force) ? Math.max(delay, 600) : delay;
  evaluateTimer = setTimeout(() => evaluateViewport(Boolean(force)), effective);
}

function onJobInteraction(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const selectors = candidateSelectors();
  const card = selectors.length ? target.closest(selectors.join(',')) : target.closest('a, article, li, section');
  if (!card) return;
  lastPublishedHash = '';
  invalidateViewportState();
  notifyScanning();
  scheduleEvaluate(CLICK_DEBOUNCE_MS, true);
  setTimeout(() => evaluateViewport(true), 160);
}

function observeCandidates() {
  if (!viewportObserver) return;
  candidateSelectors().forEach((selector) => {
    try {
      document.querySelectorAll(selector).forEach((el) => viewportObserver.observe(el));
    } catch {
      // skip
    }
  });
}

function startViewportWatch() {
  if (watchingViewport || !isTopFrame) return;
  watchingViewport = true;
  document.addEventListener('click', onJobInteraction, true);
  document.addEventListener('keyup', onJobInteraction, true);
  const onMove = () => {
    invalidateViewportState();
    notifyScanning();
    scheduleEvaluate(SCROLL_DEBOUNCE_MS, false);
  };
  window.addEventListener('scroll', onMove, { passive: true, capture: true });
  window.addEventListener('wheel', onMove, { passive: true, capture: true });
  window.addEventListener('resize', onMove, { passive: true });
  window.addEventListener('hashchange', () => {
    lastPublishedHash = '';
    invalidateViewportState();
    scheduleEvaluate(CLICK_DEBOUNCE_MS, true);
  });
  window.addEventListener('popstate', () => {
    lastPublishedHash = '';
    invalidateViewportState();
    scheduleEvaluate(CLICK_DEBOUNCE_MS, true);
  });
  document.addEventListener('visibilitychange', () => {
    lastPublishedHash = '';
    invalidateViewportState();
    if (document.visibilityState !== 'visible') return;
    scheduleEvaluate(CLICK_DEBOUNCE_MS, true);
  });
  window.addEventListener('pageshow', () => {
    lastPublishedHash = '';
    invalidateViewportState();
    scheduleEvaluate(CLICK_DEBOUNCE_MS, true);
  });

  viewportObserver = new IntersectionObserver(() => {
    notifyScanning();
    scheduleEvaluate(SCROLL_DEBOUNCE_MS, false);
  }, {
    threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
    rootMargin: '-6% 0px -10% 0px',
  });
  observeCandidates();

  mutationObserver = new MutationObserver((mutationsList) => {
    // Track mutation burst rate to detect Nuxt hydration.
    recordMutationBurst();
    clearTimeout(observeTimer);
    observeTimer = setTimeout(observeCandidates, 800);
    // Filter to only attribute/childList mutations relevant to job cards —
    // ignore Google Translate <font> insertions and script/style changes.
    const relevant = mutationsList.some((m) => {
      if (m.type === 'attributes') {
        const target = m.target;
        // Ignore Google Translate class additions on <html> (class="translated-*")
        if (target === document.documentElement || target === document.body) return false;
        return true;
      }
      // For childList: skip if all added/removed nodes are script, style, or font
      const allNoise = [...m.addedNodes, ...m.removedNodes].every((n) => {
        const tag = n.nodeName?.toLowerCase?.() ?? '';
        return tag === 'script' || tag === 'style' || tag === 'font'
          || (n instanceof Element && (
            n.matches?.('#goog-gt-tt, [class*="goog-te-"], .skiptranslate') ?? false
          ));
      });
      return !allNoise;
    });
    if (relevant) scheduleEvaluate(MUTATION_DEBOUNCE_MS, false);
  });
  mutationObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-job-id', 'data-test', 'aria-expanded'] });
  notifyScanning();
  scheduleEvaluate(CLICK_DEBOUNCE_MS, true);
}

markSovereignHost();
captureSovereignSession();
startViewportWatch();
if (/(^|\.)sovereignapp\.pro$/i.test(String(location.hostname || ''))) {
  window.addEventListener('focus', captureSovereignSession);
  window.addEventListener('storage', captureSovereignSession);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') captureSovereignSession();
  });
  setInterval(captureSovereignSession, 15000);
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request?.type === 'SCRAPE_PAGE' || request?.type === 'RESCAN_PAGE' || request?.type === 'SCAN_ACTIVE_SCREEN' || request?.type === 'FLUSH_VIEWPORT') {
    try {
      // For any forced/flush scan, wipe the hash cache so publishTarget's
      // dedup guard never short-circuits on a matching hash from the old page.
      if (request.type !== 'SCRAPE_PAGE') lastPublishedHash = '';
      const force = request.type !== 'SCRAPE_PAGE';
      const data = scrapeFresh(force);
      publishTarget(data, true);
      sendResponse({ success: Boolean(data?.pageText), data });
    } catch (err) {
      sendResponse({ success: false, error: err?.message || String(err) });
    }
    return true;
  }
  if (request?.type !== 'INJECT_PROPOSAL') return false;
  const run = typeof injectProposalToDOM === 'function'
    ? injectProposalToDOM
    : (typeof sovereignInjectProposal === 'function' ? sovereignInjectProposal : null);
  if (!run) {
    sendResponse({ success: false, error: 'Auto-Fill is not loaded. Reload the extension.' });
    return true;
  }
  Promise.resolve(run(request.proposalText || ''))
    .then((ok) => sendResponse({ success: Boolean(ok) }))
    .catch((err) => sendResponse({ success: false, error: err?.message || String(err) }));
  return true;
});
