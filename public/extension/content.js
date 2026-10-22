/**
 * Page bridge: session inherit on sovereignapp.pro, Auto-Fill into editors.
 * Marks the job currently in view so the scraper never sticks on the first card.
 * Never submits the form.
 */

const ACTIVE_JOB_ATTR = 'data-sovereign-active-job';

const DETAIL_HINTS = [
  '[data-test="JobDetails"]',
  '[data-test="job-details"]',
  '.jobs-search__job-details',
  '.jobs-search__job-details-container',
  '.jobs-details',
  '.job-details',
  '.job-view-layout',
  '#job-details',
  '.jobs-description',
  '.jobsearch-RightPane',
  '.jobsearch-JobComponent',
  '.jobsearch-ViewJobLayout--mainContent',
  '#jobDescriptionText',
  '.PageProjectViewLogout-detail',
  '.PageProjectView-detail',
  '[aria-label="Job details"]',
  '[aria-label="Job Details"]',
  '[role="dialog"]',
  'dialog',
  '[aria-modal="true"]',
  'article[data-job-id]',
];

const CARD_HINTS = [
  'a[href*="/jobs/"]',
  'a[href*="/job/"]',
  '[data-test="JobTile"]',
  '[data-test="job-tile"]',
  '.jobs-search-results__list-item',
  '.scaffold-layout__list-item',
  '.jobsearch-SerpJobCard',
  '[data-jk]',
  '[data-job-id]',
  'article',
  '.up-card-section',
];

let markTimer = 0;
let viewportObserver = null;
let mutationObserver = null;
let watchingViewport = false;

function markSovereignHost() {
  try {
    const version = typeof EXTENSION_VERSION !== 'undefined' ? EXTENSION_VERSION : '1.6.4';
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
  const root = el.closest(DETAIL_HINTS.concat(CARD_HINTS).join(',')) || el;
  if (!(root instanceof Element)) return;
  document.querySelectorAll(`[${ACTIVE_JOB_ATTR}="1"]`).forEach((node) => {
    if (node !== root) node.removeAttribute(ACTIVE_JOB_ATTR);
  });
  root.setAttribute(ACTIVE_JOB_ATTR, '1');
}

function viewportJobScore(el) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || 800;
  const vw = window.innerWidth || 1200;
  const visH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
  const visW = Math.min(r.right, vw) - Math.max(r.left, 0);
  if (visH < 36 || visW < 36) return -1;
  const selected = el.matches?.('[aria-current="true"], [aria-current="page"], [aria-selected="true"]')
    || el.closest?.('.jobs-search-results-list__list-item--active, .scaffold-layout__list-item--active, .vjs-highlight');
  const dialog = el.closest?.('dialog, [role="dialog"], [aria-modal="true"], .air3-slider, .up-slider');
  const rightPane = r.left > vw * 0.28 ? 18000 : 0;
  return visH * visW + (selected ? 90000 : 0) + (dialog ? 130000 : 0) + rightPane;
}

function markBestVisibleJob() {
  const nodes = [];
  DETAIL_HINTS.concat(['[aria-current="true"]', '[aria-selected="true"]', '.vjs-highlight']).forEach((selector) => {
    try {
      document.querySelectorAll(selector).forEach((el) => nodes.push(el));
    } catch {
      // invalid selector on this host
    }
  });
  let best = null;
  let bestScore = -1;
  for (const el of nodes) {
    const score = viewportJobScore(el);
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best) markActiveJob(best);
}

function scheduleMark() {
  clearTimeout(markTimer);
  markTimer = setTimeout(markBestVisibleJob, 90);
}

function onUserPick(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const card = target.closest(CARD_HINTS.concat(DETAIL_HINTS).join(','));
  if (card) markActiveJob(card);
}

function observeDetails() {
  if (!viewportObserver) return;
  DETAIL_HINTS.forEach((selector) => {
    try {
      document.querySelectorAll(selector).forEach((el) => viewportObserver.observe(el));
    } catch {
      // skip
    }
  });
}

function startViewportWatch() {
  if (watchingViewport) return;
  watchingViewport = true;
  document.addEventListener('click', onUserPick, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') onUserPick(event);
  }, true);
  window.addEventListener('scroll', scheduleMark, { passive: true, capture: true });
  window.addEventListener('hashchange', scheduleMark);
  window.addEventListener('popstate', scheduleMark);

  viewportObserver = new IntersectionObserver((entries) => {
    let best = null;
    let bestRatio = 0.22;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      if (entry.intersectionRatio >= bestRatio) {
        bestRatio = entry.intersectionRatio;
        best = entry.target;
      }
    }
    if (best) markActiveJob(best);
  }, {
    threshold: [0.2, 0.4, 0.6, 0.8],
    rootMargin: '-10% 0px -20% 0px',
  });
  observeDetails();

  mutationObserver = new MutationObserver(() => {
    observeDetails();
    scheduleMark();
  });
  mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
  scheduleMark();
}

function scrapeCurrentJob() {
  markBestVisibleJob();
  if (typeof extractActiveJob === 'function') return extractActiveJob();
  return null;
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
      const data = scrapeCurrentJob();
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
