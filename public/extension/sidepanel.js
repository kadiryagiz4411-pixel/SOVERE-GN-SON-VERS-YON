const CANONICAL_API = 'https://sovereignapp.pro';
const PARSE_DOM_URL = `${CANONICAL_API}/api/extension/parse-dom`;
const STORE = {
  SETTINGS: 'sovereign.settings.v1',
  PROPOSALS: 'sovereign.proposals.v1',
  CANDIDATES: 'sovereign.candidates.v1',
  CVS: 'sovereign.tailored-cvs.v1',
  SESSION: 'sovereign.session.v1',
  LEADS: 'sovereign.leads.v1',
  VIEWPORT: 'sovereign.viewport.v1',
};
const DEFAULT_SETTINGS = {
  skills: '',
  hourlyRate: '',
  fixedRate: '',
  experience: 'mid',
  theme: 'obsidian',
  membership: 'unknown',
  accountEmail: '',
  role: '',
  workspaceMode: 'b2c',
  workspace: 'b2c',
  b2bAccess: false,
  isAdmin: false,
  isAppsumoUser: false,
  appsumoTier: 0,
  remainingCredits: 0,
  monthlyCreditLimit: 0,
  subscriptionStatus: 'unknown',
  canGenerate: true,
};

function isExtensionAdmin() {
  const email = String(settings.accountEmail || '').trim().toLowerCase();
  const allow = typeof ADMIN_EMAILS !== 'undefined' ? ADMIN_EMAILS : ['kadiryagiz4411@gmail.com'];
  return settings.isAdmin === true
    || settings.role === 'admin'
    || settings.role === 'superadmin'
    || allow.includes(email);
}

function appsumoTier() {
  return Number(settings.appsumoTier || 0);
}

function canUseB2B() {
  if (isExtensionAdmin()) return true;
  if (appsumoTier() >= 3) return true;
  if (appsumoTier() === 1 || appsumoTier() === 2) return false;
  return settings.b2bAccess === true
    || settings.workspace === 'dual'
    || settings.workspace === 'b2b';
}

function canUseDualWorkspace() {
  return isExtensionAdmin()
    || appsumoTier() >= 3
    || settings.workspace === 'dual'
    || (canUseB2B() && appsumoTier() !== 1 && appsumoTier() !== 2);
}

function canUseDeepMatch() {
  if (isExtensionAdmin()) return true;
  if (appsumoTier() >= 2) return true;
  if (appsumoTier() === 1) return false;
  const status = String(settings.subscriptionStatus || '').toLowerCase();
  if (['active', 'trialing', 'paid'].includes(status)) return true;
  const membership = String(settings.membership || '').toLowerCase();
  if (membership === 'pro' || membership === 'elite') return true;
  return settings.b2bAccess === true || settings.workspace === 'dual' || settings.workspace === 'b2b';
}

const APPSUMO_ZERO_MESSAGE = 'Monthly AppSumo credits reached. Credits will automatically refresh next month or upgrade your AppSumo Tier for more credits.';

function hidePaywall() {
  document.getElementById('paywall')?.classList.remove('on');
}

function showCreditResetBanner() {
  document.getElementById('creditResetBanner')?.classList.add('on');
}

function hideCreditResetBanner() {
  document.getElementById('creditResetBanner')?.classList.remove('on');
}

function showPaywall(kind) {
  const title = document.getElementById('paywallTitle');
  const body = document.getElementById('paywallBody');
  const cta = document.getElementById('paywallCta');
  if (kind === 'appsumo') {
    if (title) title.textContent = 'Monthly AppSumo credits reached';
    if (body) body.textContent = APPSUMO_ZERO_MESSAGE;
    if (cta) {
      cta.textContent = 'Upgrade AppSumo Tier';
      cta.href = 'https://sovereignapp.pro/pricing#appsumo';
    }
  } else if (kind === 'renew') {
    if (title) title.textContent = 'Renew your subscription';
    if (body) body.textContent = 'Your plan has expired or payment did not go through. Renew to restore CV, proposal, and extension access.';
    if (cta) {
      cta.textContent = 'Renew Subscription';
      cta.href = 'https://sovereignapp.pro/pricing';
    }
  } else {
    if (title) title.textContent = 'Upgrade your account';
    if (body) body.textContent = 'Your monthly credits are used up. Upgrade to keep generating CVs, proposals, and scrapes.';
    if (cta) {
      cta.textContent = 'Upgrade Account';
      cta.href = 'https://sovereignapp.pro/pricing';
    }
  }
  document.getElementById('paywall')?.classList.add('on');
}

function applyCreditBadge() {
  const el = document.getElementById('creditBadge');
  if (!el) return;
  if (isExtensionAdmin()) {
    el.classList.add('hidden');
    return;
  }
  if (!settings.isAppsumoUser && settings.subscriptionStatus === 'unknown' && !settings.accountEmail) {
    el.classList.add('hidden');
    return;
  }
  el.classList.remove('hidden');
  const remaining = Number(settings.remainingCredits || 0);
  const limit = Number(settings.monthlyCreditLimit || 0);
  el.classList.toggle('empty', remaining <= 0);
  if (settings.isAppsumoUser && remaining <= 0) showCreditResetBanner();
  else hideCreditResetBanner();
  if (settings.isAppsumoUser) {
    const tier = appsumoTier();
    const label = tier >= 3 ? 'T3' : tier === 2 ? 'T2' : tier === 1 ? 'T1' : '';
    el.textContent = remaining <= 0
      ? (label ? `AppSumo ${label} · resets next month` : 'Credits reset next month')
      : (limit > 0 ? `AppSumo ${label} ${remaining}/${limit}`.replace('  ', ' ') : `AppSumo credits ${remaining}`);
    return;
  }
  el.textContent = limit > 0 ? `Credits ${remaining}/${limit}` : `Credits ${remaining}`;
}

function assertGenerationAllowed() {
  if (isExtensionAdmin()) return true;
  if (!settings.accountEmail) return true;
  const remaining = Number(settings.remainingCredits || 0);
  if (settings.isAppsumoUser) {
    if (remaining <= 0) {
      hidePaywall();
      showCreditResetBanner();
      setBusy(false, APPSUMO_ZERO_MESSAGE);
      return false;
    }
    hideCreditResetBanner();
    return true;
  }
  const status = String(settings.subscriptionStatus || '').toLowerCase();
  if (['canceled', 'cancelled', 'expired', 'past_due', 'unpaid', 'paused'].includes(status)) {
    showPaywall('renew');
    setBusy(false, 'Renew your subscription to keep using the extension.');
    return false;
  }
  if (settings.canGenerate === false || remaining <= 0) {
    showPaywall('upgrade');
    setBusy(false, 'Upgrade your account to keep generating.');
    return false;
  }
  return true;
}

function effectiveMode() {
  if (canUseDualWorkspace()) return settings.workspaceMode === 'b2b' ? 'b2b' : 'b2c';
  return 'b2c';
}

function publicError(raw) {
  const text = String(raw || '');
  if (isExtensionAdmin()) return text || 'Unknown error';
  if (/too short|open a job|Open a job post/i.test(text)) {
    return 'Open a job post or profile, then try again.';
  }
  if (/readable text|enough readable/i.test(text)) {
    return 'Open a job post or profile, then try Analyze again.';
  }
  if (/permission|host permissions|Reload this unpacked/i.test(text)) {
    return 'Reload the extension, then try Analyze again.';
  }
  if (/system pages|chrome system/i.test(text)) {
    return 'Open a public web page, then try Analyze again.';
  }
  if (/no proposal editor|no editor found|Auto-Fill is not loaded/i.test(text)) {
    return 'Open the cover letter or proposal box on this page, then tap Auto-Fill again.';
  }
  return 'Service temporarily busy. Please try again in a few moments.';
}

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
let lastCv = '';
let lastJobUrl = '';
let lastTitle = '';
let lastScore = 0;
let lastMatch = {
  label: '',
  strengths: [],
  gaps: [],
  message: '',
  onboardingRequired: false,
  acceptanceScore: 0,
};
let lastJob = {
  title: '',
  url: '',
  description: '',
  skills: [],
  budget: '',
  clientHistory: '',
  kind: 'job',
  hash: '',
};
let lastTargetHash = '';
let viewportScoreTimer = 0;
let analyzing = false;
let scanSeq = 0;
let generatingCv = false;
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
  const text = publicError(message);
  if (statusEl) {
    statusEl.classList.add('err');
    statusEl.textContent = text;
  }
  if (errorBadge) {
    errorBadge.classList.remove('hidden');
    const detail = isExtensionAdmin()
      ? `<br/><span style="opacity:.8">POST ${escapeHtml(parseDomUrl())}</span>`
      : '';
    errorBadge.innerHTML = `<strong>Couldn’t finish this scan.</strong> ${escapeHtml(text)}${detail}`;
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
  if (u.includes('indeed.com')) return 'Indeed';
  return 'Upwork';
}

async function ingestOpportunity(pageData, analysis) {
  const mode = analysis?.detectedMode || analysis?.type;
  if (mode !== 'JOB_PROPOSAL' && analysis?.intent !== 'JOB_POSTINGS') return;
  const platform = detectOpportunityPlatform(pageData.pageUrl);
  const sessionBag = await storageGet(STORE.SESSION, null);
  const accessToken = sessionBag?.accessToken || '';
  const headers = {
    'Content-Type': 'application/json',
    'x-extension-id': chrome.runtime.id || '',
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  fetch(`${apiBase()}/api/opportunities?t=${Date.now()}`, {
    method: 'POST',
    cache: 'no-store',
    headers,
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
    cvListEl.innerHTML = '<div class="empty">No tailored CVs yet. Generate one from the open job.</div>';
    return;
  }
  cvListEl.innerHTML = list.map((item) => `
    <article class="list-item" data-id="${escapeHtml(item.id)}">
      <h3>${escapeHtml(item.title || 'Tailored CV')}</h3>
      <div class="when">${escapeHtml(item.score || 0)}% match · ${escapeHtml(formatWhen(item.at))}</div>
      <p>${escapeHtml(item.text || item.summary || '')}</p>
      <div class="row">
        <button class="ghost" type="button" data-copy="${escapeHtml(item.id)}">Copy</button>
        <button class="danger" type="button" data-delete="${escapeHtml(item.id)}">Remove</button>
      </div>
    </article>
  `).join('');
}

function matchBand(score) {
  if (score >= 80) return 'High Probability';
  if (score >= 60) return 'Strong Fit';
  if (score >= 40) return 'Partial Fit';
  return 'Low Fit';
}

function chipHtml(items, kind) {
  if (!items?.length) return `<span class="hint">None yet.</span>`;
  return items.map((item) => `<span class="chip ${kind}">${escapeHtml(item)}</span>`).join('');
}

function humanMatchCopy(analysis, title) {
  const raw = String(analysis?.matchNarrative || analysis?.matchMessage || '').trim();
  if (raw && !/here is your score|ai match result|match analytics|your score is/i.test(raw)) {
    return raw;
  }
  if (analysis?.onboardingRequired) {
    return 'Add at least two skills in Settings so this brief can be scored against your profile.';
  }
  const score = Number(analysis?.match_score ?? analysis?.matchScore ?? 0);
  const accept = Number(analysis?.acceptanceScore ?? analysis?.overallScore ?? score);
  const strengths = Array.isArray(analysis?.strengths)
    ? analysis.strengths
    : (Array.isArray(analysis?.matchedSkills) ? analysis.matchedSkills : []);
  const gaps = Array.isArray(analysis?.gaps)
    ? analysis.gaps
    : (Array.isArray(analysis?.missingSkills) ? analysis.missingSkills : []);
  const overlap = strengths.slice(0, 3).join(' & ') || 'the skills you listed';
  const gap = gaps[0] || '';
  const role = String(title || 'this brief').replace(/\s+/g, ' ').trim().slice(0, 72);
  const fit = score >= 80 ? 'high overlap' : score >= 60 ? 'solid overlap' : score >= 40 ? 'partial overlap' : 'thin overlap';
  let line = `${Math.round(score)}% fit — ${fit} on ${overlap}`;
  if (gap) line += `; the brief also asks for ${gap}`;
  line += `. Acceptance sits around ${Math.round(accept)}% if you lead with a first-week result`;
  if (gap) line += ` and cover ${gap} in one concrete example`;
  if (role) line += ` for ${role}`;
  return `${line}.`;
}

function updateMatchUi(analysis, title) {
  const score = Number(analysis?.match_score ?? analysis?.matchScore ?? analysis?.compatibilityScore ?? lastScore ?? 0);
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  const acceptRaw = Number(analysis?.acceptanceScore ?? analysis?.overallScore ?? safeScore);
  const accept = Number.isFinite(acceptRaw) ? Math.max(0, Math.min(100, Math.round(acceptRaw))) : safeScore;
  const label = analysis?.matchLabel || (analysis?.onboardingRequired ? 'Add skills' : matchBand(safeScore));
  const message = humanMatchCopy(analysis, title);
  lastScore = safeScore;
  lastMatch = {
    label,
    strengths: Array.isArray(analysis?.strengths) ? analysis.strengths : (analysis?.matchedSkills || []),
    gaps: Array.isArray(analysis?.gaps) ? analysis.gaps : (analysis?.missingSkills || []),
    message,
    onboardingRequired: Boolean(analysis?.onboardingRequired),
    acceptanceScore: accept,
  };

  const banner = document.getElementById('matchBanner');
  const bannerScore = document.getElementById('matchBannerScore');
  const bannerLabel = document.getElementById('matchBannerLabel');
  if (banner) banner.classList.add('on');
  if (bannerScore) bannerScore.textContent = lastMatch.onboardingRequired ? '—' : `${safeScore}%`;
  if (bannerLabel) {
    bannerLabel.textContent = lastMatch.onboardingRequired
      ? (lastMatch.message || 'Add at least two skills in Settings.')
      : message;
  }

  const matchEmpty = document.getElementById('matchEmpty');
  const matchCard = document.getElementById('matchCard');
  matchEmpty?.classList.add('hidden');
  matchCard?.classList.add('on');
  const ring = document.getElementById('matchRing');
  const badgeEl = document.getElementById('matchBadge');
  if (badgeEl) badgeEl.textContent = lastMatch.onboardingRequired ? '—' : String(safeScore);
  ring?.style.setProperty('--p', String(lastMatch.onboardingRequired ? 0 : safeScore));
  const matchTitle = document.getElementById('matchTitle');
  const matchLabel = document.getElementById('matchLabel');
  if (matchTitle) matchTitle.textContent = title || lastTitle || 'Open job';
  if (matchLabel) {
    matchLabel.textContent = lastMatch.onboardingRequired
      ? lastMatch.message
      : `${safeScore}% fit · ~${accept}% acceptance`;
  }
  const strengths = document.getElementById('matchStrengths');
  const gaps = document.getElementById('matchGaps');
  if (strengths) strengths.innerHTML = chipHtml(lastMatch.strengths, 'ok');
  if (gaps) gaps.innerHTML = chipHtml(lastMatch.gaps, 'gap');
  const note = document.getElementById('matchNote');
  if (note) note.textContent = message;
}

function renderCvPreview(text) {
  const preview = document.getElementById('cvPreview');
  if (!preview) return;
  const raw = String(text || '').replace(/^\s*[-*_]{3,}\s*$/gm, '').trim();
  const lines = raw.split('\n');
  const html = lines.map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (index === 0 && trimmed.length < 80 && !/^(professional summary|experience|education|skills)/i.test(trimmed)) {
      return `<div class="name">${escapeHtml(trimmed)}</div>`;
    }
    if (/^[A-Z][A-Z0-9 &/.-]{2,}$/.test(trimmed) || /^(professional summary|experience|education|skills|certifications)/i.test(trimmed)) {
      return `<h3>${escapeHtml(trimmed)}</h3>`;
    }
    return `${escapeHtml(line)}\n`;
  }).join('');
  preview.innerHTML = html || escapeHtml(raw);
}

function renderAnalysisResults(data, pageTitle, pageUrl) {
  const mode = data.detectedMode || data.type || 'JOB_PROPOSAL';
  const isJob = mode === 'JOB_PROPOSAL' || data.intent === 'JOB_POSTINGS';
  const isCv = mode === 'CV_EVALUATION' || data.intent === 'CANDIDATE_POOL';
  const isB2b = mode === 'B2B_COMMAND';
  const score = Number(data.match_score ?? data.matchScore ?? data.compatibilityScore ?? data.overallScore ?? 0);
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  lastTitle = data.title || data.jobTitle || pageTitle || '';
  lastScore = safeScore;
  lastJob = {
    title: lastTitle,
    url: data.url || pageUrl || '',
    description: data.jobDescription || lastJob.description || '',
    skills: Array.isArray(data.requiredSkills) ? data.requiredSkills : lastJob.skills,
    budget: data.budget || lastJob.budget || '',
    clientHistory: data.clientHistory || lastJob.clientHistory || '',
  };
  const cvJobMeta = document.getElementById('cvJobMeta');
  if (cvJobMeta) cvJobMeta.textContent = lastJob.title ? `Tailoring for: ${lastJob.title}` : 'No job isolated yet.';
  updateMatchUi(data, lastTitle);

  if (modeBadge) modeBadge.textContent = `⚡ Detected: ${data.platformLabel || (isJob ? 'Job Post' : isCv ? 'Candidate Profile' : 'B2B Lead')}`;
  if (badge) badge.textContent = `${safeScore}`;
  scoreRing?.style.setProperty('--p', String(safeScore));
  if (titleEl) titleEl.textContent = lastTitle || (isJob ? 'Job posting' : isCv ? 'Candidate' : 'Company');
  if (metaEl) metaEl.textContent = data.url || pageUrl || '';

  if (isJob) {
    if (scoreHeading) scoreHeading.textContent = 'Match';
    if (scoreLabel) scoreLabel.textContent = humanMatchCopy(data, lastTitle);
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
  const dispatchOut = document.getElementById('dispatchOutput');
  const dispatchActions = document.getElementById('dispatchActions');
  if (dispatchOut) {
    dispatchOut.textContent = lastProposal || lastOutreach || '';
    dispatchOut.classList.toggle('hidden', !(lastProposal || lastOutreach));
  }
  dispatchActions?.classList.toggle('hidden', !(lastProposal || lastOutreach));
  const leadCard = document.getElementById('leadCard');
  if (effectiveMode() === 'b2b' || isB2b) {
    leadCard?.classList.add('on');
    const leadTitle = document.getElementById('leadTitle');
    const leadMeta = document.getElementById('leadMeta');
    const leadClient = document.getElementById('leadClient');
    const leadMakers = document.getElementById('leadMakers');
    const leadOutreach = document.getElementById('leadOutreach');
    if (leadTitle) leadTitle.textContent = lastTitle || 'Lead';
    if (leadMeta) leadMeta.textContent = lastJobUrl || pageUrl || '';
    if (leadClient) leadClient.textContent = data.executiveSummary || data.clientHistory || data.painPoint || 'Client details captured from the open page.';
    if (leadMakers) {
      const makers = Array.isArray(data.decisionMakers) ? data.decisionMakers : [];
      leadMakers.textContent = makers.length ? makers.join(', ') : 'Not listed on this page.';
    }
    if (leadOutreach) leadOutreach.textContent = lastOutreach || lastProposal || '';
    void saveLeadRecord({
      id: `${Date.now()}`,
      title: lastTitle,
      url: lastJobUrl || pageUrl,
      text: lastOutreach || lastProposal || data.executiveSummary || '',
      at: Date.now(),
    });
  }
  setBusy(false, isJob ? 'Job analysis ready.' : isCv ? 'Candidate evaluation ready.' : 'B2B brief ready.');
  const leadStatus = document.getElementById('leadStatus');
  const dispatchStatus = document.getElementById('dispatchStatus');
  if (leadStatus) leadStatus.textContent = 'Lead captured. Copy outreach or open the B2B dashboard.';
  if (dispatchStatus) dispatchStatus.textContent = lastProposal ? 'Team pitch ready. Copy it — Sovereign never auto-submits.' : dispatchStatus.textContent;
}

function emptyPageData() {
  return {
    pageText: '',
    pageTitle: '',
    pageUrl: '',
    jobTitle: '',
    jobDescription: '',
    requiredSkills: [],
    budget: '',
    clientHistory: '',
    isolated: false,
    kind: 'job',
    contentType: '',
    discarded: false,
    discardReason: '',
    hash: '',
  };
}

function normalizePageData(raw, fallback = emptyPageData()) {
  const skills = Array.isArray(raw?.requiredSkills)
    ? raw.requiredSkills.map((item) => String(item)).filter(Boolean).slice(0, 16)
    : [];
  return {
    pageText: String(raw?.pageText || raw?.jobDescription || fallback.pageText || ''),
    pageTitle: String(raw?.jobTitle || raw?.pageTitle || fallback.pageTitle || ''),
    pageUrl: String(raw?.pageUrl || fallback.pageUrl || ''),
    jobTitle: String(raw?.jobTitle || raw?.pageTitle || fallback.jobTitle || ''),
    jobDescription: String(raw?.jobDescription || raw?.pageText || fallback.jobDescription || ''),
    requiredSkills: skills,
    budget: String(raw?.budget || fallback.budget || ''),
    clientHistory: String(raw?.clientHistory || fallback.clientHistory || ''),
    isolated: Boolean(raw?.isolated),
    kind: raw?.kind || fallback.kind || 'job',
    contentType: raw?.contentType || fallback.contentType || '',
    discarded: Boolean(raw?.discarded),
    discardReason: String(raw?.discardReason || raw?.reason || fallback.discardReason || ''),
    hash: String(raw?.hash || raw?.signature || fallback.hash || ''),
    analysis: raw?.analysis || null,
    autoAnalyzed: Boolean(raw?.autoAnalyzed),
    flushed: Boolean(raw?.flushed),
  };
}

function flushJobContext() {
  lastProposal = '';
  lastOutreach = '';
  lastCv = '';
  lastCandidate = null;
  lastScore = 0;
  lastMatch = {
    label: '',
    strengths: [],
    gaps: [],
    message: '',
    onboardingRequired: false,
    acceptanceScore: 0,
  };
  lastJob = {
    title: '',
    url: '',
    description: '',
    skills: [],
    budget: '',
    clientHistory: '',
    kind: 'job',
    hash: '',
    contentType: '',
  };
  lastTitle = '';
  lastJobUrl = '';
  lastTargetHash = '';
}

function setTargetBadge(state, title, kind, contentType) {
  const el = document.getElementById('targetBadge');
  const text = document.getElementById('targetBadgeText');
  if (!el || !text) return;
  el.classList.toggle('live', state === 'live');
  el.classList.toggle('scanning', state !== 'live');
  if (contentType === 'CANDIDATE_LIST' || kind === 'list') {
    el.classList.remove('live');
    el.classList.add('scanning');
    text.textContent = '🟡 Open a single job or profile';
    return;
  }
  if (state !== 'live') {
    text.textContent = '🟡 Scanning Viewport...';
    return;
  }
  const noun = kind === 'cv' || contentType === 'PROFILE_CV'
    ? 'CV'
    : kind === 'b2b'
      ? 'Lead'
      : 'Job';
  const name = String(title || noun).replace(/\s+/g, ' ').trim().slice(0, 72);
  text.textContent = `🟢 Active Target Identified: ${name}`;
}

function applyIsolatedJob(pageData) {
  lastJob = {
    title: pageData.jobTitle || pageData.pageTitle || '',
    url: pageData.pageUrl || '',
    description: pageData.jobDescription || pageData.pageText || '',
    skills: Array.isArray(pageData.requiredSkills) ? pageData.requiredSkills : [],
    budget: pageData.budget || '',
    clientHistory: pageData.clientHistory || '',
    kind: pageData.kind || 'job',
    hash: pageData.hash || '',
    contentType: pageData.contentType || '',
  };
  lastTitle = lastJob.title;
  lastJobUrl = lastJob.url;
  const cvJobMeta = document.getElementById('cvJobMeta');
  if (cvJobMeta) {
    cvJobMeta.textContent = lastJob.kind === 'cv'
      ? (lastJob.title ? `Profile on screen: ${lastJob.title}` : 'Profile isolated.')
      : (lastJob.title ? `Tailoring for: ${lastJob.title}` : 'No job isolated yet.');
  }
  if (titleEl) titleEl.textContent = lastJob.title || '';
  if (metaEl) metaEl.textContent = lastJob.url || '';
}

async function refreshViewportAnalysis(pageData) {
  if (!assertAccountOpen()) return;
  applyIsolatedJob(pageData);
  setTargetBadge('live', lastJob.title, lastJob.kind);
  if (skillListFromSettings().length < 2) {
    updateMatchUi({
      onboardingRequired: true,
      matchMessage: 'Add at least two skills in Settings so this brief can be scored against your profile.',
      match_score: 0,
      acceptanceScore: 0,
    }, lastJob.title);
    setBusy(false, lastJob.kind === 'cv'
      ? 'Profile isolated. Add at least two skills to score it.'
      : 'Job isolated. Add at least two skills to score it.');
    return;
  }
  setBusy(true, lastJob.kind === 'cv' ? 'Scoring the profile on screen…' : 'Scoring the job on screen…');
  try {
    const data = await postParseDom(pageData, { scoreOnly: true });
    const merged = await enrichWithSmartMatch(pageData, data);
    updateMatchUi(merged, lastJob.title);
    if (scoreLabel) scoreLabel.textContent = humanMatchCopy(merged, lastJob.title);
    const score = Number(merged.match_score ?? merged.matchScore ?? 0);
    const safe = Math.max(0, Math.min(100, Math.round(score)));
    if (badge) badge.textContent = String(safe);
    scoreRing?.style.setProperty('--p', String(safe));
    card?.classList.add('on');
    if (modeBadge) {
      modeBadge.textContent = lastJob.kind === 'cv'
        ? '⚡ Detected: Candidate Profile'
        : lastJob.kind === 'b2b'
          ? '⚡ Detected: B2B Lead'
          : '⚡ Detected: Job Post';
    }
    setBusy(false, lastJob.kind === 'cv'
      ? 'Profile on screen is scored. Generate a tailored CV when you want a rewrite.'
      : `Scoring “${String(lastJob.title || 'this job').slice(0, 52)}”. Generate Proposal to rewrite for this brief.`);
  } catch (err) {
    const msg = err?.message || String(err);
    if (/Failed to fetch|NetworkError|redirect|CORS|preflight|OPENAI|Vercel|API_KEY/i.test(msg)) {
      setBusy(false, 'Target updated. Scoring will retry on the next pause.');
      return;
    }
    setBusy(false, publicError(msg));
  }
}

function applyReadyAnalysis(pageData, analysis) {
  applyIsolatedJob(pageData);
  setTargetBadge('live', lastJob.title, lastJob.kind, lastJob.contentType);
  if (!analysis) return;
  updateMatchUi(analysis, lastJob.title);
  if (scoreLabel) scoreLabel.textContent = humanMatchCopy(analysis, lastJob.title);
  const score = Number(analysis.match_score ?? analysis.matchScore ?? 0);
  const safe = Math.max(0, Math.min(100, Math.round(score)));
  if (badge) badge.textContent = String(safe);
  scoreRing?.style.setProperty('--p', String(safe));
  card?.classList.add('on');
  if (modeBadge) {
    modeBadge.textContent = lastJob.kind === 'cv' || pageData.contentType === 'PROFILE_CV'
      ? '⚡ Detected: Candidate Profile'
      : lastJob.kind === 'b2b'
        ? '⚡ Detected: B2B Lead'
        : '⚡ Detected: Job Post';
  }
  setBusy(false, lastJob.kind === 'cv'
    ? 'Profile on screen is scored. Generate a tailored CV when you want a rewrite.'
    : `Scoring “${String(lastJob.title || 'this job').slice(0, 52)}”. Generate Proposal to rewrite for this brief.`);
}

function onViewportFocus(raw) {
  if (!raw) return;
  if (raw.flushed && !raw.pageText && !raw.jobDescription && !raw.analysis) {
    clearTimeout(viewportScoreTimer);
    flushJobContext();
    setTargetBadge('scanning');
    return;
  }
  const pageData = normalizePageData(raw);
  if (pageData.discarded || pageData.contentType === 'CANDIDATE_LIST' || pageData.kind === 'list') {
    clearTimeout(viewportScoreTimer);
    flushJobContext();
    lastTargetHash = pageData.hash || 'list';
    setTargetBadge('scanning', '', 'list', 'CANDIDATE_LIST');
    if (proposalEl) {
      proposalEl.textContent = pageData.discardReason === 'chrome'
        ? 'Ignored UI chrome (menus, translate, banners). Focus a job or profile.'
        : 'This looks like a list. Open one job or profile to score it.';
    }
    setBusy(false, pageData.discardReason === 'chrome'
      ? 'Focus the job description, not the page chrome.'
      : 'Open a single job or profile in the viewport.');
    return;
  }
  if (!pageData.pageText && !pageData.jobDescription) return;
  const hash = pageData.hash || '';
  if (hash && hash === lastTargetHash && (pageData.jobTitle || '') === (lastJob.title || '')) {
    clearTimeout(viewportScoreTimer);
    if (raw.analysis) applyReadyAnalysis(pageData, raw.analysis);
    else setTargetBadge('live', pageData.jobTitle || lastJob.title, pageData.kind, pageData.contentType);
    return;
  }
  if (hash && lastTargetHash && hash !== lastTargetHash) {
    flushJobContext();
    if (proposalEl) {
      proposalEl.textContent = pageData.kind === 'cv'
        ? 'Profile changed. Generate a tailored CV for this document.'
        : 'Target changed. Generate Proposal to write for this brief.';
    }
  }
  lastTargetHash = hash;
  applyIsolatedJob(pageData);
  setTargetBadge(raw.analysis ? 'live' : 'scanning', pageData.jobTitle, pageData.kind, pageData.contentType);
  if (raw.analysis) {
    applyReadyAnalysis(pageData, raw.analysis);
    return;
  }
  if (analyzing || generatingCv) return;
  clearTimeout(viewportScoreTimer);
  viewportScoreTimer = setTimeout(() => {
    void refreshViewportAnalysis(pageData);
  }, 420);
}

async function getActiveTabDOM() {
  const scraped = await chrome.runtime.sendMessage({ type: 'SCRAPE_ACTIVE_TAB' }).catch((err) => {
    throw new Error(err?.message || 'Could not read the active tab.');
  });
  if (scraped?.success && scraped.data) return normalizePageData(scraped.data);
  throw new Error(scraped?.error || 'Could not isolate the open job.');
}

async function postParseDom(pageData, options = {}) {
  const deep = canUseDeepMatch();
  const payload = {
    pageText: pageData.pageText,
    pageTitle: pageData.pageTitle,
    pageUrl: pageData.pageUrl,
    text: pageData.pageText,
    sourceUrl: pageData.pageUrl,
    jobTitle: pageData.jobTitle,
    jobDescription: pageData.jobDescription || pageData.pageText,
    requiredSkills: pageData.requiredSkills || [],
    budget: pageData.budget,
    clientHistory: pageData.clientHistory,
    skills: skillListFromSettings(),
    experience: settings.experience,
    hourlyRate: Number(settings.hourlyRate) || undefined,
    matchDepth: deep ? 'deep' : 'basic',
    deepMatch: deep,
    scoreOnly: Boolean(options.scoreOnly),
  };

  const viaWorker = await chrome.runtime.sendMessage({
    type: 'PARSE_DOM',
    apiBase: apiBase(),
    payload,
  }).catch(() => null);

  if (viaWorker?.success && viaWorker.data) return viaWorker.data;
  if (viaWorker?.error) throw new Error(viaWorker.error);

  const response = await fetch(`${PARSE_DOM_URL}?t=${Date.now()}`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-extension-id': chrome.runtime.id || '',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || `Server returned ${response.status}`);
  }
  return data;
}

function gapLabels(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === 'string') return item;
    return String(item?.area || item?.detail || '').trim();
  }).filter(Boolean).slice(0, 6);
}

async function enrichWithSmartMatch(pageData, data) {
  if (!canUseDeepMatch() || data?.onboardingRequired) return data;
  const payload = {
    intent: 'smart-match',
    jobDescription: pageData.jobDescription || pageData.pageText,
    jobTitle: pageData.jobTitle || pageData.pageTitle,
    skills: skillListFromSettings(),
    experience: settings.experience,
    hourlyRate: Number(settings.hourlyRate) || undefined,
    budget: pageData.budget,
    requiredSkills: pageData.requiredSkills || [],
    clientHistory: pageData.clientHistory,
    matchDepth: 'deep',
    deepMatch: true,
  };
  const viaWorker = await chrome.runtime.sendMessage({
    type: 'SMART_MATCH',
    apiBase: apiBase(),
    payload,
  }).catch(() => null);
  const smart = viaWorker?.success ? viaWorker.data : null;
  if (!smart) return data;
  const extraTip = Array.isArray(smart.applicationTips) ? String(smart.applicationTips[0] || '').trim() : '';
  const banned = /here is your score|ai match result|your score is/i;
  const narrative = String(data.matchNarrative || data.matchMessage || smart.matchNarrative || '').trim();
  const withTip = extraTip && !banned.test(extraTip) ? `${narrative} ${extraTip}`.trim() : narrative;
  return {
    ...data,
    match_score: data.match_score ?? data.matchScore,
    matchScore: data.matchScore ?? data.match_score,
    acceptanceScore: data.acceptanceScore,
    overallScore: data.acceptanceScore ?? data.overallScore,
    strengths: (Array.isArray(data.strengths) && data.strengths.length)
      ? data.strengths
      : gapLabels(smart.gapAnalysis?.strengths),
    gaps: (Array.isArray(data.gaps) && data.gaps.length)
      ? data.gaps
      : gapLabels(smart.gapAnalysis?.gaps),
    matchMessage: withTip,
    matchNarrative: withTip,
  };
}

function assertAccountOpen() {
  if (isExtensionAdmin()) return true;
  if (!settings.accountEmail) return true;
  if (settings.isAppsumoUser) {
    if (Number(settings.remainingCredits || 0) <= 0) showCreditResetBanner();
    return true;
  }
  const status = String(settings.subscriptionStatus || '').toLowerCase();
  if (['canceled', 'cancelled', 'expired', 'past_due', 'unpaid', 'paused'].includes(status)) {
    showPaywall('renew');
    setBusy(false, 'Renew your subscription to keep using the extension.');
    return false;
  }
  return true;
}

async function analyzeActivePage() {
  if (analyzing) return;
  if (!assertAccountOpen()) return;
  card?.classList.remove('on');
  lastProposal = '';
  lastOutreach = '';
  lastCandidate = null;
  lastJobUrl = '';
  hideErrorBadge();
  setBusy(true, 'Reading the active tab…');

  try {
    const pageData = await getActiveTabDOM();
    lastJob = {
      title: pageData.jobTitle || pageData.pageTitle,
      url: pageData.pageUrl,
      description: pageData.jobDescription || pageData.pageText,
      skills: pageData.requiredSkills || [],
      budget: pageData.budget || '',
      clientHistory: pageData.clientHistory || '',
      kind: pageData.kind || 'job',
      hash: pageData.hash || '',
    };
    lastTargetHash = pageData.hash || lastTargetHash;
    setTargetBadge('live', lastJob.title, lastJob.kind);
    const pageText = String(pageData.jobDescription || pageData.pageText || '').trim();
    if (pageText.length < 20) {
      throw new Error('This tab does not have enough readable text to analyze.');
    }

    setBusy(true, pageData.isolated ? 'Analyzing the job on screen…' : 'Analyzing the visible page…');
    const data = await postParseDom(pageData);
    const merged = await enrichWithSmartMatch(pageData, data);
    void ingestOpportunity(pageData, merged);
    renderAnalysisResults(merged, pageData.pageTitle, pageData.pageUrl);
  } catch (err) {
    console.error('DOM Extraction / API Error:', err);
    const msg = err?.message || String(err);
    if (/Failed to fetch|NetworkError|redirect|CORS|preflight|OPENAI|Vercel|API_KEY/i.test(msg)) {
      showError('Service temporarily busy. Please try again in a few moments.');
      return;
    }
    if (/permission to access the respective host/i.test(msg)) {
      showError('Reload the extension, then try Analyze again.');
      return;
    }
    showError(msg);
  }
}

async function rescanActiveScreen() {
  // Release any stuck lock — a deliberate click always wins.
  analyzing = false;
  const thisSeq = ++scanSeq;

  if (!assertAccountOpen()) return;

  // Flush ALL stale state so nothing from a previous job bleeds in.
  clearTimeout(viewportScoreTimer);
  lastTargetHash = '';
  lastJob = {
    title: '', url: '', description: '', skills: [],
    budget: '', clientHistory: '', kind: 'job', hash: '', contentType: '',
  };

  hideErrorBadge();
  setTargetBadge('scanning');
  setBusy(true, 'Scanning active screen…');
  analyzing = true;

  try {
    // Background scrapes (force + noise-filter) and bakes in a scoreOnly parse-dom.
    // If the LLM finished in time we get { ...rawScrape, analysis }; otherwise rawScrape only.
    const forced = await chrome.runtime.sendMessage({ type: 'SCAN_ACTIVE_SCREEN' }).catch(() => null);

    if (thisSeq !== scanSeq) return; // newer click superseded this scan

    const pageData = forced?.success && forced.data
      ? normalizePageData(forced.data)
      : await getActiveTabDOM();

    if (thisSeq !== scanSeq) return;

    // Discarded (chrome noise, list, empty).
    if (pageData.discarded) {
      flushJobContext();
      setTargetBadge('scanning');
      setBusy(false, pageData.discardReason === 'chrome'
        ? 'Focus the job description — the translate widget or nav was ignored.'
        : 'This looks like a list. Open one job to score it.');
      analyzing = false;
      return;
    }

    const pageText = String(pageData.jobDescription || pageData.pageText || '').trim();
    if (pageText.length < 20) {
      analyzing = false;
      throw new Error('This tab does not have enough readable text to analyze.');
    }

    // Commit the scraped job context immediately so the UI reflects the new target.
    lastJob = {
      title: pageData.jobTitle || pageData.pageTitle || '',
      url: pageData.pageUrl || '',
      description: pageData.jobDescription || pageData.pageText || '',
      skills: pageData.requiredSkills || [],
      budget: pageData.budget || '',
      clientHistory: pageData.clientHistory || '',
      kind: pageData.kind || 'job',
      hash: pageData.hash || '',
      contentType: pageData.contentType || '',
    };
    lastTargetHash = pageData.hash || '';
    setTargetBadge('live', lastJob.title, lastJob.kind);
    const cvJobMeta = document.getElementById('cvJobMeta');
    if (cvJobMeta) cvJobMeta.textContent = lastJob.kind === 'cv'
      ? (lastJob.title ? `Profile on screen: ${lastJob.title}` : 'Profile isolated.')
      : (lastJob.title ? `Tailoring for: ${lastJob.title}` : 'No job isolated yet.');
    if (titleEl) titleEl.textContent = lastJob.title || '';

    if (skillListFromSettings().length < 2) {
      updateMatchUi({
        onboardingRequired: true,
        matchMessage: 'Add at least two skills in Settings so this brief can be scored against your profile.',
        match_score: 0,
        acceptanceScore: 0,
      }, lastJob.title);
      setBusy(false, 'Isolated the job. Add at least two skills in Settings to score it.');
      analyzing = false;
      return;
    }

    // Use the analysis the background already computed — ZERO extra network calls.
    // Fall back to a single scoreOnly parse-dom if background timed out.
    // Never call enrichWithSmartMatch here; keeps total latency under ~800ms.
    let merged;
    const pre = forced?.data?.analysis;
    if (pre && !pre.discarded && (pre.matchScore !== undefined || pre.match_score !== undefined)) {
      merged = pre;
    } else {
      if (thisSeq !== scanSeq) return;
      merged = await postParseDom(pageData, { scoreOnly: true });
    }

    if (thisSeq !== scanSeq) return;

    updateMatchUi(merged, lastJob.title || pageData.pageTitle);
    if (titleEl && lastJob.title) titleEl.textContent = lastJob.title;
    if (scoreLabel) scoreLabel.textContent = humanMatchCopy(merged, lastJob.title);
    const score = Number(merged.match_score ?? merged.matchScore ?? 0);
    if (badge) badge.textContent = String(Math.max(0, Math.min(100, Math.round(score))));
    scoreRing?.style.setProperty('--p', String(Math.max(0, Math.min(100, Math.round(score)))));
    setBusy(false, pageData.isolated
      ? `Scoring "${String(lastJob.title || 'this job').slice(0, 52)}" — the pane on screen.`
      : 'Scanned. Open the job detail pane and Re-Scan for a tighter read.');
  } catch (err) {
    if (thisSeq !== scanSeq) return;
    const msg = err?.message || String(err);
    if (/Failed to fetch|NetworkError|redirect|CORS|preflight|OPENAI|Vercel|API_KEY/i.test(msg)) {
      showError('Service temporarily busy — try again in a moment.');
    } else if (/permission to access the respective host/i.test(msg)) {
      showError('Reload the extension, then scan again.');
    } else {
      showError(msg);
    }
  } finally {
    if (thisSeq === scanSeq) analyzing = false;
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

function applyAdminUi() {
  const admin = isExtensionAdmin();
  document.getElementById('adminDiagnostics')?.classList.toggle('hidden', !admin);
  if (apiBadge) apiBadge.classList.toggle('hidden', !admin);
}

function applyWorkspaceUi() {
  const mode = effectiveMode();
  const admin = isExtensionAdmin();
  const dual = canUseDualWorkspace();
  const pill = document.getElementById('planBadge');
  const slider = document.getElementById('adminSlider');
  if (pill) {
    pill.classList.remove('b2c', 'b2b', 'admin');
    if (admin) {
      pill.textContent = mode === 'b2b' ? 'ADMIN · B2B' : 'ADMIN · B2C';
      pill.classList.add('admin');
    } else if (mode === 'b2b') {
      pill.textContent = 'B2B';
      pill.classList.add('b2b');
    } else {
      pill.textContent = 'B2C';
      pill.classList.add('b2c');
    }
  }
  slider?.classList.toggle('on', dual);
  if (slider) slider.dataset.mode = mode;
  slider?.querySelectorAll('button[data-mode]').forEach((btn) => {
    btn.classList.toggle('on', btn.dataset.mode === mode);
  });
  document.getElementById('navB2c')?.classList.toggle('hidden', mode !== 'b2c');
  document.getElementById('navB2b')?.classList.toggle('hidden', mode !== 'b2b');
  applyCreditBadge();
  const current = document.querySelector('.tab-view.on')?.id?.replace('tab-', '');
  const allowed = mode === 'b2b'
    ? ['lead', 'dispatch', 'team', 'settings']
    : ['proposal', 'cv', 'match', 'settings'];
  if (!allowed.includes(current)) switchTab(allowed[0]);
  else {
    document.querySelectorAll('#navB2c button, #navB2b button').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.tab === current);
    });
  }
}

function fillSettingsForm() {
  const skills = document.getElementById('skills');
  const hourlyRate = document.getElementById('hourlyRate');
  const fixedRate = document.getElementById('fixedRate');
  const experience = document.getElementById('experience');
  const accountEmail = document.getElementById('accountEmail');
  if (skills) skills.value = settings.skills || '';
  if (hourlyRate) hourlyRate.value = settings.hourlyRate || '';
  if (fixedRate) fixedRate.value = settings.fixedRate || '';
  if (experience) experience.value = settings.experience || 'mid';
  if (accountEmail) accountEmail.value = settings.accountEmail || '';
  applyTheme(settings.theme);
  applyMembership(settings.membership);
  applyAdminUi();
  applyWorkspaceUi();
}

async function persistSettings(partial) {
  settings = { ...settings, ...partial };
  await storageSet(STORE.SETTINGS, settings);
  fillSettingsForm();
}

function setApiStatus(ok, detail) {
  const connectionStatus = document.getElementById('connectionStatus');
  if (connectionStatus) {
    connectionStatus.textContent = ok ? 'UP (Connected)' : 'Service temporarily busy';
    connectionStatus.style.color = ok ? '#10B981' : '#EF4444';
  }
  if (!isExtensionAdmin()) return;
  const statusElLocal = document.getElementById('api-status');
  if (apiBadge) {
    apiBadge.textContent = ok ? 'UP' : 'DOWN';
    apiBadge.classList.toggle('live', ok);
    apiBadge.classList.toggle('down', !ok);
  }
  if (apiStatusDetail) apiStatusDetail.textContent = detail;
  if (statusElLocal && statusElLocal !== apiStatusDetail) {
    statusElLocal.textContent = ok ? 'UP (Connected)' : 'DOWN';
    statusElLocal.style.color = ok ? '#10B981' : '#EF4444';
  }
}

async function pingApi() {
  const connectionStatus = document.getElementById('connectionStatus');
  if (connectionStatus) {
    connectionStatus.textContent = 'Checking connection…';
    connectionStatus.style.color = '';
  }
  if (isExtensionAdmin() && apiBadge) {
    apiBadge.textContent = 'API…';
    apiBadge.classList.remove('live', 'down');
  }
  if (isExtensionAdmin() && apiStatusDetail) {
    apiStatusDetail.textContent = `Checking ${PARSE_DOM_URL} …`;
  }
  try {
    const viaWorker = await chrome.runtime.sendMessage({ type: 'PING_API' }).catch(() => null);
    if (viaWorker?.success && viaWorker.data?.ok) {
      setApiStatus(true, `UP (Connected) via ${viaWorker.data.method || 'GET'} · ${PARSE_DOM_URL}`);
      return true;
    }
    throw new Error(viaWorker?.error || 'API unreachable');
  } catch (err) {
    setApiStatus(false, err?.message || 'Could not reach the parse-dom API.');
    return false;
  }
}

function switchTab(tab) {
  const mode = effectiveMode();
  const allowed = mode === 'b2b'
    ? ['lead', 'dispatch', 'team', 'settings']
    : ['proposal', 'cv', 'match', 'settings'];
  const id = allowed.includes(tab) ? tab : allowed[0];
  document.querySelectorAll('.tab-view').forEach((view) => {
    view.classList.toggle('on', view.id === `tab-${id}`);
  });
  document.querySelectorAll('#navB2c button, #navB2b button').forEach((btn) => {
    btn.classList.toggle('on', btn.dataset.tab === id);
  });
  if (id === 'settings') void pingApi();
}

document.getElementById('navB2c')?.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-tab]');
  if (!btn) return;
  switchTab(btn.dataset.tab);
});
document.getElementById('navB2b')?.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-tab]');
  if (!btn) return;
  if (!canUseB2B()) {
    switchTab('settings');
    if (profileStatus) profileStatus.textContent = 'B2B tools need an agency plan. Sign in on sovereignapp.pro.';
    return;
  }
  switchTab(btn.dataset.tab);
});
document.getElementById('adminSlider')?.addEventListener('click', (event) => {
  const btn = event.target.closest('button[data-mode]');
  if (!btn || !canUseDualWorkspace()) return;
  void persistSettings({ workspaceMode: btn.dataset.mode === 'b2b' ? 'b2b' : 'b2c' });
});

(function bindModeSliderSwipe() {
  const slider = document.getElementById('adminSlider');
  if (!slider) return;
  let startX = 0;
  let dragging = false;
  slider.addEventListener('pointerdown', (event) => {
    dragging = true;
    startX = event.clientX;
    try { slider.setPointerCapture(event.pointerId); } catch { /* ignore */ }
  });
  const finish = (event) => {
    if (!dragging) return;
    dragging = false;
    if (!canUseDualWorkspace()) return;
    const dx = event.clientX - startX;
    if (Math.abs(dx) < 36) return;
    void persistSettings({ workspaceMode: dx < 0 ? 'b2b' : 'b2c' });
  };
  slider.addEventListener('pointerup', finish);
  slider.addEventListener('pointercancel', () => { dragging = false; });
})();

document.getElementById('rescan')?.addEventListener('click', () => {
  // Cancel any queued viewport timer so a previous slow scan can't race this one.
  clearTimeout(viewportScoreTimer);
  analyzing = false;
  void rescanActiveScreen();
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
    if (!result?.success) {
      setBusy(false, 'Open the cover letter box on this page, then tap Auto-Fill again. Sovereign never auto-submits.');
      return;
    }
    setBusy(false, 'Proposal inserted. Review it, then submit yourself — Sovereign never auto-sends.');
  } catch (err) {
    setBusy(false, publicError(err.message || String(err)));
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
  const list = await storageGet(STORE.CVS, []);
  if (copyId) {
    const item = list.find((row) => row.id === copyId);
    const text = item?.text || item?.summary || '';
    if (text) {
      await copyText(text);
      setBusy(false, 'CV copied.');
    }
  }
  if (deleteId) {
    const next = list.filter((row) => row.id !== deleteId);
    await storageSet(STORE.CVS, next);
    renderCvList(next);
  }
});

document.getElementById('saveProfile')?.addEventListener('click', async () => {
  await persistSettings({
    skills: document.getElementById('skills')?.value || '',
    hourlyRate: document.getElementById('hourlyRate')?.value || '',
    fixedRate: document.getElementById('fixedRate')?.value || '',
    experience: document.getElementById('experience')?.value || 'mid',
    accountEmail: document.getElementById('accountEmail')?.value || '',
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

function setCvBusy(on, message) {
  generatingCv = on;
  const generateCvBtn = document.getElementById('generateCv');
  const copyCvBtn = document.getElementById('copyCv');
  const downloadCvBtn = document.getElementById('downloadCv');
  const cvSpinner = document.getElementById('cvSpinner');
  const cvStatus = document.getElementById('cvStatus');
  if (generateCvBtn) generateCvBtn.disabled = on;
  if (copyCvBtn) copyCvBtn.disabled = on || !lastCv;
  if (downloadCvBtn) downloadCvBtn.disabled = on || !lastCv;
  cvSpinner?.classList.toggle('on', on);
  if (cvStatus) cvStatus.textContent = message;
}

function profileNotes() {
  const skills = skillListFromSettings();
  return [
    skills.length ? `Skills: ${skills.join(', ')}` : '',
    settings.experience ? `Experience: ${settings.experience}` : '',
    settings.hourlyRate ? `Hourly rate: $${settings.hourlyRate}` : '',
    settings.fixedRate ? `Target project rate: $${settings.fixedRate}` : '',
    settings.accountEmail ? `Email: ${settings.accountEmail}` : '',
  ].filter(Boolean).join('\n');
}

function pdfEscape(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function toWinAnsi(value) {
  const map = {
    ş: 's', Ş: 'S', ı: 'i', İ: 'I', ğ: 'g', Ğ: 'G', ü: 'u', Ü: 'U', ö: 'o', Ö: 'O', ç: 'c', Ç: 'C',
    '—': '-', '–': '-', '’': "'", '“': '"', '”': '"',
  };
  return String(value || '').replace(/[^\x20-\x7E\n]/g, (ch) => map[ch] || ' ');
}

function wrapPdfLines(text, width) {
  const out = [];
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trimEnd();
    if (!line) {
      out.push('');
      continue;
    }
    let rest = line;
    while (rest.length > width) {
      let cut = rest.lastIndexOf(' ', width);
      if (cut < 20) cut = width;
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut).trim();
    }
    out.push(rest);
  }
  return out.slice(0, 80);
}

function downloadTextPdf(filename, title, body) {
  const lines = wrapPdfLines(toWinAnsi(`${title}\n\n${body}`), 86);
  const leading = 14;
  const startY = 800;
  const commands = ['BT', '/F1 11 Tf', '14 TL', `72 ${startY} Td`];
  lines.forEach((line, index) => {
    if (index) commands.push('T*');
    commands.push(`(${pdfEscape(line)}) Tj`);
  });
  commands.push('ET');
  const stream = commands.join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];
  let offset = 9;
  const offsets = [0];
  let pdf = '%PDF-1.4\n';
  for (const obj of objects) {
    offsets.push(offset);
    pdf += `${obj}\n`;
    offset += obj.length + 1;
  }
  const xrefStart = offset;
  pdf += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

async function saveLeadRecord(record) {
  const list = await storageGet(STORE.LEADS, []);
  const next = [record, ...(Array.isArray(list) ? list : [])].slice(0, 40);
  await storageSet(STORE.LEADS, next);
  renderTeamLeads(next);
}

function renderTeamLeads(list) {
  const el = document.getElementById('teamLeadList');
  if (!el) return;
  if (!list?.length) {
    el.innerHTML = '<div class="empty">No leads captured yet. Extract a company page or job brief.</div>';
    return;
  }
  el.innerHTML = list.map((item) => `
    <article class="list-item">
      <h3>${escapeHtml(item.title || 'Lead')}</h3>
      <div class="when">${escapeHtml(formatWhen(item.at))}</div>
      <p>${escapeHtml(item.text || '')}</p>
    </article>
  `).join('');
}

let resolvingAccess = false;
async function resolveWorkspaceAccess() {
  if (resolvingAccess) return;
  resolvingAccess = true;
  try {
    const sessionBag = await storageGet(STORE.SESSION, null);
    const accessToken = sessionBag?.accessToken || '';
    const viaWorker = await chrome.runtime.sendMessage({
      type: 'FETCH_ME',
      accessToken,
    }).catch(() => null);
    const data = viaWorker?.success ? viaWorker.data : null;
    if (!data?.success && !data?.signedIn && !accessToken) {
      applyWorkspaceUi();
      return;
    }
    const nextTier = Number(data?.appsumo_tier ?? settings.appsumoTier ?? 0);
    const nextWorkspace = data?.workspace || settings.workspace || 'b2c';
    const dual = Boolean(data?.is_admin || data?.isAdmin) || nextWorkspace === 'dual' || nextTier >= 3;
    await persistSettings({
      accountEmail: data?.email || settings.accountEmail,
      role: data?.role || settings.role,
      isAdmin: Boolean(data?.is_admin || data?.isAdmin),
      b2bAccess: Boolean(data?.b2b_access || data?.hasB2BAccess),
      isAppsumoUser: Boolean(data?.is_appsumo_user || data?.isAppsumoUser),
      appsumoTier: nextTier,
      remainingCredits: Number(data?.remainingCredits ?? settings.remainingCredits ?? 0),
      monthlyCreditLimit: Number(data?.monthlyCreditLimit ?? data?.monthlyCredits ?? settings.monthlyCreditLimit ?? 0),
      subscriptionStatus: data?.subscriptionStatus || settings.subscriptionStatus,
      canGenerate: data?.canGenerate !== false,
      workspace: nextWorkspace,
      workspaceMode: dual ? (settings.workspaceMode === 'b2b' ? 'b2b' : 'b2c') : 'b2c',
    });
    applyCreditBadge();
    hidePaywall();
    if (data?.is_appsumo_user && Number(data?.remainingCredits ?? 0) <= 0) {
      showCreditResetBanner();
    } else if (data?.saasExpired) {
      showPaywall('renew');
    }
  } catch {
    applyWorkspaceUi();
  } finally {
    resolvingAccess = false;
  }
}

async function saveCvRecord(record) {
  const list = await storageGet(STORE.CVS, []);
  const next = [record, ...(Array.isArray(list) ? list : [])].slice(0, 40);
  await storageSet(STORE.CVS, next);
  renderCvList(next);
}

async function generateTailoredCv() {
  if (generatingCv) return;
  if (!assertGenerationAllowed()) return;
  if (skillListFromSettings().length < 2) {
    setCvBusy(false, 'Add at least two skills in Settings before generating a CV.');
    switchTab('settings');
    return;
  }
  setCvBusy(true, 'Reading the open job…');
  try {
    const pageData = await getActiveTabDOM();
    lastJob = {
      title: pageData.jobTitle || pageData.pageTitle || lastJob.title,
      url: pageData.pageUrl || lastJob.url,
      description: pageData.jobDescription || pageData.pageText || lastJob.description,
      skills: pageData.requiredSkills || lastJob.skills,
      budget: pageData.budget || lastJob.budget,
      clientHistory: pageData.clientHistory || lastJob.clientHistory,
    };
    const cvJobMeta = document.getElementById('cvJobMeta');
    if (cvJobMeta) cvJobMeta.textContent = lastJob.title ? `Tailoring for: ${lastJob.title}` : 'No job isolated yet.';
    if (String(lastJob.description || '').trim().length < 20) {
      throw new Error('Open a job post, then generate the CV.');
    }
    setCvBusy(true, 'Writing a tailored CV…');
    const viaWorker = await chrome.runtime.sendMessage({
      type: 'GENERATE_CV',
      payload: {
        mode: 'generate-from-text',
        targetRole: lastJob.title,
        jobDescription: lastJob.description,
        existingCvText: profileNotes(),
        skills: skillListFromSettings(),
        experience: settings.experience,
        hourlyRate: Number(settings.hourlyRate) || undefined,
        outputLanguage: 'en',
      },
    }).catch(() => null);
    if (viaWorker?.error) throw new Error(viaWorker.error);
    const data = viaWorker?.success ? viaWorker.data : null;
    const cvText = String(data?.cv || data?.proposal || '').replace(/^\s*[-*_]{3,}\s*$/gm, '').trim();
    if (!cvText) throw new Error('Service temporarily busy. Please try again in a few moments.');
    lastCv = cvText;
    document.getElementById('cvCard')?.classList.add('on');
    renderCvPreview(cvText);
    const scored = await postParseDom(pageData, { scoreOnly: true }).catch(() => data || {});
    const merged = await enrichWithSmartMatch(pageData, scored);
    updateMatchUi(merged, lastJob.title);
    await saveCvRecord({
      id: `${Date.now()}`,
      title: lastJob.title || 'Tailored CV',
      url: lastJob.url,
      text: cvText,
      score: Number(merged?.match_score ?? merged?.matchScore ?? lastScore ?? 0),
      at: Date.now(),
    });
    setCvBusy(false, 'CV ready. Copy or download — Sovereign never auto-submits.');
  } catch (err) {
    const msg = publicError(err?.message || err);
    setCvBusy(false, msg);
  }
}

document.getElementById('extractLead')?.addEventListener('click', () => {
  if (!canUseB2B()) return;
  void analyzeActivePage();
});
document.getElementById('dispatchProposal')?.addEventListener('click', () => {
  if (!canUseB2B()) return;
  void analyzeActivePage();
});
document.getElementById('copyLead')?.addEventListener('click', async () => {
  const text = lastOutreach || lastProposal;
  if (!text) return;
  await copyText(text);
  const leadStatus = document.getElementById('leadStatus');
  if (leadStatus) leadStatus.textContent = 'Outreach copied.';
});
document.getElementById('copyDispatch')?.addEventListener('click', async () => {
  if (!lastProposal) return;
  await copyText(lastProposal);
  const dispatchStatus = document.getElementById('dispatchStatus');
  if (dispatchStatus) dispatchStatus.textContent = 'Copied for the team. Sovereign never auto-submits.';
});
document.getElementById('autofillDispatch')?.addEventListener('click', async () => {
  if (!lastProposal) return;
  const dispatchStatus = document.getElementById('dispatchStatus');
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'INJECT_PROPOSAL',
      proposalText: lastProposal,
    });
    if (dispatchStatus) {
      dispatchStatus.textContent = result?.success
        ? 'Inserted. Review it, then submit yourself.'
        : 'Open the editor on this page, then tap Auto-Fill again.';
    }
  } catch (err) {
    if (dispatchStatus) dispatchStatus.textContent = publicError(err.message || String(err));
  }
});

document.getElementById('paywallDismiss')?.addEventListener('click', () => {
  hidePaywall();
});

document.getElementById('generateCv')?.addEventListener('click', () => {
  void generateTailoredCv();
});
document.getElementById('copyCv')?.addEventListener('click', async () => {
  if (!lastCv) return;
  await copyText(lastCv);
  setCvBusy(false, 'CV copied.');
});
document.getElementById('downloadCv')?.addEventListener('click', () => {
  if (!lastCv) return;
  const slug = String(lastJob.title || 'sovereign-cv').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  downloadTextPdf(`${slug || 'sovereign-cv'}.pdf`, lastJob.title || 'Curriculum Vitae', lastCv);
  setCvBusy(false, 'PDF downloaded.');
});

async function boot() {
  try {
    const stored = await storageGet(STORE.SETTINGS, DEFAULT_SETTINGS);
    settings = { ...DEFAULT_SETTINGS, ...(stored || {}) };
    fillSettingsForm();
    renderProposalList(await storageGet(STORE.PROPOSALS, []));
    renderCvList(await storageGet(STORE.CVS, []));
    renderTeamLeads(await storageGet(STORE.LEADS, []));
    await resolveWorkspaceAccess();
    const viewport = await storageGet(STORE.VIEWPORT, null);
    if (viewport?.jobTitle || viewport?.pageText) {
      setTargetBadge('live', viewport.jobTitle || viewport.pageTitle, viewport.kind);
      applyIsolatedJob(normalizePageData(viewport));
      lastTargetHash = viewport.hash || viewport.signature || '';
    } else {
      setTargetBadge('scanning');
    }
  } catch (err) {
    showError(err?.message || 'Could not load local settings.');
  }
  void pingApi();
  void rescanActiveScreen();
}

chrome.runtime.onMessage.addListener((request) => {
  if (request?.type === 'VIEWPORT_SCANNING') {
    if (!analyzing && !generatingCv) setTargetBadge('scanning');
    return false;
  }
  if (request?.type === 'ANALYSIS_READY' && request.data) {
    onViewportFocus(request.data);
    return false;
  }
  if ((request?.type === 'VIEWPORT_FOCUS' || request?.type === 'JOB_TARGET_CHANGED') && request.data) {
    onViewportFocus(request.data);
    return false;
  }
  return false;
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[STORE.SETTINGS]?.newValue) {
    settings = { ...DEFAULT_SETTINGS, ...changes[STORE.SETTINGS].newValue };
    fillSettingsForm();
  }
  if (changes[STORE.SESSION]?.newValue) {
    void resolveWorkspaceAccess();
  }
  if (changes[STORE.VIEWPORT]?.newValue && !changes[STORE.VIEWPORT].newValue.scanning) {
    onViewportFocus(changes[STORE.VIEWPORT].newValue);
  }
});

boot();
