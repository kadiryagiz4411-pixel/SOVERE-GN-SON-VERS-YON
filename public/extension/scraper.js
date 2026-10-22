/**
 * Isolates the job currently in view (detail pane, drawer, selected card),
 * never the first card in the feed. Safe in page, content-script, and
 * chrome.scripting.executeScript (no closures, no chrome.* APIs).
 */
function extractActiveJob() {
  const MAX_TEXT = 12_000;
  const MAX_FIELD = 2_000;

  const visible = (el) => {
    if (!el || !(el instanceof Element)) return false;
    const r = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return r.width > 40 && r.height > 24 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
  };

  const collect = (selectors, root) => {
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
  };

  const viewportScore = (el) => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    const vw = window.innerWidth || 1200;
    const visH = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    const visW = Math.min(r.right, vw) - Math.max(r.left, 0);
    if (visH < 32 || visW < 32) return -1;
    const area = visH * visW;
    const cx = (r.left + r.right) / 2;
    const cy = (r.top + r.bottom) / 2;
    const dist = Math.hypot(cx - vw * 0.64, cy - vh * 0.46);
    const selected = el.matches?.(
      '[aria-current="true"], [aria-current="page"], [aria-selected="true"], [data-sovereign-active-job="1"]',
    ) || el.closest?.(
      '.jobs-search-results-list__list-item--active, .scaffold-layout__list-item--active, .vjs-highlight, [aria-current="true"]',
    );
    const dialog = el.closest?.('dialog, [role="dialog"], [aria-modal="true"], .air3-slider, .up-slider');
    const rightPane = r.left > vw * 0.28 ? 18000 : 0;
    return area - dist * 28 + (selected ? 90000 : 0) + (dialog ? 130000 : 0) + rightPane + Math.min(r.height, 920) * 10;
  };

  const pickBest = (selectors, root) => {
    const nodes = collect(selectors, root).filter(visible);
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

  const textOf = (el, max) => {
    if (!el) return '';
    const clone = el.cloneNode(true);
    clone.querySelectorAll?.(
      'nav, footer, script, style, iframe, noscript, [aria-hidden="true"], .sr-only',
    ).forEach((node) => node.remove());
    return cleanText(clone.innerText || clone.textContent || '', max);
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

  const FEED_SELECTORS = [
    '[data-test="job-tile-list"]',
    '[data-test="JobTile"]',
    'section[data-test="job-tile-list"]',
    '.jobs-search-results-list',
    '.scaffold-layout__list',
    '#mosaic-provider-jobcards',
    '.jobsearch-LeftPane',
    '.jobsearch-SerpJobCard',
    '[data-test="job-list"]',
    '.up-card-section.job-tile',
  ];

  const DETAIL_SELECTORS = [
    '[data-sovereign-active-job="1"]',
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
    'main article',
  ];

  const TITLE_SELECTORS = [
    '[data-test="job-title"]',
    '[data-test="JobTitle"]',
    'h4[data-test="job-title"]',
    'h2[data-test="job-title"]',
    '.job-details-jobs-unified-top-card__job-title',
    '.jobs-unified-top-card__job-title',
    'h1.t-24',
    'h1.jobsearch-JobInfoHeader-title',
    '.jobsearch-JobInfoHeader-title',
    '.PageProjectViewLogout-header-title',
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

  const SELECTED_CARD = [
    '[data-sovereign-active-job="1"]',
    '[aria-current="true"]',
    '[aria-current="page"]',
    '[aria-selected="true"]',
    '.jobs-search-results-list__list-item--active',
    '.scaffold-layout__list-item--active',
    'li.jobs-search-results__list-item--active',
    '.vjs-highlight',
    '[data-jk].vjs-highlight',
    '.jobsearch-ResultsList li[aria-selected="true"]',
    '[data-test="job-tile-list"] [aria-current]',
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
      if (label.length < 2 || label.length > 40 || seen.has(key)) continue;
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

  let detail = pickBest(DETAIL_SELECTORS);
  if (detail) {
    const feedHit = FEED_SELECTORS.some((selector) => {
      try { return detail.closest(selector); } catch { return false; }
    });
    if (feedHit && !detail.closest('[data-sovereign-active-job="1"]')) detail = null;
  }

  let selectedCard = pickBest(SELECTED_CARD);
  if (!detail && selectedCard) {
    const siblingPane = pickBest(DETAIL_SELECTORS, selectedCard.parentElement || document);
    detail = siblingPane || selectedCard;
  }

  const titleEl = pickBest(TITLE_SELECTORS, detail || undefined);
  const descEl = pickBest(DESC_SELECTORS, detail || undefined);
  const root = detail || descEl || titleEl || document.querySelector('main') || document.body;

  let jobTitle = cleanText(
    attrText(titleEl, ['aria-label', 'title']) || textOf(titleEl, 180) || '',
    180,
  );
  if (!jobTitle || /^\s*(home|jobs|search|feed)\s*$/i.test(jobTitle)) {
    jobTitle = cleanText(textOf(pickBest(TITLE_SELECTORS, root), 180) || document.title, 180);
  }

  let jobDescription = textOf(descEl || root, MAX_TEXT);
  if (!jobDescription || jobDescription.length < 80) {
    jobDescription = textOf(root, MAX_TEXT);
  }

  if (!jobDescription || looksLikeFeed(jobDescription)) {
    const pane = pickBest(DETAIL_SELECTORS) || document.querySelector('main, [role="main"], article');
    const paneText = textOf(pane, MAX_TEXT);
    if (paneText && !looksLikeFeed(paneText) && paneText.length >= 80) {
      jobDescription = paneText;
    }
  }

  const isolated = Boolean(detail || descEl) && !looksLikeFeed(jobDescription);
  const requiredSkills = skillsFrom(root);
  const budget = budgetFrom(root, `${jobTitle}\n${jobDescription}`);
  const clientHistory = clientFrom(root);

  const pageText = cleanText(
    [jobTitle, budget, requiredSkills.join(', '), clientHistory, jobDescription]
      .filter(Boolean)
      .join('\n\n'),
    MAX_TEXT,
  );

  return {
    pageText,
    pageTitle: jobTitle || document.title || '',
    pageUrl: href,
    jobTitle: jobTitle || '',
    jobDescription: cleanText(jobDescription, MAX_TEXT),
    requiredSkills,
    budget: cleanText(budget, 160),
    clientHistory: cleanText(clientHistory, MAX_FIELD),
    isolated,
    host,
    signature: `${jobTitle}|${cleanText(jobDescription, 80)}`.toLowerCase(),
  };
}
