const statusEl = document.getElementById('status');
const spinner = document.getElementById('spinner');
const card = document.getElementById('card');
const modeBadge = document.getElementById('modeBadge');
const badge = document.getElementById('badge');
const scoreRing = document.getElementById('scoreRing');
const scoreLabel = document.getElementById('scoreLabel');
const scoreHeading = document.getElementById('scoreHeading');
const titleEl = document.getElementById('title');
const metaEl = document.getElementById('meta');
const painEl = document.getElementById('pain');
const painHeading = document.getElementById('painHeading');
const bodyHeading = document.getElementById('bodyHeading');
const proposalEl = document.getElementById('proposal');
const analyzeBtn = document.getElementById('analyze');
const copyBtn = document.getElementById('copy');
const autofillBtn = document.getElementById('autofill');
const viewJobLink = document.getElementById('viewJob');
const actionsJobLink = document.getElementById('actionsJobLink');
const saveCandidateBtn = document.getElementById('saveCandidate');
const outreachBtn = document.getElementById('outreach');
const actionsJob = document.getElementById('actionsJob');
const actionsCv = document.getElementById('actionsCv');
const actionsB2b = document.getElementById('actionsB2b');

let lastProposal = '';
let lastOutreach = '';
let lastCandidate = null;
let lastJobUrl = '';
let analyzing = false;

function apiBase() {
  return canonicalizeApiBase(API_BASE_URL);
}

function isRestrictedUrl(href) {
  return /^(chrome|edge|about|chrome-extension|moz-extension|devtools):/i.test(String(href || ''))
    || /chromewebstore\.google\.com|chrome\.google\.com\/webstore/i.test(String(href || ''));
}

function setBusy(on, message) {
  analyzing = on;
  analyzeBtn.disabled = on;
  copyBtn.disabled = on;
  if (autofillBtn) autofillBtn.disabled = on;
  saveCandidateBtn.disabled = on;
  outreachBtn.disabled = on;
  spinner.classList.toggle('on', on);
  statusEl.textContent = message;
  statusEl.classList.remove('err');
}

function showError(message) {
  spinner.classList.remove('on');
  analyzing = false;
  analyzeBtn.disabled = false;
  copyBtn.disabled = false;
  if (autofillBtn) autofillBtn.disabled = false;
  saveCandidateBtn.disabled = false;
  outreachBtn.disabled = false;
  statusEl.classList.add('err');
  statusEl.innerHTML = `
    <div style="color:#ef4444;font-size:12px;padding:8px;background:rgba(239,68,68,0.1);border-radius:6px;">
      <strong>Connection Error:</strong> ${message || 'Could not connect to Sovereign API.'}<br/>
      <span style="font-size:11px;opacity:0.8;">POST ${apiBase()}${PARSE_DOM_PATH}</span>
    </div>
  `;
}

function detectOpportunityPlatform(url) {
  const u = String(url || '').toLowerCase();
  if (u.includes('fiverr.com')) return 'Fiverr';
  if (u.includes('upwork.com')) return 'Upwork';
  if (u.includes('freelancer.com')) return 'Freelancer';
  if (u.includes('linkedin.com')) return 'LinkedIn';
  return 'Upwork';
}

function ingestOpportunity(pageData, analysis) {
  const mode = analysis?.detectedMode || analysis?.type;
  if (mode !== 'JOB_PROPOSAL' && analysis?.intent !== 'JOB_POSTINGS') return;
  const platform = detectOpportunityPlatform(pageData.pageUrl);
  fetch(`${apiBase()}/api/opportunities?t=${Date.now()}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'x-extension-id': chrome.runtime.id || '',
    },
    body: JSON.stringify({
      pageText: pageData.pageText,
      pageTitle: analysis.title || pageData.pageTitle,
      pageUrl: pageData.pageUrl,
      platform,
      items: [{
        platform,
        title: analysis.title || pageData.pageTitle,
        description: analysis.painPoint || analysis.summary || String(pageData.pageText || '').slice(0, 1200),
        url: pageData.pageUrl,
        budget: '',
        compatibilityScore: analysis.compatibilityScore || analysis.overallScore,
      }],
    }),
  }).catch(() => {});
}

function copyText(value) {
  const text = String(value || '').trim();
  if (!text) return Promise.resolve(false);
  return navigator.clipboard.writeText(text).then(() => true).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    return true;
  });
}

function renderAnalysisResults(data, pageTitle, pageUrl) {
  const mode = data.detectedMode || data.type || 'JOB_PROPOSAL';
  const isJob = mode === 'JOB_PROPOSAL' || data.intent === 'JOB_POSTINGS';
  const isCv = mode === 'CV_EVALUATION' || data.intent === 'CANDIDATE_POOL';
  const isB2b = mode === 'B2B_COMMAND';
  const score = Number(data.compatibilityScore ?? data.overallScore ?? 0);
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;

  modeBadge.textContent = `⚡ Detected: ${data.platformLabel || (isJob ? 'Job Post' : isCv ? 'Candidate Profile' : 'B2B Lead')}`;
  badge.textContent = `${safeScore}`;
  scoreRing.style.setProperty('--p', String(safeScore));
  titleEl.textContent = data.title || pageTitle || (isJob ? 'Job posting' : isCv ? 'Candidate' : 'Company');
  metaEl.textContent = data.url || pageUrl || '';

  if (isJob) {
    scoreHeading.textContent = 'Compatibility score';
    scoreLabel.textContent = `${safeScore}% fit with this brief`;
    painHeading.textContent = 'Technical pain point';
    bodyHeading.textContent = 'Generated proposal';
    painEl.textContent = data.painPoint || data.summary || 'No pain point returned.';
    lastProposal = String(data.proposalText || '').trim();
    lastOutreach = '';
    lastCandidate = null;
    lastJobUrl = String(data.url || pageUrl || '').trim();
    proposalEl.textContent = lastProposal || 'No proposal generated.';
  } else if (isB2b) {
    scoreHeading.textContent = 'Lead score';
    scoreLabel.textContent = `${safeScore}% outreach priority`;
    painHeading.textContent = 'Executive summary';
    bodyHeading.textContent = 'Cold outreach draft';
    painEl.textContent = data.executiveSummary || data.summary || 'No summary returned.';
    lastOutreach = String(data.outreach || data.proposalText || '').trim();
    lastProposal = lastOutreach;
    lastCandidate = null;
    lastJobUrl = '';
    const makers = Array.isArray(data.decisionMakers) && data.decisionMakers.length
      ? `\n\nDecision-makers: ${data.decisionMakers.join(', ')}`
      : '';
    proposalEl.textContent = `${lastOutreach}${makers}`.trim() || 'No outreach generated.';
  } else {
    scoreHeading.textContent = 'Fit score';
    scoreLabel.textContent = `${safeScore}% candidate fit`;
    painHeading.textContent = 'Why this candidate';
    bodyHeading.textContent = 'Evaluation';
    painEl.textContent = data.whyThisCandidate || data.painPoint || 'No rationale returned.';
    lastProposal = '';
    lastOutreach = '';
    lastJobUrl = '';
    lastCandidate = {
      title: data.title,
      role: data.role,
      url: data.url || pageUrl,
      summary: data.summary,
      score: safeScore,
      pros: data.pros || [],
      cons: data.cons || [],
    };
    const extras = [
      data.summary,
      Array.isArray(data.pros) && data.pros.length ? `Pros: ${data.pros.join('; ')}` : '',
      Array.isArray(data.cons) && data.cons.length ? `Watch: ${data.cons.join('; ')}` : '',
    ].filter(Boolean).join('\n\n');
    proposalEl.textContent = extras || 'Candidate parsed.';
  }

  actionsJob.classList.toggle('hidden', !isJob);
  actionsCv.classList.toggle('hidden', !isCv);
  actionsB2b.classList.toggle('hidden', !isB2b);
  copyBtn.disabled = !isJob || !lastProposal;
  if (autofillBtn) autofillBtn.disabled = !isJob || !lastProposal;
  if (viewJobLink) {
    const href = /^https?:\/\//i.test(lastJobUrl) ? lastJobUrl : '#';
    viewJobLink.href = href;
    const showLink = isJob && href !== '#';
    viewJobLink.classList.toggle('hidden', !showLink);
    if (actionsJobLink) actionsJobLink.classList.toggle('hidden', !showLink);
  }
  saveCandidateBtn.disabled = !isCv;
  outreachBtn.disabled = !isB2b || !lastOutreach;
  card.classList.add('on');
  setBusy(false, isJob ? 'Job analysis ready.' : isCv ? 'Candidate evaluation ready.' : 'B2B brief ready.');
}

function extractPageContent() {
  const pageText = document.body?.innerText || '';
  const pageTitle = document.title || '';
  const pageUrl = window.location.href || '';
  return { pageText: pageText.slice(0, 80_000), pageTitle, pageUrl };
}

async function getActiveTabDOM() {
  let tab;
  try {
    const current = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = current?.[0];
    if (!tab?.id) {
      const focused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      tab = focused?.[0];
    }
  } catch (err) {
    console.warn('Tab query failed:', err);
    return { pageText: '', pageTitle: '', pageUrl: '' };
  }

  if (!tab || !tab.id) {
    return { pageText: '', pageTitle: '', pageUrl: tab?.url || '' };
  }
  if (isRestrictedUrl(tab.url)) {
    throw new Error('Open a public web page, then click Analyze. Chrome system pages cannot be read.');
  }

  const fallback = {
    pageText: '',
    pageTitle: tab.title || '',
    pageUrl: tab.url || '',
  };

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContent,
    });
    const extracted = results?.[0]?.result;
    return {
      pageText: String(extracted?.pageText || fallback.pageText),
      pageTitle: String(extracted?.pageTitle || fallback.pageTitle),
      pageUrl: String(extracted?.pageUrl || fallback.pageUrl),
    };
  } catch (err) {
    const msg = err?.message || String(err);
    if (/permission to access the respective host|Cannot access contents|Cannot access a chrome/i.test(msg)) {
      try {
        const scraped = await chrome.runtime.sendMessage({ type: 'SCRAPE_ACTIVE_TAB' });
        if (scraped?.success && scraped.data) {
          return {
            pageText: String(scraped.data.pageText || ''),
            pageTitle: String(scraped.data.pageTitle || fallback.pageTitle),
            pageUrl: String(scraped.data.pageUrl || fallback.pageUrl),
          };
        }
      } catch (workerErr) {
        console.warn('Background scrape failed:', workerErr);
      }
    }
    return fallback;
  }
}

async function postParseDom(pageData) {
  const payload = {
    pageText: pageData.pageText,
    pageTitle: pageData.pageTitle,
    pageUrl: pageData.pageUrl,
    text: pageData.pageText,
    sourceUrl: pageData.pageUrl,
  };

  const viaWorker = await chrome.runtime.sendMessage({
    type: 'PARSE_DOM',
    apiBase: apiBase(),
    payload,
  }).catch(() => null);

  if (viaWorker?.success && viaWorker.data) return viaWorker.data;

  const response = await fetch(`https://www.sovereignapp.pro${PARSE_DOM_PATH}?t=${Date.now()}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'x-extension-id': chrome.runtime.id || '',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || viaWorker?.error || `Server returned ${response.status}`);
  }
  return data;
}

async function analyzeActivePage() {
  if (analyzing) return;
  card.classList.remove('on');
  lastProposal = '';
  lastOutreach = '';
  lastCandidate = null;
  lastJobUrl = '';
  setBusy(true, 'Reading the active tab…');

  try {
    const pageData = await getActiveTabDOM();
    const pageText = String(pageData.pageText || '').trim();
    if (pageText.length < 50) {
      throw new Error('This tab does not have enough readable text to analyze.');
    }

    setBusy(true, 'Classifying page and generating Sovereign output…');
    const data = await postParseDom(pageData);
    ingestOpportunity(pageData, data);
    renderAnalysisResults(data, pageData.pageTitle, pageData.pageUrl);
  } catch (err) {
    console.error('DOM Extraction / API Error:', err);
    const msg = err?.message || String(err);
    if (/Failed to fetch|NetworkError|redirect|CORS|preflight/i.test(msg)) {
      showError('Could not connect to Sovereign API. Ensure Vercel production is live and reachable.');
      return;
    }
    if (/permission to access the respective host/i.test(msg)) {
      showError('Reload this unpacked extension so the new host permissions take effect, then click Analyze again.');
      return;
    }
    showError(msg);
  }
}

analyzeBtn.addEventListener('click', () => {
  void analyzeActivePage();
});

copyBtn.addEventListener('click', async () => {
  if (!lastProposal) return;
  await copyText(lastProposal);
  setBusy(false, 'Proposal copied. Paste it yourself on the original job post — Sovereign never auto-submits.');
});

if (autofillBtn) {
  autofillBtn.addEventListener('click', async () => {
    if (!lastProposal) return;
    setBusy(true, 'Inserting proposal into the page editor…');
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'INJECT_PROPOSAL',
        proposalText: lastProposal,
      });
      if (!result?.success) throw new Error(result?.error || 'No proposal editor found on this page.');
      setBusy(false, 'Proposal inserted. Review it, then submit yourself — Sovereign never auto-sends.');
    } catch (err) {
      showError(err.message || String(err));
    }
  });
}

saveCandidateBtn.addEventListener('click', async () => {
  if (!lastCandidate) return;
  const blob = [
    lastCandidate.title || 'Candidate',
    lastCandidate.role || '',
    lastCandidate.url || '',
    `Fit ${lastCandidate.score}%`,
    lastCandidate.summary || '',
  ].filter(Boolean).join('\n');
  await copyText(blob);
  chrome.tabs.create({ url: 'https://www.sovereignapp.pro/talent-pool' }).catch(() => {});
  setBusy(false, 'Candidate summary copied. Opening Sovereign B2B…');
});

outreachBtn.addEventListener('click', async () => {
  if (!lastOutreach) return;
  await copyText(lastOutreach);
  setBusy(false, 'Cold outreach copied to clipboard.');
});

void analyzeActivePage();
