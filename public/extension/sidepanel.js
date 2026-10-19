const apiInput = document.getElementById('api');
const statusEl = document.getElementById('status');
const spinner = document.getElementById('spinner');
const card = document.getElementById('card');
const badge = document.getElementById('badge');
const scoreRing = document.getElementById('scoreRing');
const scoreLabel = document.getElementById('scoreLabel');
const titleEl = document.getElementById('title');
const metaEl = document.getElementById('meta');
const painEl = document.getElementById('pain');
const proposalEl = document.getElementById('proposal');
const analyzeBtn = document.getElementById('analyze');
const autofillBtn = document.getElementById('autofill');
const copyBtn = document.getElementById('copy');

const API_BASE_URL = 'https://www.sovereignapp.pro';
const PARSE_DOM_PATH = '/api/extension/parse-dom';
let lastProposal = '';

function canonicalizeApiBase(raw) {
  const trimmed = String(raw || '').trim().replace(/\/$/, '');
  if (!trimmed) return API_BASE_URL;
  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (url.hostname === 'sovereignapp.pro') url.hostname = 'www.sovereignapp.pro';
    return url.origin;
  } catch {
    return API_BASE_URL;
  }
}

function isRestrictedUrl(href) {
  return /^(chrome|edge|about|chrome-extension|moz-extension|devtools):/i.test(String(href || ''))
    || /chromewebstore\.google\.com|chrome\.google\.com\/webstore/i.test(String(href || ''));
}

chrome.storage.sync.get(['sovereign_api'], (stored) => {
  const next = canonicalizeApiBase(
    stored.sovereign_api || localStorage.getItem('sovereign_api') || API_BASE_URL,
  );
  apiInput.value = next;
});

function setBusy(on, message) {
  analyzeBtn.disabled = on;
  copyBtn.disabled = on;
  autofillBtn.disabled = on;
  spinner.classList.toggle('on', on);
  statusEl.textContent = message;
  statusEl.classList.remove('err');
}

function showError(message) {
  spinner.classList.remove('on');
  analyzeBtn.disabled = false;
  copyBtn.disabled = false;
  autofillBtn.disabled = false;
  statusEl.classList.add('err');
  statusEl.innerHTML = `
    <div style="color:#ef4444;font-size:12px;padding:8px;background:rgba(239,68,68,0.1);border-radius:6px;">
      <strong>Connection Error:</strong> ${message || 'Could not connect to Sovereign API.'}<br/>
      <span style="font-size:11px;opacity:0.8;">POST ${API_BASE_URL}${PARSE_DOM_PATH}</span>
    </div>
  `;
}

function renderAnalysisResults(data, pageTitle, pageUrl) {
  const isJob = data.type === 'JOB_PROPOSAL' || data.intent === 'JOB_POSTINGS';
  const score = Number(data.compatibilityScore ?? data.overallScore ?? 0);
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  badge.textContent = `${safeScore}`;
  scoreRing.style.setProperty('--p', String(safeScore));
  scoreLabel.textContent = `${safeScore}% compatibility with this page`;
  titleEl.textContent = data.title || pageTitle || (isJob ? 'Job posting' : 'Candidate');
  metaEl.textContent = data.url || pageUrl || '';
  painEl.textContent = data.painPoint || data.whyThisCandidate || data.summary || 'No summary returned.';
  lastProposal = String(data.proposalText || '').trim();
  proposalEl.textContent = lastProposal || data.summary || 'No proposal generated for this page type.';
  copyBtn.disabled = !lastProposal;
  autofillBtn.disabled = !lastProposal;
  card.classList.add('on');
  setBusy(false, isJob ? 'Job analysis ready.' : 'Candidate profile parsed.');
}

function extractPageContent() {
  const pageText = document.body?.innerText || '';
  const pageTitle = document.title || '';
  const pageUrl = window.location.href || '';
  return { pageText: pageText.slice(0, 80_000), pageTitle, pageUrl };
}

async function getActiveTabDOM() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    .then((tabs) => tabs?.length ? tabs : chrome.tabs.query({ active: true, currentWindow: true }));
  if (!tab || !tab.id) throw new Error('No active tab found.');
  if (isRestrictedUrl(tab.url)) {
    throw new Error('Open a job board or public web page, then click Analyze. Chrome system pages cannot be read.');
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContent,
    });
    if (!results || !results[0] || !results[0].result) {
      throw new Error('Failed to extract page content.');
    }
    return results[0].result;
  } catch (err) {
    const msg = err?.message || String(err);
    if (/permission to access the respective host|Cannot access contents|Cannot access a chrome/i.test(msg)) {
      const scraped = await chrome.runtime.sendMessage({ type: 'SCRAPE_ACTIVE_TAB' });
      if (scraped?.success && scraped.data) return scraped.data;
    }
    throw err;
  }
}

async function postParseDom(apiBase, pageData) {
  const payload = {
    pageText: pageData.pageText,
    pageTitle: pageData.pageTitle,
    pageUrl: pageData.pageUrl,
    text: pageData.pageText,
    sourceUrl: pageData.pageUrl,
  };

  const viaWorker = await chrome.runtime.sendMessage({
    type: 'PARSE_DOM',
    apiBase,
    payload,
  }).catch(() => null);

  if (viaWorker?.success && viaWorker.data) return viaWorker.data;

  const response = await fetch(`${apiBase}${PARSE_DOM_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

analyzeBtn.addEventListener('click', async () => {
  const apiBase = canonicalizeApiBase(apiInput.value || API_BASE_URL);
  apiInput.value = apiBase;
  localStorage.setItem('sovereign_api', apiBase);
  chrome.storage.sync.set({ sovereign_api: apiBase });
  card.classList.remove('on');
  lastProposal = '';
  setBusy(true, 'Reading active tab and analyzing with Sovereign AI...');

  try {
    const pageData = await getActiveTabDOM();
    const pageText = String(pageData.pageText || '').trim();
    if (pageText.length < 50) {
      throw new Error('This tab does not have enough readable text to analyze.');
    }

    const data = await postParseDom(apiBase, pageData);
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
});

copyBtn.addEventListener('click', async () => {
  if (!lastProposal) return;
  try {
    await navigator.clipboard.writeText(lastProposal);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = lastProposal;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  setBusy(false, 'Proposal copied to clipboard.');
});

autofillBtn.addEventListener('click', async () => {
  if (!lastProposal) return;
  setBusy(true, 'Injecting proposal into the active page…');
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'INJECT_PROPOSAL',
      proposalText: lastProposal,
    });
    if (!result?.success) throw new Error(result?.error || 'No cover-letter field found on this page.');
    setBusy(false, 'Proposal injected. Review it before sending.');
  } catch (err) {
    showError(err.message || String(err));
  }
});
