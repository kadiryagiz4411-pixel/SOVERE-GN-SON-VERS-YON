const CANONICAL_API = 'https://www.sovereignapp.pro';
const PARSE_DOM_URL = `${CANONICAL_API}/api/extension/parse-dom`;
const PING_URL = `${CANONICAL_API}/api/opportunities`;
const STORE = {
  SETTINGS: 'sovereign.settings.v1',
  PROPOSALS: 'sovereign.proposals.v1',
  CANDIDATES: 'sovereign.candidates.v1',
};
const DEFAULT_SETTINGS = {
  skills: '',
  hourlyRate: '',
  fixedRate: '',
  experience: 'mid',
  theme: 'obsidian',
  membership: 'unknown',
};

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
const errorBadge = document.getElementById('errorBadge');
const apiBadge = document.getElementById('apiBadge');
const apiStatusDetail = document.getElementById('apiStatusDetail');
const proposalListEl = document.getElementById('proposalList');
const cvListEl = document.getElementById('cvList');
const profileStatus = document.getElementById('profileStatus');
const planStatus = document.getElementById('planStatus');

let lastProposal = '';
let lastOutreach = '';
let lastCandidate = null;
let lastJobUrl = '';
let lastTitle = '';
let lastScore = 0;
let analyzing = false;
let settings = { ...DEFAULT_SETTINGS };

function apiBase() {
  try {
    return canonicalizeApiBase(typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : CANONICAL_API);
  } catch {
    return CANONICAL_API;
  }
}

function parsePath() {
  return typeof PARSE_DOM_PATH === 'string' ? PARSE_DOM_PATH : '/api/extension/parse-dom';
}

function parseDomUrl() {
  return `${apiBase()}${parsePath()}`;
}

function isRestrictedUrl(href) {
  return /^(chrome|edge|about|chrome-extension|moz-extension|devtools):/i.test(String(href || ''))
    || /chromewebstore\.google\.com|chrome\.google\.com\/webstore/i.test(String(href || ''));
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function storageGet(key, fallback) {
  try {
    const bag = await chrome.storage.local.get(key);
    if (bag[key] != null) return bag[key];
  } catch {}
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

async function storageSet(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch {}
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function skillListFromSettings() {
  return String(settings.skills || '')
    .split(/[,|\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 24);
}

function hideErrorBadge() {
  if (!errorBadge) return;
  errorBadge.classList.add('hidden');
  errorBadge.textContent = '';
}

function showError(message) {
  spinner?.classList.remove('on');
  analyzing = false;
  if (analyzeBtn) analyzeBtn.disabled = false;
  if (copyBtn) copyBtn.disabled = false;
  if (autofillBtn) autofillBtn.disabled = false;
  if (saveCandidateBtn) saveCandidateBtn.disabled = false;
  if (outreachBtn) outreachBtn.disabled = false;
  const text = message || 'Could not connect to Sovereign API.';
  if (statusEl) {
    statusEl.classList.add('err');
    statusEl.textContent = text;
  }
  if (errorBadge) {
    errorBadge.classList.remove('hidden');
    errorBadge.innerHTML = `<strong>Connection error.</strong> ${escapeHtml(text)}<br/><span style="opacity:.8">POST ${escapeHtml(parseDomUrl())}</span>`;
  }
}

function setBusy(on, message) {
  analyzing = on;
  if (analyzeBtn) analyzeBtn.disabled = on;
  if (copyBtn) copyBtn.disabled = on;
  if (autofillBtn) autofillBtn.disabled = on;
  if (saveCandidateBtn) saveCandidateBtn.disabled = on;
  if (outreachBtn) outreachBtn.disabled = on;
  spinner?.classList.toggle('on', on);
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.classList.remove('err');
  }
  if (!on) hideErrorBadge();
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
      skills: skillListFromSettings(),
      profile: {
        skills: skillListFromSettings(),
        experience: settings.experience,
        hourlyRate: Number(settings.hourlyRate) || null,
      },
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

function formatWhen(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return '';
  }
}

async function saveProposalRecord(record) {
  const list = await storageGet(STORE.PROPOSALS, []);
  const next = [record, ...(Array.isArray(list) ? list : [])].slice(0, 40);
  await storageSet(STORE.PROPOSALS, next);
  renderProposalList(next);
}

async function saveCandidateRecord(record) {
  const list = await storageGet(STORE.CANDIDATES, []);
  const next = [record, ...(Array.isArray(list) ? list : [])].slice(0, 40);
  await storageSet(STORE.CANDIDATES, next);
  renderCvList(next);
}

function renderProposalList(list) {
  if (!proposalListEl) return;
  if (!list?.length) {
    proposalListEl.innerHTML = '<div class="empty">No proposals saved yet. Analyze a job post to generate one.</div>';
    return;
  }
  proposalListEl.innerHTML = list.map((item) => `
    <article class="list-item" data-id="${escapeHtml(item.id)}">
      <h3>${escapeHtml(item.title || 'Untitled proposal')}</h3>
      <div class="when">${escapeHtml(formatWhen(item.at))} · ${escapeHtml(item.score || 0)}% match</div>
      <p>${escapeHtml(item.text || '')}</p>
      <div class="row">
        <button class="ghost" type="button" data-copy="${escapeHtml(item.id)}">Copy</button>
        <button class="danger" type="button" data-delete="${escapeHtml(item.id)}">Remove</button>
      </div>
    </article>
  `).join('');
}

function renderCvList(list) {
  if (!cvListEl) return;
  if (!list?.length) {
    cvListEl.innerHTML = '<div class="empty">No candidate cards yet. Analyze a resume or LinkedIn profile, then save it.</div>';
    return;
  }
  cvListEl.innerHTML = list.map((item) => `
    <article class="list-item" data-id="${escapeHtml(item.id)}">
      <h3>${escapeHtml(item.title || 'Candidate')}</h3>
      <div class="when">${escapeHtml(item.role || 'Profile')} · ${escapeHtml(item.score || 0)}% fit · ${escapeHtml(formatWhen(item.at))}</div>
      <p>${escapeHtml(item.summary || '')}</p>
      <div class="row">
        <button class="ghost" type="button" data-copy="${escapeHtml(item.id)}">Copy</button>
        <button class="danger" type="button" data-delete="${escapeHtml(item.id)}">Remove</button>
      </div>
    </article>
  `).join('');
}

function renderAnalysisResults(data, pageTitle, pageUrl) {
  const mode = data.detectedMode || data.type || 'JOB_PROPOSAL';
  const isJob = mode === 'JOB_PROPOSAL' || data.intent === 'JOB_POSTINGS';
  const isCv = mode === 'CV_EVALUATION' || data.intent === 'CANDIDATE_POOL';
  const isB2b = mode === 'B2B_COMMAND';
  const score = Number(data.compatibilityScore ?? data.overallScore ?? 0);
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  lastTitle = data.title || pageTitle || '';
  lastScore = safeScore;

  if (modeBadge) modeBadge.textContent = `⚡ Detected: ${data.platformLabel || (isJob ? 'Job Post' : isCv ? 'Candidate Profile' : 'B2B Lead')}`;
  if (badge) badge.textContent = `${safeScore}`;
  scoreRing?.style.setProperty('--p', String(safeScore));
  if (titleEl) titleEl.textContent = lastTitle || (isJob ? 'Job posting' : isCv ? 'Candidate' : 'Company');
  if (metaEl) metaEl.textContent = data.url || pageUrl || '';

  if (isJob) {
    if (scoreHeading) scoreHeading.textContent = 'Compatibility score';
    if (scoreLabel) {
      scoreLabel.textContent = data.onboardingRequired
        ? (data.matchMessage || 'Add at least two skills in Settings to unlock a real match score.')
        : `${safeScore}% fit with this brief`;
    }
    if (painHeading) painHeading.textContent = 'Technical pain point';
    if (bodyHeading) bodyHeading.textContent = 'Generated proposal';
    if (painEl) painEl.textContent = data.painPoint || data.summary || 'No pain point returned.';
    lastProposal = String(data.proposalText || '').trim();
    lastOutreach = '';
    lastCandidate = null;
    lastJobUrl = String(data.url || pageUrl || '').trim();
    if (proposalEl) proposalEl.textContent = lastProposal || 'No proposal generated.';
    if (lastProposal) {
      void saveProposalRecord({
        id: `${Date.now()}`,
        title: lastTitle,
        url: lastJobUrl,
        text: lastProposal,
        score: safeScore,
        at: Date.now(),
      });
    }
  } else if (isB2b) {
    if (scoreHeading) scoreHeading.textContent = 'Lead score';
    if (scoreLabel) scoreLabel.textContent = `${safeScore}% outreach priority`;
    if (painHeading) painHeading.textContent = 'Executive summary';
    if (bodyHeading) bodyHeading.textContent = 'Cold outreach draft';
    if (painEl) painEl.textContent = data.executiveSummary || data.summary || 'No summary returned.';
    lastOutreach = String(data.outreach || data.proposalText || '').trim();
    lastProposal = lastOutreach;
    lastCandidate = null;
    lastJobUrl = '';
    const makers = Array.isArray(data.decisionMakers) && data.decisionMakers.length
      ? `\n\nDecision-makers: ${data.decisionMakers.join(', ')}`
      : '';
    if (proposalEl) proposalEl.textContent = `${lastOutreach}${makers}`.trim() || 'No outreach generated.';
  } else {
    if (scoreHeading) scoreHeading.textContent = 'Fit score';
    if (scoreLabel) scoreLabel.textContent = `${safeScore}% candidate fit`;
    if (painHeading) painHeading.textContent = 'Why this candidate';
    if (bodyHeading) bodyHeading.textContent = 'Evaluation';
    if (painEl) painEl.textContent = data.whyThisCandidate || data.painPoint || 'No rationale returned.';
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
    if (proposalEl) proposalEl.textContent = extras || 'Candidate parsed.';
  }

  actionsJob?.classList.toggle('hidden', !isJob);
  actionsCv?.classList.toggle('hidden', !isCv);
  actionsB2b?.classList.toggle('hidden', !isB2b);
  if (copyBtn) copyBtn.disabled = !isJob || !lastProposal;
  if (autofillBtn) autofillBtn.disabled = !isJob || !lastProposal;
  if (viewJobLink) {
    const href = /^https?:\/\//i.test(lastJobUrl) ? lastJobUrl : '#';
    viewJobLink.href = href;
    const showLink = isJob && href !== '#';
    viewJobLink.classList.toggle('hidden', !showLink);
    actionsJobLink?.classList.toggle('hidden', !showLink);
  }
  if (saveCandidateBtn) saveCandidateBtn.disabled = !isCv;
  if (outreachBtn) outreachBtn.disabled = !isB2b || !lastOutreach;
  card?.classList.add('on');
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
    skills: skillListFromSettings(),
    experience: settings.experience,
    hourlyRate: Number(settings.hourlyRate) || undefined,
  };

  const viaWorker = await chrome.runtime.sendMessage({
    type: 'PARSE_DOM',
    apiBase: apiBase(),
    payload,
  }).catch(() => null);

  if (viaWorker?.success && viaWorker.data) return viaWorker.data;

  const response = await fetch(`${PARSE_DOM_URL}?t=${Date.now()}`, {
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
  card?.classList.remove('on');
  lastProposal = '';
  lastOutreach = '';
  lastCandidate = null;
  lastJobUrl = '';
  hideErrorBadge();
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
      showError('Could not reach https://www.sovereignapp.pro. Check that production is live, then try Analyze again.');
      return;
    }
    if (/permission to access the respective host/i.test(msg)) {
      showError('Reload this unpacked extension so host permissions take effect, then click Analyze again.');
      return;
    }
    showError(msg);
  }
}

function applyTheme(theme) {
  const next = theme === 'oled' ? 'oled' : 'obsidian';
  document.body.dataset.theme = next;
  document.getElementById('themeOled')?.classList.toggle('on', next === 'oled');
  document.getElementById('themeObsidian')?.classList.toggle('on', next === 'obsidian');
}

function applyMembership(plan) {
  const next = plan === 'pro' || plan === 'appsumo' ? plan : 'unknown';
  document.getElementById('planPro')?.classList.toggle('on', next === 'pro');
  document.getElementById('planLtd')?.classList.toggle('on', next === 'appsumo');
  if (planStatus) {
    planStatus.textContent = next === 'pro'
      ? 'Membership: Pro SaaS (LemonSqueezy).'
      : next === 'appsumo'
        ? 'Membership: AppSumo lifetime deal.'
        : 'Membership: not set on this device.';
  }
}

function fillSettingsForm() {
  const skills = document.getElementById('skills');
  const hourlyRate = document.getElementById('hourlyRate');
  const fixedRate = document.getElementById('fixedRate');
  const experience = document.getElementById('experience');
  if (skills) skills.value = settings.skills || '';
  if (hourlyRate) hourlyRate.value = settings.hourlyRate || '';
  if (fixedRate) fixedRate.value = settings.fixedRate || '';
  if (experience) experience.value = settings.experience || 'mid';
  applyTheme(settings.theme);
  applyMembership(settings.membership);
}

async function persistSettings(partial) {
  settings = { ...settings, ...partial };
  await storageSet(STORE.SETTINGS, settings);
  fillSettingsForm();
}

async function pingApi() {
  if (apiBadge) {
    apiBadge.textContent = 'API…';
    apiBadge.classList.remove('live', 'down');
  }
  if (apiStatusDetail) apiStatusDetail.textContent = `Checking ${CANONICAL_API} …`;
  try {
    const res = await fetch(`${PING_URL}?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    const ok = res.ok || res.status === 405 || res.status === 401;
    if (apiBadge) {
      apiBadge.textContent = ok ? 'Live' : 'Down';
      apiBadge.classList.toggle('live', ok);
      apiBadge.classList.toggle('down', !ok);
    }
    if (apiStatusDetail) {
      apiStatusDetail.textContent = ok
        ? `Connected to ${CANONICAL_API} (HTTP ${res.status}). Parse endpoint: ${PARSE_DOM_URL}`
        : `Sovereign API returned HTTP ${res.status}.`;
    }
    return ok;
  } catch (err) {
    if (apiBadge) {
      apiBadge.textContent = 'Down';
      apiBadge.classList.add('down');
      apiBadge.classList.remove('live');
    }
    if (apiStatusDetail) {
      apiStatusDetail.textContent = `Could not reach ${CANONICAL_API}. ${err?.message || ''}`.trim();
    }
    return false;
  }
}

function switchTab(tab) {
  const id = ['analyze', 'proposals', 'cvs', 'settings'].includes(tab) ? tab : 'analyze';
  document.querySelectorAll('.tab-view').forEach((view) => {
    view.classList.toggle('on', view.id === `tab-${id}`);
  });
  document.querySelectorAll('#nav button').forEach((btn) => {
    btn.classList.toggle('on', btn.dataset.tab === id);
  });
  if (id === 'settings') void pingApi();
}

document.getElementById('nav')?.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-tab]');
  if (!btn) return;
  switchTab(btn.dataset.tab);
});

analyzeBtn?.addEventListener('click', () => {
  void analyzeActivePage();
});

copyBtn?.addEventListener('click', async () => {
  if (!lastProposal) return;
  await copyText(lastProposal);
  setBusy(false, 'Proposal copied. Paste it yourself on the original job post — Sovereign never auto-submits.');
});

autofillBtn?.addEventListener('click', async () => {
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

saveCandidateBtn?.addEventListener('click', async () => {
  if (!lastCandidate) return;
  const blob = [
    lastCandidate.title || 'Candidate',
    lastCandidate.role || '',
    lastCandidate.url || '',
    `Fit ${lastCandidate.score}%`,
    lastCandidate.summary || '',
  ].filter(Boolean).join('\n');
  await copyText(blob);
  await saveCandidateRecord({
    id: `${Date.now()}`,
    title: lastCandidate.title || 'Candidate',
    role: lastCandidate.role || '',
    url: lastCandidate.url || '',
    summary: blob,
    score: lastCandidate.score || 0,
    at: Date.now(),
  });
  chrome.tabs.create({ url: `${CANONICAL_API}/talent-pool` }).catch(() => {});
  setBusy(false, 'Candidate saved locally and copied. Opening Sovereign B2B…');
});

outreachBtn?.addEventListener('click', async () => {
  if (!lastOutreach) return;
  await copyText(lastOutreach);
  setBusy(false, 'Cold outreach copied to clipboard.');
});

proposalListEl?.addEventListener('click', async (event) => {
  const copyId = event.target.closest('[data-copy]')?.getAttribute('data-copy');
  const deleteId = event.target.closest('[data-delete]')?.getAttribute('data-delete');
  const list = await storageGet(STORE.PROPOSALS, []);
  if (copyId) {
    const item = list.find((row) => row.id === copyId);
    if (item?.text) {
      await copyText(item.text);
      setBusy(false, 'Proposal copied.');
    }
  }
  if (deleteId) {
    const next = list.filter((row) => row.id !== deleteId);
    await storageSet(STORE.PROPOSALS, next);
    renderProposalList(next);
  }
});

cvListEl?.addEventListener('click', async (event) => {
  const copyId = event.target.closest('[data-copy]')?.getAttribute('data-copy');
  const deleteId = event.target.closest('[data-delete]')?.getAttribute('data-delete');
  const list = await storageGet(STORE.CANDIDATES, []);
  if (copyId) {
    const item = list.find((row) => row.id === copyId);
    if (item?.summary) {
      await copyText(item.summary);
      setBusy(false, 'Candidate card copied.');
    }
  }
  if (deleteId) {
    const next = list.filter((row) => row.id !== deleteId);
    await storageSet(STORE.CANDIDATES, next);
    renderCvList(next);
  }
});

document.getElementById('saveProfile')?.addEventListener('click', async () => {
  await persistSettings({
    skills: document.getElementById('skills')?.value || '',
    hourlyRate: document.getElementById('hourlyRate')?.value || '',
    fixedRate: document.getElementById('fixedRate')?.value || '',
    experience: document.getElementById('experience')?.value || 'mid',
  });
  const count = skillListFromSettings().length;
  if (profileStatus) {
    profileStatus.textContent = count < 2
      ? 'Saved. Add at least two skills so match scores can be calculated.'
      : `Saved ${count} skills for the match engine.`;
  }
});

document.getElementById('themeOled')?.addEventListener('click', () => {
  void persistSettings({ theme: 'oled' });
});
document.getElementById('themeObsidian')?.addEventListener('click', () => {
  void persistSettings({ theme: 'obsidian' });
});
document.getElementById('planPro')?.addEventListener('click', () => {
  void persistSettings({ membership: 'pro' });
});
document.getElementById('planLtd')?.addEventListener('click', () => {
  void persistSettings({ membership: 'appsumo' });
});
document.getElementById('pingApi')?.addEventListener('click', () => {
  void pingApi();
});

async function boot() {
  try {
    const stored = await storageGet(STORE.SETTINGS, DEFAULT_SETTINGS);
    settings = { ...DEFAULT_SETTINGS, ...(stored || {}) };
    fillSettingsForm();
    renderProposalList(await storageGet(STORE.PROPOSALS, []));
    renderCvList(await storageGet(STORE.CANDIDATES, []));
  } catch (err) {
    showError(err?.message || 'Could not load local settings.');
  }
  void pingApi();
  void analyzeActivePage();
}

boot();
