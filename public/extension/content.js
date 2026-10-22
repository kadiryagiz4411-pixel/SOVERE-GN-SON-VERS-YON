/**
 * Live viewport observer: isolates the single job or CV nearest the
 * center of the screen, then tells the side panel when that target changes.
 * Auto-Fill never submits the form.
 */

const ACTIVE_JOB_ATTR = 'data-sovereign-active-job';
const isTopFrame = window === window.top;

let markTimer = 0;
let scanTimer = 0;
let viewportObserver = null;
let mutationObserver = null;
let watchingViewport = false;
let lastHash = '';
let lastNotifyAt = 0;
let publishing = false;

function markSovereignHost() {
  try {
    const version = typeof EXTENSION_VERSION !== 'undefined' ? EXTENSION_VERSION : '1.6.5';
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

function markActiveJob(el) {
  if (!el || !(el instanceof Element)) return;
  document.querySelectorAll(`[${ACTIVE_JOB_ATTR}="1"]`).forEach((node) => {
    if (node !== el) node.removeAttribute(ACTIVE_JOB_ATTR);
  });
  el.setAttribute(ACTIVE_JOB_ATTR, '1');
}

function candidateSelectors() {
  const details = typeof SOVEREIGN_DETAIL_SELECTORS !== 'undefined' ? SOVEREIGN_DETAIL_SELECTORS : [];
  const cards = typeof SOVEREIGN_CARD_SELECTORS !== 'undefined' ? SOVEREIGN_CARD_SELECTORS : [];
  const cvs = typeof SOVEREIGN_CV_SELECTORS !== 'undefined' ? SOVEREIGN_CV_SELECTORS : [];
  return details.concat(cards).concat(cvs);
}

function pickFocusedElement() {
  if (typeof pickViewportFocusElement === 'function') return pickViewportFocusElement();
  return document.querySelector(`[${ACTIVE_JOB_ATTR}="1"]`);
}

function scrapeCurrentJob() {
  const focus = pickFocusedElement();
  if (focus) markActiveJob(focus);
  if (typeof extractActiveJob === 'function') return extractActiveJob();
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
  }, 80);
}

function publishFocus(force) {
  if (!isTopFrame || publishing) return;
  publishing = true;
  try {
    const data = scrapeCurrentJob();
    if (!data?.pageText) return;
    const hash = data.hash || data.signature
      || (typeof hashScrapedText === 'function' ? hashScrapedText(data.pageText) : '');
    const now = Date.now();
    if (!force && hash && hash === lastHash && now - lastNotifyAt < 12000) return;
    lastHash = hash;
    lastNotifyAt = now;
    postRuntime({
      type: 'VIEWPORT_FOCUS',
      data: {
        ...data,
        hash,
        kind: data.kind || (typeof detectIsolatedKind === 'function'
          ? detectIsolatedKind(data.pageUrl, data.jobTitle, data.pageText)
          : 'job'),
      },
    });
  } catch {
    // Isolation can fail on transient DOM swaps.
  } finally {
    publishing = false;
  }
}

function evaluateViewport(force) {
  const focus = pickFocusedElement();
  if (focus) markActiveJob(focus);
  publishFocus(Boolean(force));
}

function scheduleEvaluate(force) {
  clearTimeout(markTimer);
  markTimer = setTimeout(() => evaluateViewport(force), force ? 40 : 140);
}

function onUserPick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const selectors = candidateSelectors();
  const card = selectors.length ? target.closest(selectors.join(',')) : null;
  if (card) {
    markActiveJob(card);
    scheduleEvaluate(true);
  }
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
  document.addEventListener('click', onUserPick, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') onUserPick(event);
  }, true);
  const onMove = () => {
    notifyScanning();
    scheduleEvaluate(false);
  };
  window.addEventListener('scroll', onMove, { passive: true, capture: true });
  window.addEventListener('wheel', onMove, { passive: true, capture: true });
  window.addEventListener('resize', onMove, { passive: true });
  window.addEventListener('hashchange', () => scheduleEvaluate(true));
  window.addEventListener('popstate', () => scheduleEvaluate(true));

  viewportObserver = new IntersectionObserver(() => {
    notifyScanning();
    scheduleEvaluate(false);
  }, {
    threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.9],
    rootMargin: '-8% 0px -12% 0px',
  });
  observeCandidates();

  mutationObserver = new MutationObserver(() => {
    observeCandidates();
    scheduleEvaluate(false);
  });
  mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
  notifyScanning();
  scheduleEvaluate(true);
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
  if (request?.type === 'SCRAPE_PAGE' || request?.type === 'RESCAN_PAGE') {
    try {
      if (request.type === 'RESCAN_PAGE') lastHash = '';
      const data = scrapeCurrentJob();
      if (isTopFrame && data?.pageText) {
        lastHash = data.hash || data.signature || lastHash;
        lastNotifyAt = Date.now();
        postRuntime({ type: 'VIEWPORT_FOCUS', data });
      }
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
