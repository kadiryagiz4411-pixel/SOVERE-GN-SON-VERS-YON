const apiInput = document.getElementById('api');
const statusEl = document.getElementById('status');
const spinner = document.getElementById('spinner');
const card = document.getElementById('card');
const badge = document.getElementById('badge');
const titleEl = document.getElementById('title');
const painEl = document.getElementById('pain');
const proposalEl = document.getElementById('proposal');
const analyzeBtn = document.getElementById('analyze');
const autofillBtn = document.getElementById('autofill');

const DEFAULT_API = 'https://sovereignapp.pro';
let lastProposal = '';

chrome.storage.sync.get(['sovereign_api'], (stored) => {
  apiInput.value = stored.sovereign_api || localStorage.getItem('sovereign_api') || DEFAULT_API;
});

function setBusy(on, message) {
  analyzeBtn.disabled = on;
  spinner.classList.toggle('on', on);
  statusEl.textContent = message;
  statusEl.classList.toggle('err', false);
}

function showError(message) {
  spinner.classList.remove('on');
  analyzeBtn.disabled = false;
  statusEl.textContent = message;
  statusEl.classList.add('err');
}

analyzeBtn.addEventListener('click', async () => {
  const apiBase = apiInput.value.replace(/\/$/, '');
  localStorage.setItem('sovereign_api', apiBase);
  chrome.storage.sync.set({ sovereign_api: apiBase });
  card.classList.remove('on');
  lastProposal = '';
  setBusy(true, 'Analyzing Job Posting & Identifying Pain Points...');

  try {
    const scraped = await chrome.runtime.sendMessage({ type: 'SCRAPE_ACTIVE_TAB' });
    if (!scraped?.success) throw new Error(scraped?.error || 'Could not scrape this tab.');

    const { pageText, pageTitle, pageUrl } = scraped.data || {};
    const res = await fetch(`${apiBase}/api/extension/parse-dom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageText, pageTitle, pageUrl, text: pageText, sourceUrl: pageUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || `API ${res.status}`);

    const isJob = data.type === 'JOB_PROPOSAL' || data.intent === 'JOB_POSTINGS';
    const score = data.compatibilityScore ?? data.overallScore ?? '—';
    badge.textContent = `${score}% match`;
    titleEl.textContent = data.title || pageTitle || (isJob ? 'Job posting' : 'Candidate');
    painEl.textContent = data.painPoint || data.whyThisCandidate || data.summary || 'No summary returned.';
    lastProposal = data.proposalText || '';
    proposalEl.textContent = lastProposal || data.summary || 'No proposal generated for this page type.';
    autofillBtn.style.display = lastProposal ? 'block' : 'none';
    card.classList.add('on');
    setBusy(false, isJob ? 'Job analysis ready.' : 'Candidate profile parsed.');
  } catch (err) {
    showError(err.message || String(err));
  }
});

autofillBtn.addEventListener('click', async () => {
  if (!lastProposal) return;
  setBusy(true, 'Injecting cover letter into the page…');
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
