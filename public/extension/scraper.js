/**
 * Isolates the job or CV currently centered in the viewport.
 * Safe in page, content-script, and chrome.scripting.executeScript
 * (no closures, no chrome.* APIs).
 */

const PAGE_LANGUAGE_CODES = new Set(['en', 'tr', 'de', 'fr', 'es', 'pt', 'nl', 'it', 'ru', 'ar', 'zh', 'ja', 'ko', 'pl']);

/** Page language only. Never reads navigator.language. */
function detectPageLanguage(doc) {
  const root = doc || (typeof document !== 'undefined' ? document : null);
  if (!root) return 'en';
  const attr = String(
    root.documentElement?.getAttribute('lang')
    || root.documentElement?.getAttribute('xml:lang')
    || '',
  ).trim().toLowerCase().split('-')[0];
  let sample = '';
  try {
    sample = String(root.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 4000);
  } catch { sample = ''; }
  const heuristic = heuristicPageLanguage(sample);
  if (heuristic && PAGE_LANGUAGE_CODES.has(heuristic)) {
    if (!PAGE_LANGUAGE_CODES.has(attr)) return heuristic;
    if (attr === 'en' && heuristic !== 'en') return heuristic;
    if (attr === heuristic) return attr;
    if (heuristic !== 'en') return heuristic;
  }
  if (PAGE_LANGUAGE_CODES.has(attr)) return attr;
  return 'en';
}

function heuristicPageLanguage(sample) {
  const text = String(sample || '');
  if (text.length < 40) return '';
  const score = (marks, words) => (text.match(marks) || []).length * 3 + (text.match(words) || []).length;
  const ranked = [
    ['tr', score(/[ğüşıöçĞÜŞİÖÇ]/g, /\b(ve|bir|için|ile|olan|değil|bu|çok|daha|veya)\b/gi)],
    ['de', score(/[äöüßÄÖÜ]/g, /\b(und|der|die|das|mit|für|nicht|eine|ist)\b/gi)],
    ['fr', score(/[éèêëàùçœÉÈÊËÀÙÇ]/g, /\b(les|des|une|pour|dans|avec|vous|est|pas)\b/gi)],
    ['es', score(/[ñ¿¡]/g, /\b(los|las|para|con|una|que|del|por|como)\b/gi)],
    ['en', score(/$/g, /\b(the|and|with|for|you|your|this|that|from|have|will)\b/gi)],
  ].sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] < 3) return '';
  if (ranked[0][1] < ranked[1][1] + 2) return '';
  return ranked[0][0];
}

const SOVEREIGN_FEED_WRAPPERS = [
  '[data-test="job-tile-list"]',
  'section[data-test="job-tile-list"]',
  '.jobs-search-results-list',
  '.scaffold-layout__list',
  '#mosaic-provider-jobcards',
  '.jobsearch-LeftPane',
  '[data-test="job-list"]',
  '.jobs-search-results-list__list',
  'ul.jobs-search__results-list',
];

const SOVEREIGN_DRAWER_SELECTORS = [
  '[aria-modal="true"]',
  'dialog[open]',
  'dialog',
  '[role="dialog"]',
  '.air3-slider',
  '.up-slider',
  '.air3-fullscreen-element',
  '[data-test="JobDetails"]',
  '[data-test="job-details"]',
  '.jobs-search__job-details',
  '.jobs-search__job-details-container',
  '.jobs-search__job-details--container',
  '.jobsearch-RightPane',
  '.jobsearch-JobComponent',
  '.job-view-layout',
  '.jobs-details',
  '.PageProjectViewLogout-detail',
  '.PageProjectView-detail',
];

const SOVEREIGN_DETAIL_SELECTORS = [
  '[data-test="JobDetails"]',
  '[data-test="job-details"]',
  '[data-ev-sublocation="job_details"]',
  '[data-ev-label="job_details"]',
  'section[data-test="JobDetails"]',
  '.job-details',
  '.jobs-details',
  '.job-view-layout',
  '.jobs-search__job-details',
  '.jobs-search__job-details--container',
  '.jobs-search__job-details-container',
  '#job-details',
  '#job-details-container',
  '.jobs-description',
  '.jobs-description__content',
  '#jobDescriptionText',
  '.jobsearch-JobComponent',
  '.jobsearch-RightPane',
  '.jobsearch-ViewJobLayout--mainContent',
  '#JDCol',
  '[data-test="job-details"]',
  '[class*="JobDetails_jobDetails"]',
  '.PageProjectViewLogout-detail',
  '.PageProjectView-detail',
  '#main-content .ProjectView',
  '[aria-label="Job details"]',
  '[aria-label="Job Details"]',
  'article[data-job-id]',
];

const SOVEREIGN_CARD_SELECTORS = [
  '[data-test="JobTile"]',
  '[data-test="job-tile"]',
  '[data-test="job-tile-list"] > article',
  '[data-test="job-tile-list"] > section',
  '.jobs-search-results__list-item',
  '.scaffold-layout__list-item',
  'li.jobs-search-results__list-item',
  '.jobsearch-SerpJobCard',
  '.jobsearch-ResultsList > li',
  '[data-jk]',
  'li[data-test="jobListing"]',
  '[data-test="jobListing"]',
  'li.react-job-listing',
  '[data-job-id]',
  '.up-card-section.job-tile',
  '.up-card-section',
  'article[data-test="JobTile"]',
];

const SOVEREIGN_CV_SELECTORS = [
  '.pv-top-card',
  '.scaffold-layout__main',
  '#profile-content',
  '.profile-overview',
  '[data-test="resume"]',
  '.resume-section',
  '.cv-preview',
  'section.pv-profile-section',
];

const SOVEREIGN_NOISE_SELECTORS = [
  'nav', 'footer', 'header', 'aside',
  '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]', '[role="complementary"]',
  'script', 'style', 'iframe', 'noscript', '[aria-hidden="true"]', '.sr-only',
  // Cookie / consent banners
  '#onetrust-banner-sdk', '.cookie-banner', '.cookies', '.cookie-consent',
  // ── Google Translate — complete artifact catalogue ──────────────────────────
  // Control widgets
  '#goog-gt-tt', '#goog-gt-vandal-tip',
  '.VIpgJd-yAWNEb-hvhgNd', '.VIpgJd-ZVi9od-aZ2wEe',
  '.gtx-trans', '.skiptranslate', '.goog-te-banner-frame',
  '.goog-te-gadget', '.goog-te-spinner-pos', '#google_translate_element',
  '[id^="goog-gt-"]', '[class*="goog-te-"]',
  // Embedded translate combo box (injected inside page content)
  '.goog-te-combo',
  // Inline content highlights — GTranslate marks the hovered/selected source
  // text with yellow background or a special class while the tooltip is open.
  '.goog-text-highlight',
  'font[style*="background-color"]',   // yellow selection highlight on source text
  'font[style*="color: black"]',        // GTranslate resets color on translated spans
  // Generic translate attributes
  '[data-purpose="translate"]', '[aria-label*="Translate"]', '[aria-label*="translate"]',
  // ── Upwork / LinkedIn UI chrome ────────────────────────────────────────────
  '.global-nav', '.msg-overlay-list-bubble', '.artdeco-toast',
  // Upwork WebSocket status banners injected by dash-api.min.js
  '[data-test="connection-status"]', '[class*="connection-banner"]',
  // Nuxt hydration placeholders (Upwork SSR artefacts)
  '[data-fetch-key]', '[nuxt-hydration]',
  // Any element explicitly hidden from assistive tech
  '[hidden]', '[style*="display:none"]', '[style*="display: none"]',
  '[style*="visibility:hidden"]', '[style*="visibility: hidden"]',
];

/**
 * GOOGLE TRANSLATE ARTIFACT SANITIZER
 *
 * When the user has Chrome's built-in translate bar active, Google Translate
 * wraps every text node in nested <font style="vertical-align:inherit"> tags
 * and can insert <span class="notranslate"> containers. This mutilates
 * innerText reads, causing the scraper to see translated (non-English) copy
 * or garbled whitespace.
 *
 * This function operates on a CLONED element (never the live DOM) and:
 *   1. Removes all Google Translate control widgets.
 *   2. Unwraps <font> elements whose style contains "vertical-align: inherit"
 *      (GTranslate's unique fingerprint) by replacing them with a plain text
 *      node built from their innerText — recovering the readable string
 *      without the wrapper markup.
 *   3. Strips any remaining empty <font> shells.
 *
 * Must be called BEFORE reading .innerText on any clone.
 */
function stripTranslationArtifacts(clone) {
  if (!clone || !(clone instanceof Element)) return;

  // 1. Remove ALL GTranslate control widgets and inline artifact elements.
  const GTRANS_WIDGET_SELECTORS = [
    '#goog-gt-tt', '#goog-gt-vandal-tip',
    '.goog-te-banner-frame', '.goog-te-spinner-pos', '.goog-te-gadget',
    '#google_translate_element', '[id^="goog-gt-"]', '[class*="goog-te-"]',
    '.skiptranslate', '.gtx-trans', '.VIpgJd-yAWNEb-hvhgNd', '.VIpgJd-ZVi9od-aZ2wEe',
    // Embedded combo widget inside page content
    '.goog-te-combo',
    // Inline source-text highlight: GTranslate marks the word/phrase being
    // translated with a yellow background and this class.
    '.goog-text-highlight',
  ];
  for (const sel of GTRANS_WIDGET_SELECTORS) {
    try { clone.querySelectorAll(sel).forEach((n) => n.remove()); } catch {/**/ }
  }

  // 2. Strip all hidden elements (display:none / visibility:hidden inline style).
  //    These are never readable content and can contain stale translated fragments.
  try {
    clone.querySelectorAll('[hidden],[style*="display:none"],[style*="display: none"],[style*="visibility:hidden"],[style*="visibility: hidden"]')
      .forEach((n) => n.remove());
  } catch {/**/ }

  // 3. Unwrap ALL <font> elements — GTranslate uses them in two ways:
  //    a) Translation wrappers: <font style="vertical-align:inherit"> — nested pair
  //    b) Highlight wrappers: <font style="background-color:..."> over source text
  //    In both cases we discard the element and preserve the underlying text.
  //    Iterate in reverse-document-order so inner nodes are removed before parents.
  const fonts = Array.from(clone.querySelectorAll('font') || []).reverse();
  for (const font of fonts) {
    try {
      const style = font.getAttribute('style') || '';
      const isGTranslateFont =
        /vertical-align\s*:\s*inherit/i.test(style) ||
        /background-color/i.test(style) ||
        /color\s*:\s*black/i.test(style) ||
        font.classList.contains('goog-text-highlight');
      if (!isGTranslateFont) continue;
      // Replace the <font> wrapper with a plain text node from its raw content.
      const text = (font.innerText || font.textContent || '').replace(/\s+/g, ' ').trim();
      const replacement = document.createTextNode(text ? ` ${text} ` : '');
      font.parentNode?.replaceChild(replacement, font);
    } catch {/**/ }
  }

  // 4. Remove any leftover empty <font> shells (zero-width translation placeholders).
  try {
    clone.querySelectorAll('font').forEach((f) => {
      if (!(f.textContent || '').trim()) f.remove();
    });
  } catch {/**/ }
}

const SOVEREIGN_MAIN_SELECTORS = [
  'main', '[role="main"]', 'article',
  '.job-details', '.jobs-description', '.jobs-description__content',
  '[data-test*="job"]', '[data-test*="Job"]',
  '[data-test="JobDetails"]', '[data-test="Description"]',
  '.jobsearch-JobComponent', '.jobs-search__job-details',
];

const UI_CHROME_LINE = /^(translate(?: this page)?|türkçe|turkce|english|español|deutsch|français|sign in|log in|join now|menu|home|jobs|messaging|notifications|network|post a job|cookie(?:s)?(?: settings)?|accept(?: all)?|reject(?: all)?|see more|show more|follow|share|report(?: job)?|save(?: job)?|skip to (?:main )?content|giri[sş]\s*yap(?:mak|ın|iniz)?|oturum\s*aç(?:ın)?|üye\s*ol|kaydol|kabul\s*et|reddet|çerez(?:ler)?|daha\s*fazla|menü|ana\s*sayfa)$/i;

function isChromePhrase(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return !t || UI_CHROME_LINE.test(t);
}

function looksLikeUiChrome(title, text) {
  const compact = `${title || ''}\n${text || ''}`.replace(/\s+/g, ' ').trim();
  if (compact.length < 40) return true;
  const chromeHits = (compact.match(/translate this page|google çeviri|chrome.?çeviri|\btürkçe\b|cookie settings|sign in|join now|skip to main content|giri[sş]\s*yap(?:mak|ın)?|oturum\s*aç/gi) || []).length;
  const jobHits = (compact.match(/responsibilities|requirements|job description|hourly|fixed[- ]price|must have|beatmaker|mixing|mastering|sound design|producer|react|python|design/gi) || []).length;
  if (chromeHits >= 1 && jobHits === 0 && compact.length < 240) return true;
  return chromeHits >= 2 && jobHits === 0;
}

function filterNoiseLines(text, allowShortTitle) {
  return String(text || '').split('\n').filter((line) => {
    const t = line.replace(/\s+/g, ' ').trim();
    if (!t || isChromePhrase(t)) return false;
    if (t.length < 40 && !(allowShortTitle && t.length >= 8 && t.length <= 90)) return false;
    return true;
  }).join('\n');
}

function hashScrapedText(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 5000);
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function classifyScrapedContent(url, title, text, isolated) {
  const href = String(url || '').toLowerCase();
  const sample = `${title || ''}\n${text || ''}`.toLowerCase();
  const compact = sample.replace(/\s+/g, ' ').trim();
  if (compact.length < 40 || looksLikeUiChrome(title, text)) {
    return { contentType: '', kind: 'job', discarded: true, reason: compact.length < 40 ? 'empty' : 'chrome' };
  }

  const nameHits = (sample.match(/\n[A-Z][a-z]+ [A-Z][a-z]+\n/g) || []).length;
  const listHits = (sample.match(/applicants?|candidates?|talent pool|search results|jobs you may|similar jobs|people also viewed|showing \d+/g) || []).length;
  const titles = (String(text || '').match(/\n[A-Z][^\n]{12,80}\n/g) || []).length;
  if ((!isolated && titles >= 8) || nameHits >= 6 || (listHits >= 2 && titles >= 5)) {
    return { contentType: 'CANDIDATE_LIST', kind: 'list', discarded: true, reason: 'list' };
  }

  const jobHits = (sample.match(/job description|responsibilities|qualifications|requirements|apply now|hourly rate|fixed[- ]price|salary|proposals? bid|we're hiring|we are looking|must have|beatmaker|mixing|mastering|sound design|producer|audio engineer|music production/g) || []).length;
  const cvHits = (sample.match(/work experience|professional experience|education|curriculum vitae|\bcv\b|professional summary|certifications|skills\b/g) || []).length;

  if (/linkedin\.com\/in\//.test(href) || /\/resume|\/cv(?:\/|$)/.test(href) || (cvHits > jobHits && cvHits >= 2)) {
    return { contentType: 'PROFILE_CV', kind: 'cv', discarded: false, reason: '' };
  }
  if (/linkedin\.com\/company|crunchbase\.com/.test(href)) {
    return { contentType: 'JOB_POSTING', kind: 'b2b', discarded: false, reason: '' };
  }
  return { contentType: 'JOB_POSTING', kind: 'job', discarded: false, reason: '' };
}

function detectIsolatedKind(url, title, text, isolated) {
  return classifyScrapedContent(url, title, text, isolated).kind;
}

function sovereignVisible(el) {
  if (!el || !(el instanceof Element)) return false;
  // Fast hidden-ancestor check: offsetParent is null when any ancestor has
  // display:none. getComputedStyle only reflects the element's own style and
  // can miss a display:none set on a parent when CSS inheritance is involved.
  // Exception: <body> and elements with position:fixed have offsetParent=null
  // but are still visible, so we guard against those cases.
  try {
    const tag = el.tagName?.toLowerCase?.();
    if (tag !== 'body' && tag !== 'html') {
      const pos = window.getComputedStyle(el).position;
      if (pos !== 'fixed' && pos !== 'sticky' && el.offsetParent === null) return false;
    }
  } catch {/**/ }
  const r = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return r.width > 48 && r.height > 36
    && style.visibility !== 'hidden'
    && style.display !== 'none'
    && style.opacity !== '0';
}

function sovereignMatchesAny(el, selectors) {
  return selectors.some((selector) => {
    try { return el.matches(selector); } catch { return false; }
  });
}

function sovereignClosestAny(el, selectors) {
  for (const selector of selectors) {
    try {
      const hit = el.closest(selector);
      if (hit) return hit;
    } catch {
      // skip
    }
  }
  return null;
}

function sovereignInViewport(el) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || 800;
  const vw = window.innerWidth || 1200;
  return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
}

function sovereignCenterScore(el) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || 800;
  const vw = window.innerWidth || 1200;
  const visH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
  const visW = Math.min(r.right, vw) - Math.max(r.left, 0);
  if (visH < 40 || visW < 40) return -1;
  const visArea = visH * visW;
  const fullArea = Math.max(r.width * r.height, 1);
  const ratio = Math.max(0, Math.min(1, visArea / fullArea));
  const cy = (r.top + r.bottom) / 2;
  const cx = (r.left + r.right) / 2;
  const distY = Math.abs(cy - vh / 2);
  const distX = Math.abs(cx - vw / 2);
  const dialog = el.closest?.('dialog, [role="dialog"], [aria-modal="true"], .air3-slider, .up-slider, .air3-fullscreen-element');
  const drawer = sovereignMatchesAny(el, SOVEREIGN_DRAWER_SELECTORS)
    || Boolean(sovereignClosestAny(el, SOVEREIGN_DRAWER_SELECTORS));
  const rightPane = r.left > vw * 0.32 && visH > 140 && visW > 240;
  return visArea * (0.35 + 0.65 * ratio)
    - distY * 64
    - distX * 12
    + (dialog ? 160000 : 0)
    + (drawer ? 90000 : 0)
    + (rightPane ? 28000 : 0)
    + Math.min(visH, 900) * 6;
}

function sovereignIsNoiseElement(el) {
  if (!el || !(el instanceof Element)) return true;
  if (sovereignMatchesAny(el, SOVEREIGN_NOISE_SELECTORS)) return true;
  const inNoise = sovereignClosestAny(el, SOVEREIGN_NOISE_SELECTORS);
  const inMain = sovereignClosestAny(el, SOVEREIGN_MAIN_SELECTORS.concat(SOVEREIGN_DRAWER_SELECTORS).concat(SOVEREIGN_DETAIL_SELECTORS));
  if (inNoise && !inMain) return true;
  const t = String(el.innerText || '').replace(/\s+/g, ' ').trim();
  if (t.length > 0 && t.length < 40 && isChromePhrase(t)) return true;
  return false;
}

function sovereignIsLayoutShell(el) {
  if (!el || el === document.body || el === document.documentElement) return true;
  if (sovereignMatchesAny(el, SOVEREIGN_FEED_WRAPPERS)) return true;
  const tag = el.tagName;
  if (tag === 'NAV' || tag === 'HEADER' || tag === 'FOOTER' || tag === 'ASIDE') return true;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || 800;
  const vw = window.innerWidth || 1200;
  const visH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
  const visW = Math.min(r.right, vw) - Math.max(r.left, 0);
  const knownDetail = sovereignMatchesAny(el, SOVEREIGN_DETAIL_SELECTORS);
  if (!knownDetail && visH * visW > vh * vw * 0.74) return true;
  return false;
}

function sovereignCollect(selectors, root) {
  const scope = root || document;
  const out = [];
  const seen = new Set();
  for (const selector of selectors) {
    try {
      scope.querySelectorAll(selector).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        out.push(el);
      });
    } catch {
      // invalid selector on this host
    }
  }
  return out;
}

function clearSovereignMarks() {
  document.querySelectorAll('[data-sovereign-active-job]').forEach((el) => {
    el.removeAttribute('data-sovereign-active-job');
  });
}

function getOpenDetailPane() {
  const panes = sovereignCollect(SOVEREIGN_DRAWER_SELECTORS).filter((el) => {
    if (!sovereignVisible(el) || !sovereignInViewport(el)) return false;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    const visH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    const visW = Math.min(r.right, window.innerWidth || 1200) - Math.max(r.left, 0);
    return visH >= 140 && visW >= 220 && visH * visW >= 36000;
  });
  if (!panes.length) return null;
  let best = null;
  let bestScore = -1;
  for (const el of panes) {
    const score = sovereignCenterScore(el);
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

/**
 * STRICT VIEWPORT-CENTER TARGETING
 *
 * Algorithm (exactly as spec'd):
 *   1. Query every job-card, detail-pane, and drawer element on the page.
 *   2. Get getBoundingClientRect() for each.
 *   3. Keep only elements whose vertical span STRICTLY encloses the absolute
 *      screen midpoint (window.innerHeight / 2) — i.e. rect.top <= centerY
 *      AND rect.bottom >= centerY.
 *   4. If multiple cards cross the midpoint, pick the one whose own vertical
 *      center is closest to centerY. Detail panes / drawers win ties.
 *   5. Return null when nothing crosses the midpoint — callers must NOT fall
 *      back to stale cached data; they should ask the user to center a card.
 *
 * Returns the enclosing job-card wrapper (via closestJobCard) or the element
 * itself when no wrapper ancestor is found.
 */
function getViewportCenterCard() {
  const centerY = window.innerHeight / 2;

  // Build a de-duplicated pool of every candidate element type.
  const allSelectors = SOVEREIGN_CARD_SELECTORS
    .concat(SOVEREIGN_DETAIL_SELECTORS)
    .concat(SOVEREIGN_DRAWER_SELECTORS)
    .concat(SOVEREIGN_CV_SELECTORS)
    .concat(['[data-job-id]', '[data-jk]', 'article[data-test]', 'article']);
  const candidates = sovereignCollect(allSelectors);

  // Step 3: strict vertical-midpoint intersection check.
  const crossing = candidates.filter((el) => {
    if (!sovereignVisible(el)) return false;
    if (sovereignIsLayoutShell(el)) return false;
    if (sovereignIsNoiseElement(el)) return false;
    const r = el.getBoundingClientRect();
    // Must span the exact screen midpoint — not just be anywhere in the viewport.
    return r.top <= centerY && r.bottom >= centerY;
  });

  if (!crossing.length) return null;
  if (crossing.length === 1) {
    return closestJobCard(crossing[0]) || crossing[0];
  }

  // Step 4: break ties — prefer detail/drawer panels, then smallest vertical
  // distance from the card's own center to screen center.
  const isDetailEl = (el) =>
    SOVEREIGN_DETAIL_SELECTORS.some((s) => { try { return el.matches(s); } catch { return false; } })
    || SOVEREIGN_DRAWER_SELECTORS.some((s) => { try { return el.matches(s); } catch { return false; } })
    || SOVEREIGN_DRAWER_SELECTORS.some((s) => { try { return Boolean(el.closest?.(s)); } catch { return false; } });

  let best = null;
  let bestDist = Infinity;
  for (const el of crossing) {
    const r = el.getBoundingClientRect();
    const cardCenterY = (r.top + r.bottom) / 2;
    // Give detail/drawer panels a 50 000 px virtual boost so they always win
    // over a partially-visible card tile in the left-hand feed list.
    const dist = Math.abs(cardCenterY - centerY) - (isDetailEl(el) ? 50000 : 0);
    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  }
  return best ? (closestJobCard(best) || best) : null;
}

function getMostVisibleElement(options) {
  const force = Boolean(options && options.force);

  // Step 1 (strict): find the element whose vertical bounds cross screen-center.
  // This is the most reliable signal that the user is actively looking at a card.
  const centered = getViewportCenterCard();
  if (centered && !sovereignIsNoiseElement(centered)) return centered;

  // Step 2 (fallback): an open drawer/modal is visible even if it doesn't
  // strictly cross the midpoint (e.g. it may be pinned to the right half).
  const drawer = getOpenDetailPane();
  if (drawer && !sovereignIsNoiseElement(drawer)) return drawer;

  // Step 3 (last resort, force-only): score-based selection from the full pool.
  // Only reaches here when the user has forced a scan on a non-job page or
  // when the card hasn't scrolled far enough to cross the midpoint.
  if (!force) return null;

  const prefer = sovereignCollect(SOVEREIGN_MAIN_SELECTORS.concat(SOVEREIGN_DETAIL_SELECTORS));
  const pool = prefer.concat(sovereignCollect(
    SOVEREIGN_CARD_SELECTORS
      .concat(SOVEREIGN_CV_SELECTORS)
      .concat(['[data-job-id]', '[data-jk]', 'article']),
  ));
  let best = null;
  let bestScore = -1;
  for (const el of pool) {
    if (!sovereignVisible(el) || !sovereignInViewport(el) || sovereignIsNoiseElement(el)) continue;
    if (sovereignIsLayoutShell(el)) continue;
    const score = sovereignCenterScore(el);
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

/**
 * Walks UP the DOM from a candidate element to find the enclosing job-card
 * wrapper using .closest() — exactly as the task spec requires.
 * Prevents the scraper from returning a nested text node or icon span.
 */
const CLOSEST_CARD_SELECTORS = [
  'article',
  'section[data-test]',
  'div[data-test*="job"]',
  'div[data-test*="Job"]',
  'li[data-test*="job"]',
  '[class*="job-tile"]',
  '[class*="job-card"]',
  '[class*="JobTile"]',
  '[class*="jobCard"]',
  '[data-job-id]',
  '[data-jk]',
];

function closestJobCard(el) {
  if (!el || !(el instanceof Element)) return el;
  for (const selector of CLOSEST_CARD_SELECTORS) {
    try {
      const hit = el.closest(selector);
      if (hit && hit !== document.body && hit !== document.documentElement) return hit;
    } catch {
      // ignore invalid selector on this host
    }
  }
  return el;
}

function pickViewportFocusElement() {
  return getMostVisibleElement();
}

function extractActiveJob(options) {
  // ISOLATION GUARD: if the host page (e.g. Upwork/Nuxt) is mid-hydration,
  // the DOM is in a transitional state — body may be empty or partially
  // replaced. Wait for an interactive readyState before reading anything.
  // This prevents the scraper from returning a blank result that then gets
  // cached and shown as "no job found" while the real content is loading.
  const readyOk = document.readyState === 'interactive' || document.readyState === 'complete';
  const force = Boolean(options && (options.force || options.bypassFilters));
  if (!readyOk && !force) {
    return {
      pageText: '', pageTitle: '', pageUrl: String(location.href || ''),
      jobTitle: '', jobDescription: '', requiredSkills: [], budget: '',
      clientHistory: '',
      structuredJob: { title: '', description: '', skills: [], budget: '', clientInfo: '' },
      isolated: false, host: String(location.hostname || '').replace(/^www\./, ''),
      kind: 'job', contentType: '', discarded: true, discardReason: 'loading',
      hash: hashScrapedText(`loading|${location.href}|${Date.now()}`),
      signature: hashScrapedText(`loading|${location.href}|${Date.now()}`),
    };
  }

  try {
  return _extractActiveJobImpl(options);
  } catch (hostErr) {
    // Silently absorb any exception thrown by host-page DOM mutations,
    // WebSocket callbacks, or Nuxt hydration conflicts. Never propagate
    // host-page errors into the extension's background/service-worker context.
    return {
      pageText: '', pageTitle: '', pageUrl: String(location.href || ''),
      jobTitle: '', jobDescription: '', requiredSkills: [], budget: '',
      clientHistory: '',
      structuredJob: { title: '', description: '', skills: [], budget: '', clientInfo: '' },
      isolated: false, host: String(location.hostname || '').replace(/^www\./, ''),
      kind: 'job', contentType: '', discarded: true, discardReason: 'host-error',
      hash: hashScrapedText(`error|${location.href}|${Date.now()}`),
      signature: hashScrapedText(`error|${location.href}|${Date.now()}`),
    };
  }
}

function _extractActiveJobImpl(options) {
  const force = Boolean(options && (options.force || options.bypassFilters));
  const MAX_TEXT = 12_000;
  const MAX_FIELD = 2_000;

  const visible = sovereignVisible;

  const collect = sovereignCollect;

  const viewportScore = sovereignCenterScore;

  const pickBest = (selectors, root) => {
    const nodes = collect(selectors, root).filter((el) => visible(el) && !sovereignIsLayoutShell(el) && !sovereignIsNoiseElement(el));
    if (!nodes.length) return null;
    let best = null;
    let bestScore = -1;
    for (const el of nodes) {
      const score = viewportScore(el);
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  };

  const cleanText = (value, max) => String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, max);

  const textOf = (el, max, allowShortTitle) => {
    if (!el) return '';
    try {
      const clone = el.cloneNode(true);
      // Remove Google Translate font wrappers FIRST so innerText returns
      // the original English text, not the translated overlay.
      stripTranslationArtifacts(clone);
      clone.querySelectorAll?.(SOVEREIGN_NOISE_SELECTORS.join(',')).forEach((node) => node.remove());
      clone.querySelectorAll?.('button, a, span, li').forEach((node) => {
        if (isChromePhrase(node.textContent || '')) node.remove();
      });
      const raw = cleanText(clone.innerText || clone.textContent || '', max);
      return cleanText(filterNoiseLines(raw, allowShortTitle), max);
    } catch {
      return '';
    }
  };

  /**
   * RAW TEXT-NODE WALKER
   *
   * Extracts text exclusively from DOM Text nodes (nodeType === 3) within
   * semantic block elements. This is the most reliable method when Google
   * Translate is active: GTranslate replaces element.textContent via the
   * translated <font> wrappers, but the *original* Text nodes in the cloned
   * tree still carry the pre-translation strings because we call
   * stripTranslationArtifacts() first, which unwraps the <font> elements and
   * replaces them with the text they contained.
   *
   * Elements explicitly skipped by the walker:
   *   • script, style, noscript, iframe   — never content
   *   • Any element matching SOVEREIGN_NOISE_SELECTORS — translation / chrome
   *   • Elements with inline display:none or visibility:hidden
   *   • Elements shorter than 3 chars after trimming
   */
  const BLOCK_TAGS = new Set(['p', 'li', 'dd', 'dt', 'blockquote', 'pre', 'div', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'td', 'th', 'caption']);
  const SKIP_TAGS  = new Set(['script', 'style', 'noscript', 'iframe', 'svg', 'canvas', 'video', 'audio', 'object', 'embed', 'template', 'font']);

  const walkTextNodes = (root, max) => {
    if (!root) return '';
    try {
      const clone = root.cloneNode(true);
      // Strip translation artifacts and hidden elements before walking.
      stripTranslationArtifacts(clone);
      clone.querySelectorAll?.(SOVEREIGN_NOISE_SELECTORS.join(',')).forEach((n) => n.remove());

      const lines = [];
      let total = 0;

      const walk = (node) => {
        if (total >= max) return;
        if (!node) return;
        if (node.nodeType === 3) {
          // Raw Text node — most reliable; unaffected by translate overlays.
          const t = (node.textContent || '').replace(/\s+/g, ' ').trim();
          if (t.length >= 3 && !isChromePhrase(t)) {
            lines.push(t);
            total += t.length;
          }
          return;
        }
        if (node.nodeType !== 1) return; // skip Comment, CDATASection etc.
        const tag = (node.tagName || '').toLowerCase();
        if (SKIP_TAGS.has(tag)) return;
        // Skip inline-hidden elements.
        const style = node.getAttribute?.('style') || '';
        if (/display\s*:\s*none/i.test(style) || /visibility\s*:\s*hidden/i.test(style)) return;
        // If this is a block-level container, add a separator so lines don't run together.
        const isBlock = BLOCK_TAGS.has(tag);
        if (isBlock && lines.length) lines.push('');
        for (let i = 0; i < node.childNodes.length; i += 1) {
          walk(node.childNodes[i]);
        }
        if (isBlock && lines.length) lines.push('');
      };

      walk(clone);

      const result = lines
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, max);
      return result;
    } catch {
      return '';
    }
  };

  /**
   * GRANULAR PARAGRAPH EXTRACTION
   *
   * Extracts text exclusively from semantic block elements (<p>, <li>, <dd>)
   * inside a container, preventing title text, badge labels, price metadata,
   * and UI chrome from being mashed into the description body.
   *
   * Falls back to textOf() ONLY when the element has no paragraph children
   * (e.g. plain-text job posts with no markup).
   */
  const paragraphsOf = (el, max) => {
    if (!el) return '';
    try {
      const clone = el.cloneNode(true);
      // Remove Google Translate font wrappers before any innerText read.
      stripTranslationArtifacts(clone);
      // Strip noise and interactive chrome.
      clone.querySelectorAll?.(SOVEREIGN_NOISE_SELECTORS.join(',')).forEach((n) => n.remove());
      clone.querySelectorAll?.('button, [role="button"], h1, h2, h3, h4').forEach((n) => n.remove());
      clone.querySelectorAll?.('button, a, span').forEach((n) => {
        if (isChromePhrase(n.textContent || '')) n.remove();
      });
      // Collect semantic block nodes that carry actual content.
      const blocks = Array.from(clone.querySelectorAll?.('p, li, dd') || []);
      if (blocks.length >= 2) {
        const joined = blocks
          .map((b) => cleanText(b.innerText || b.textContent || '', 2000))
          .filter((t) => t.length > 15 && !isChromePhrase(t))
          .join('\n');
        const result = cleanText(filterNoiseLines(joined, false), max);
        if (result.length >= 60) return result;
      }
      // No usable paragraphs — fall back to full text extraction.
      return textOf(el, max, false);
    } catch {
      return '';
    }
  };

  /**
   * H1-ONLY TITLE EXTRACTION
   *
   * Returns the innerText of the FIRST h1 inside the given root, or '' if
   * none exists. Used to prevent the title from being pulled from h2/span
   * elements that are actually section headers or metadata labels.
   */
  const strictTitleFrom = (root) => {
    if (!root) return '';
    // Try data-test attributes first — most reliable on Upwork/LinkedIn.
    for (const sel of ['[data-test="job-title"]', '[data-test="JobTitle"]', 'h1', 'h2[data-test]']) {
      try {
        const el = root.querySelector(sel);
        if (!el) continue;
        const t = cleanText(el.innerText || el.textContent || '', 180);
        if (t && t.length >= 4 && t.length <= 200 && !isChromePhrase(t)) return t;
      } catch { /**/ }
    }
    return '';
  };

  const attrText = (el, names) => {
    if (!el) return '';
    for (const name of names) {
      const v = el.getAttribute?.(name);
      if (v && v.trim()) return v.trim();
    }
    return '';
  };

  const host = String(location.hostname || '').replace(/^www\./, '').toLowerCase();
  const href = String(location.href || '');

  const TITLE_SELECTORS = [
    '[data-test="job-title"]',
    '[data-test="JobTitle"]',
    'h4[data-test="job-title"]',
    'h2[data-test="job-title"]',
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__job-title',
    'h1.t-24',
    'h1.text-heading-xlarge',
    'h1.jobsearch-JobInfoHeader-title',
    '[data-testid="jobsearch-JobInfoHeader-title"]',
    '[data-testid="simpler-jobTitle"]',
    '.jobsearch-JobInfoHeader-title',
    '[data-test="job-title"]',
    '[data-test="jobTitle"]',
    'h1[class*="JobDetails_jobTitle"]',
    '.PageProjectViewLogout-header-title',
    '.pv-text-details__left-panel h1',
    'h1',
    'h2',
  ];

  const DESC_SELECTORS = [
    '[data-test="Description"]',
    '[data-test="JobDescription"]',
    '[data-test="job-description"]',
    '.job-description',
    '.jobs-description__content',
    '.jobs-box__html-content',
    '#job-description',
    '#jobDescriptionText',
    '.jobsearch-jobDescriptionText',
    '[data-test="jobDescriptionContent"]',
    '#JobDescriptionContainer',
    '[class*="JobDetails_jobDescription"]',
    '.jobDescriptionContent',
    '.ProjectDescription',
    '[data-qa="project-description"]',
    '.pv-shared-text-with-see-more',
    '#about',
  ];

  const SKILL_SELECTORS = [
    '[data-test="Skills"] a',
    '[data-test="skill"]',
    '[data-test="TokenClamp"] a',
    '.skills-list a',
    '.job-details-how-you-match__skills-item',
    '.jobs-unified-top-card__job-insight',
    '.ProjectSkills a',
    '[data-qa="skill"]',
    '.pv-skill-category-entity__name-text',
  ];

  const BUDGET_SELECTORS = [
    '[data-test="BudgetAmount"]',
    '[data-test="budget"]',
    '[data-test="Price"]',
    '.jobsearch-JobMetadataHeader-item',
    '[data-test="is-fixed-price"]',
    '[data-test="is-hourly"]',
  ];

  const CLIENT_SELECTORS = [
    '[data-test="AboutClient"]',
    '[data-test="client-info"]',
    '.about-client',
    '.jobsearch-CompanyReview--heading',
    '[data-test="ClientInfo"]',
  ];

  const looksLikeFeed = (text) => {
    const titles = (text.match(/\n[A-Z][^\n]{12,80}\n/g) || []).length;
    return titles >= 8 && text.length > 4000;
  };

  const skillsFrom = (root) => {
    const nodes = [];
    for (const selector of SKILL_SELECTORS) {
      try {
        nodes.push(...root.querySelectorAll(selector));
      } catch {
        // skip
      }
    }
    const out = [];
    const seen = new Set();
    for (const node of nodes) {
      const label = cleanText(node.textContent || '', 48);
      const key = label.toLowerCase();
      if (label.length < 2 || label.length > 40 || seen.has(key) || isChromePhrase(label)) continue;
      if (/see more|show more|view all|apply now/i.test(label)) continue;
      seen.add(key);
      out.push(label);
      if (out.length >= 16) break;
    }
    return out;
  };

  const budgetFrom = (root, hay) => {
    const el = pickBest(BUDGET_SELECTORS, root);
    const direct = textOf(el, 160);
    if (direct) return direct;
    const match = String(hay || '').match(
      /(?:hourly|fixed|budget|salary|pay)[:\s]*\$?\s?\d[\d,]*(?:\s?[-–]\s?\$?\d[\d,]*)?(?:\s?\/\s?(?:hr|hour|mo|yr))?/i,
    );
    return match ? match[0].trim() : '';
  };

  const clientFrom = (root) => {
    const el = pickBest(CLIENT_SELECTORS, root);
    return textOf(el, 500);
  };

  clearSovereignMarks();

  // STRICT VIEWPORT CENTER TARGETING
  // getMostVisibleElement uses getViewportCenterCard() first — it only returns an
  // element whose rect.top <= centerY && rect.bottom >= centerY.
  // When nothing crosses the midpoint on a passive (non-forced) scan, it returns
  // null and we discard immediately so stale data is never shown.
  const rawFocus = getMostVisibleElement({ force });
  const focus = rawFocus ? (closestJobCard(rawFocus) || rawFocus) : rawFocus;

  // If no card crosses the viewport center and this is not a forced scan,
  // return an empty / discarded result that prompts the user to scroll a
  // job card to the center of the screen.
  if (!focus && !force) {
    return {
      pageText: '',
      pageTitle: '',
      pageUrl: href,
      jobTitle: '',
      jobDescription: '',
      requiredSkills: [],
      budget: '',
      clientHistory: '',
      structuredJob: { title: '', description: '', skills: [], budget: '', clientInfo: '' },
      isolated: false,
      host,
      kind: 'job',
      contentType: '',
      discarded: true,
      discardReason: 'no-center-card',
      hash: hashScrapedText(`empty|${href}|${Date.now()}`),
      signature: hashScrapedText(`empty|${href}|${Date.now()}`),
    };
  }

  const root = focus
    || getOpenDetailPane()
    || pickBest(SOVEREIGN_MAIN_SELECTORS)
    || document.querySelector('main, [role="main"], article')
    || document.body;
  if (root instanceof Element) root.setAttribute('data-sovereign-active-job', '1');

  const looksLikePay = (value) => /[$€£¥₹]|\d|\b(?:hour|hr|year|yr|month|annum|salary|pay)\b/i.test(String(value || ''));

  const readFirst = (selectors, scope, max, allowShort = true) => {
    const roots = [];
    if (scope instanceof Element) roots.push(scope);
    roots.push(document);
    for (const rootNode of roots) {
      for (const selector of selectors) {
        let el = null;
        try { el = rootNode.querySelector(selector); } catch { el = null; }
        if (!el) continue;
        const raw = textOf(el, max, allowShort) || attrText(el, ['aria-label', 'title']) || '';
        const text = cleanText(raw, max);
        if (text && !isChromePhrase(text)) return text;
      }
    }
    return '';
  };

  const extractIndeed = (scope) => ({
    title: readFirst([
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      'h1.jobsearch-JobInfoHeader-title',
      '.jobsearch-JobInfoHeader-title',
      '[data-testid="simpler-jobTitle"]',
      'h1.jobTitle',
    ], scope, 180),
    company: readFirst([
      '[data-testid="inlineHeader-companyName"] a',
      '[data-testid="inlineHeader-companyName"]',
      '[data-company-name="true"]',
      '[data-testid="company-name"]',
      '.jobsearch-InlineCompanyRating a',
    ], scope, 120),
    location: readFirst([
      '[data-testid="inlineHeader-companyLocation"]',
      '[data-testid="job-location"]',
      '#jobLocationText',
      '[data-testid="jobsearch-JobInfoHeader-companyLocation"]',
    ], scope, 120),
    salary: readFirst([
      '#salaryInfoAndJobType',
      '[data-testid="salaryInfoAndJobType"]',
      '.jobsearch-JobMetadataHeader-item',
    ], scope, 160),
    description: readFirst([
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '#jobDescription',
    ], scope, MAX_TEXT, false),
  });

  const extractGlassdoor = (scope) => ({
    title: readFirst([
      '[data-test="job-title"]',
      '[data-test="jobTitle"]',
      'h1[data-test="jobTitle"]',
      'h1[class*="JobDetails_jobTitle"]',
      '[class*="JobDetails_jobTitle"]',
    ], scope, 180),
    company: readFirst([
      '[data-test="employer-name"]',
      '[data-test="employerName"]',
      '[data-test="employer-short-name"]',
      '[class*="EmployerProfile_employerName"]',
    ], scope, 120),
    location: readFirst([
      '[data-test="location"]',
      '[data-test="emp-location"]',
      '[class*="JobDetails_location"]',
    ], scope, 120),
    salary: readFirst([
      '[data-test="detailSalary"]',
      '[data-test="salary-estimate"]',
      '[data-test="pay-range"]',
      '[class*="SalaryEstimate"]',
    ], scope, 160),
    description: readFirst([
      '[data-test="jobDescriptionContent"]',
      '#JobDescriptionContainer',
      '[class*="JobDetails_jobDescription"]',
      '.jobDescriptionContent',
    ], scope, MAX_TEXT, false),
  });

  const titleEl = pickBest(TITLE_SELECTORS, root);
  const descEl = pickBest(DESC_SELECTORS, root);

  // TITLE: extracted strictly from h1 or known title selectors within the focused
  // card — never from first-line of raw container text, which could be a badge label.
  let jobTitle = cleanText(
    attrText(titleEl, ['aria-label', 'title']) || textOf(titleEl, 180, true) || '',
    180,
  );
  // If the element-based title is garbage, try a strict h1 search scoped to the
  // focused card (not the whole document) before touching any container text.
  if (!jobTitle || isChromePhrase(jobTitle) || /^\s*(home|jobs|search|feed|linkedin)\s*$/i.test(jobTitle)) {
    jobTitle = cleanText(strictTitleFrom(focus || root), 180);
  }
  // Final fallback: first non-chrome line of the document title attribute — but
  // ONLY if it differs from the page's navigation title.
  if (!jobTitle && !isChromePhrase(document.title)) {
    const dt = cleanText(document.title.split('|')[0].split('-')[0].trim(), 180);
    if (dt.length >= 8 && dt.length <= 120 && !isChromePhrase(dt)) jobTitle = dt;
  }

  // DESCRIPTION — 4-tier extraction with strict isolation:
  //
  //  Tier 1 (best):  walkTextNodes(descEl)  — raw Text nodes; immune to GTranslate
  //  Tier 2:         paragraphsOf(descEl)   — <p>/<li>/<dd>; beats innerText blobs
  //  Tier 3:         walkTextNodes(root)    — fall back to focused card text nodes
  //  Tier 4 (last):  textOf(root)           — full innerText with noise stripped
  //
  // Each tier only activates when the previous returned < 80 chars.
  let jobDescription = '';

  if (descEl) {
    jobDescription = walkTextNodes(descEl, MAX_TEXT);
  }
  if (!jobDescription || jobDescription.length < 80) {
    if (descEl) jobDescription = paragraphsOf(descEl, MAX_TEXT);
  }
  if (!jobDescription || jobDescription.length < 80) {
    if (descEl) jobDescription = textOf(descEl, MAX_TEXT, false);
  }
  if (!jobDescription || jobDescription.length < 80) {
    jobDescription = walkTextNodes(root, MAX_TEXT);
  }
  if (!jobDescription || jobDescription.length < 80) {
    jobDescription = paragraphsOf(root, MAX_TEXT);
  }
  if (!jobDescription || jobDescription.length < 80) {
    jobDescription = textOf(root, MAX_TEXT, false);
  }

  const isolated = Boolean(focus || descEl) && (force || !looksLikeFeed(jobDescription));
  const requiredSkills = skillsFrom(root);
  let budget = budgetFrom(root, `${jobTitle}\n${jobDescription}`);
  let clientHistory = clientFrom(root);

  const onIndeed = /(^|\.)indeed\./.test(host);
  const onGlassdoor = /(^|\.)glassdoor\./.test(host);
  let platformFields = null;
  try {
    if (onIndeed) platformFields = extractIndeed(root);
    else if (onGlassdoor) platformFields = extractGlassdoor(root);
  } catch {
    platformFields = null;
  }

  if (platformFields) {
    if (!looksLikePay(platformFields.salary)) platformFields.salary = '';
    if (!platformFields.title) {
      const rawTitle = cleanText(document.title || '', 180);
      const stripped = rawTitle
        .replace(/\s*[|–-]\s*(indeed|glassdoor)(\.com)?.*$/i, '')
        .trim();
      const head = cleanText(stripped.split(/\s+-\s+/)[0], 180);
      if (head && head.length >= 4 && !isChromePhrase(head)) platformFields.title = head;
    }
    if (!platformFields.company && onIndeed) {
      const parts = String(document.title || '').split(/\s+-\s+/).map((part) => part.trim());
      if (parts.length >= 2 && !/indeed/i.test(parts[1])) platformFields.company = cleanText(parts[1], 120);
    }
    if (!platformFields.company && onGlassdoor) {
      const match = String(document.title || '').match(/\bat\s+([^|]+)/i);
      if (match) platformFields.company = cleanText(match[1], 120);
    }
    if (platformFields.title) jobTitle = platformFields.title;
    if (platformFields.description && platformFields.description.length >= 80) {
      jobDescription = platformFields.description;
    }
    if (platformFields.salary) budget = platformFields.salary;
    if (platformFields.company) clientHistory = platformFields.company;
  }

  const platformName = onIndeed ? 'Indeed'
    : onGlassdoor ? 'Glassdoor'
    : host.includes('linkedin') ? 'LinkedIn'
    : host.includes('upwork') ? 'Upwork'
    : '';

  const pageText = cleanText(
    [
      platformFields?.company ? `Company: ${platformFields.company}` : '',
      platformFields?.location ? `Location: ${platformFields.location}` : '',
      platformFields?.salary ? `Salary: ${platformFields.salary}` : '',
      jobTitle,
      jobDescription,
    ].filter(Boolean).join('\n\n'),
    MAX_TEXT,
  );

  const structuredJob = {
    platform: platformName,
    title: jobTitle,
    company: cleanText(platformFields?.company || '', 120),
    location: cleanText(platformFields?.location || '', 120),
    salary: cleanText(platformFields?.salary || '', 160),
    description: cleanText(jobDescription, MAX_TEXT),
    skills: requiredSkills,
    budget: cleanText(budget, 160),
    clientInfo: cleanText(clientHistory || platformFields?.company || '', MAX_FIELD),
  };

  const classified = classifyScrapedContent(href, jobTitle, pageText, isolated);
  // Include the page URL in the hash so SPA navigations that swap the job detail
  // pane always produce a different hash even if the title is re-used.
  const hash = hashScrapedText(`${classified.contentType}|${href}|${jobTitle}|${jobDescription}`);

  return {
    pageText,
    pageTitle:     jobTitle || (isChromePhrase(document.title) ? '' : document.title) || '',
    pageUrl:       href,
    jobTitle:      jobTitle || '',
    jobDescription: cleanText(jobDescription, MAX_TEXT),
    requiredSkills,
    budget:        cleanText(budget, 160),
    clientHistory: cleanText(clientHistory, MAX_FIELD),
    structuredJob,
    isolated,
    host,
    kind:          classified.kind,
    contentType:   classified.contentType,
    discarded:     classified.discarded,
    discardReason: classified.reason,
    pageLanguage:  detectPageLanguage(typeof document !== 'undefined' ? document : null),
    hash,
    signature: hash,
  };
}
