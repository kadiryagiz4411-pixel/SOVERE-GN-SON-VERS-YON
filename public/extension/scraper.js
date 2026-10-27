/**
 * Isolates the job or CV currently centered in the viewport.
 * Safe in page, content-script, and chrome.scripting.executeScript
 * (no closures, no chrome.* APIs).
 */

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
  '#onetrust-banner-sdk', '.cookie-banner', '.cookies', '.cookie-consent',
  '#goog-gt-tt', '.VIpgJd-yAWNEb-hvhgNd', '.gtx-trans', '.skiptranslate',
  '[data-purpose="translate"]', '[aria-label*="Translate"]', '[aria-label*="translate"]',
  '.global-nav', '.msg-overlay-list-bubble', '.artdeco-toast',
];

const SOVEREIGN_MAIN_SELECTORS = [
  'main', '[role="main"]', 'article',
  '.job-details', '.jobs-description', '.jobs-description__content',
  '[data-test*="job"]', '[data-test*="Job"]',
  '[data-test="JobDetails"]', '[data-test="Description"]',
  '.jobsearch-JobComponent', '.jobs-search__job-details',
];

const UI_CHROME_LINE = /^(translate(?: this page)?|türkçe|turkce|english|español|deutsch|français|sign in|log in|join now|menu|home|jobs|messaging|notifications|network|post a job|cookie(?:s)?(?: settings)?|accept(?: all)?|reject(?: all)?|see more|show more|follow|share|report(?: job)?|save(?: job)?|skip to (?:main )?content)$/i;

function isChromePhrase(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return !t || UI_CHROME_LINE.test(t);
}

function looksLikeUiChrome(title, text) {
  const compact = `${title || ''}\n${text || ''}`.replace(/\s+/g, ' ').trim();
  if (compact.length < 40) return true;
  const chromeHits = (compact.match(/translate this page|google çeviri|chrome.?çeviri|\btürkçe\b|cookie settings|sign in|join now|skip to main content/gi) || []).length;
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

function getMostVisibleElement(options) {
  const force = Boolean(options && options.force);
  const drawer = getOpenDetailPane();
  if (drawer && !sovereignIsNoiseElement(drawer)) return drawer;

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
    if (!force && sovereignIsLayoutShell(el)) continue;
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
    const clone = el.cloneNode(true);
    clone.querySelectorAll?.(SOVEREIGN_NOISE_SELECTORS.join(',')).forEach((node) => node.remove());
    clone.querySelectorAll?.('button, a, span, li').forEach((node) => {
      if (isChromePhrase(node.textContent || '')) node.remove();
    });
    const raw = cleanText(clone.innerText || clone.textContent || '', max);
    return cleanText(filterNoiseLines(raw, allowShortTitle), max);
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
    '.jobsearch-JobInfoHeader-title',
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
  // Try to isolate the actual job card wrapper first using closestJobCard().
  // This prevents returning a deeply nested span/div and ensures we scope
  // title/description extraction to the real card element.
  const rawFocus = getMostVisibleElement({ force });
  const focus = rawFocus ? (closestJobCard(rawFocus) || rawFocus) : rawFocus;
  const root = focus
    || getOpenDetailPane()
    || pickBest(SOVEREIGN_MAIN_SELECTORS)
    || document.querySelector('main, [role="main"], article')
    || document.body;
  if (root instanceof Element) root.setAttribute('data-sovereign-active-job', '1');

  const titleEl = pickBest(TITLE_SELECTORS, root);
  const descEl = pickBest(DESC_SELECTORS, root);

  let jobTitle = cleanText(
    attrText(titleEl, ['aria-label', 'title']) || textOf(titleEl, 180, true) || '',
    180,
  );
  if (isChromePhrase(jobTitle) || /^\s*(home|jobs|search|feed|linkedin)\s*$/i.test(jobTitle)) {
    const firstLine = (textOf(root, 400, true).split('\n').find((line) => {
      const t = line.trim();
      return t.length >= 8 && t.length <= 90 && !isChromePhrase(t);
    }) || '');
    jobTitle = cleanText(firstLine, 180);
  }

  let jobDescription = textOf(descEl || root, MAX_TEXT, false);
  if (!jobDescription || jobDescription.length < 80) {
    jobDescription = textOf(root, MAX_TEXT, false);
  }

  const isolated = Boolean(focus || descEl) && (force || !looksLikeFeed(jobDescription));
  const requiredSkills = skillsFrom(root);
  const budget = budgetFrom(root, `${jobTitle}\n${jobDescription}`);
  const clientHistory = clientFrom(root);

  // pageText must NOT mash budget/skills/clientHistory into the job description.
  // Keep it as title + clean body only — metadata is sent in dedicated fields so
  // the LLM never confuses "8 proposals" with a skill or "$35/hr" with job copy.
  const pageText = cleanText(
    [jobTitle, jobDescription].filter(Boolean).join('\n\n'),
    MAX_TEXT,
  );

  // Full structured object for the backend — every field is isolated.
  const structuredJob = {
    title:       jobTitle,
    description: cleanText(jobDescription, MAX_TEXT),
    skills:      requiredSkills,
    budget:      cleanText(budget, 160),
    clientInfo:  cleanText(clientHistory, MAX_FIELD),
  };

  const classified = classifyScrapedContent(href, jobTitle, pageText, isolated);
  const hash = hashScrapedText(`${classified.contentType}|${jobTitle}|${jobDescription}`);

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
    hash,
    signature: hash,
  };
}
