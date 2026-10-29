/**
 * Sovereign extension service worker — click-only scrape.
 * Auto-fill inserts text into editors. It never submits the form.
 */
importScripts('config.js', 'scraper.js');

let lastAnalyzedHash = '';
let analyzeSeq = 0;
// Set to true while forceViewportScan() is running so autoAnalyzeViewport()
// doesn't steal the analyzeSeq counter and cause forceViewportScan's own
// ANALYSIS_READY to be silently dropped by the seq guard.
let forcingScan = false;

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'SCRAPE_ACTIVE_TAB') {
    scrapeActiveTab()
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message || String(err) }));
    return true;
  }

  if (request.type === 'INJECT_PROPOSAL') {
    injectActiveTab(request.proposalText || '')
      .then((ok) => sendResponse({ success: ok }))
      .catch((err) => sendResponse({ success: false, error: err.message || String(err) }));
    return true;
  }

  if (request.type === 'PARSE_DOM') {
    postJson(PARSE_DOM_PATH, request.payload)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message || String(err) }));
    return true;
  }

  if (request.type === 'GENERATE_CV') {
    postJson(GENERATE_CV_PATH, request.payload)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message || String(err) }));
    return true;
  }

  if (request.type === 'SMART_MATCH') {
    const payload = { intent: 'smart-match', ...(request.payload || {}) };
    const path = typeof SMART_MATCH_PATH === 'string' ? SMART_MATCH_PATH : '/api/smart-match';
    postJson(path, payload)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message || String(err) }));
    return true;
  }

  if (request.type === 'FETCH_ME') {
    fetchMe(request.accessToken || '')
      .then((data) => {
        persistPlanFromMe(data);
        sendResponse({ success: true, data });
      })
      .catch((err) => sendResponse({ success: false, error: err.message || String(err) }));
    return true;
  }

  if (request.type === 'SYNC_SESSION') {
    const token = request.accessToken || '';
    const email = request.email || '';
    chrome.storage.local.set({
      'sovereign.session.v1': { accessToken: token, email, at: Date.now() },
    });
    fetchMe(token)
      .then((data) => {
        persistPlanFromMe(data, email);
        sendResponse({ success: true, data });
      })
      .catch((err) => sendResponse({ success: false, error: err.message || String(err) }));
    return true;
  }

  if (request.type === 'PING_API') {
    pingParseDom()
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message || String(err) }));
    return true;
  }

  if (request.type === 'JOB_TARGET_CHANGED' && request.data) {
    persistViewportTarget(request.data, false);
    return false;
  }

  if (request.type === 'VIEWPORT_FOCUS' && request.data) {
    persistViewportTarget(request.data, false);
    return false;
  }

  if (request.type === 'VIEWPORT_SCANNING') {
    return false;
  }

  if (request.type === 'FORCE_VIEWPORT_SCAN' || request.type === 'SCAN_ACTIVE_SCREEN') {
    scrapeActiveTab('SCAN_ACTIVE_SCREEN')
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message || String(err) }));
    return true;
  }

  if (request.type === 'GET_VIEWPORT_TARGET') {
    chrome.storage.local.get('sovereign.viewport.v1', (bag) => {
      sendResponse({ success: true, data: bag['sovereign.viewport.v1'] || null });
    });
    return true;
  }

  return false;
});

function apiUrl(path) {
  const base = canonicalizeApiBase(API_BASE_URL);
  const suffix = String(path || PARSE_DOM_PATH);
  return `${base}${suffix.startsWith('/') ? suffix : `/${suffix}`}`;
}

function parseDomEndpoint() {
  return apiUrl(PARSE_DOM_PATH);
}

function extensionHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-extension-id': chrome.runtime.id || '',
  };
}

/**
 * Race a promise against a fixed timeout.
 * Rejects with an Error when the timeout fires first.
 * Used by postJson() and scrapeActiveTab() so the sidepanel never hangs
 * indefinitely waiting for a slow/unreachable server or an unresponsive
 * content script.
 */
function withTimeout(promise, ms, label) {
  const timeoutPromise = new Promise((_resolve, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`[Sovereign] ${label || 'Request'} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]);
}

function fetchNoRedirect(url, init) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  return fetch(url, {
    cache: 'no-store',
    redirect: 'manual',
    signal: controller.signal,
    ...init,
    headers: { ...extensionHeaders(), ...(init?.headers || {}) },
  }).finally(() => clearTimeout(timeoutId));
}

function isLiveStatus(res) {
  return Boolean(res) && (res.status === 200 || res.status === 204);
}

async function pingParseDom() {
  const url = `${parseDomEndpoint()}?t=${Date.now()}`;
  const getRes = await fetchNoRedirect(url, { method: 'GET' });
  if (isLiveStatus(getRes)) return { ok: true, status: getRes.status, method: 'GET' };
  const optionsRes = await fetchNoRedirect(url, { method: 'OPTIONS' });
  if (isLiveStatus(optionsRes)) return { ok: true, status: optionsRes.status, method: 'OPTIONS' };
  throw new Error(`API HTTP ${getRes.status || optionsRes.status}`);
}

function persistViewportTarget(data, scanning) {
  if (data) {
    // We have fresh data — write directly without reading first to avoid the
    // async read-then-write race that lets a stale concurrent write win.
    chrome.storage.local.set({
      'sovereign.viewport.v1': { ...data, scanning: false, at: Date.now() },
    });
    return;
  }
  // No data — only update the scanning flag on the existing record.
  chrome.storage.local.get('sovereign.viewport.v1', (bag) => {
    const prev = bag['sovereign.viewport.v1'] || {};
    chrome.storage.local.set({
      'sovereign.viewport.v1': { ...prev, scanning: Boolean(scanning), at: Date.now() },
    });
  });
}

async function forceViewportScan() {
  lastAnalyzedHash = '';
  analyzeSeq += 1;
  const seq = analyzeSeq;
  forcingScan = true;

  // Wipe stale viewport from storage BEFORE scraping so the sidepanel cannot
  // read old job data from sovereign.viewport.v1 while the fresh scrape races.
  try {
    chrome.storage.local.set({
      'sovereign.viewport.v1': { scanning: true, flushed: true, at: Date.now() },
    });
  } catch {/**/ }

  let data;
  try {
    // 1. Scrape — content script handles force + noise-filter.
    data = await scrapeActiveTab('SCAN_ACTIVE_SCREEN');
  } finally {
    // Always release the lock so autoAnalyzeViewport can resume after this scan.
    forcingScan = false;
  }
  persistViewportTarget(data, false);

  if (!data || data.discarded || !data.pageText || data.pageText.length < 20) {
    // Discard path — notify sidepanel immediately, no LLM call.
    try {
      chrome.runtime.sendMessage({
        type: 'ANALYSIS_READY',
        data: { ...(data || {}), discarded: true, flushed: true, analysis: null },
      }, () => { void chrome.runtime.lastError; });
    } catch { /**/ }
    return data;
  }

  // 2. Parse-dom in the background so the sidepanel gets one pre-baked response.
  const bag = await chrome.storage.local.get('sovereign.settings.v1');
  const setts = bag['sovereign.settings.v1'] || {};
  const skills = skillListFromSettings(setts);
  const deep = settingsAllowDeep(setts);
  try {
    const analysis = await postJson(PARSE_DOM_PATH, {
      pageText: data.pageText || data.jobDescription,
      pageTitle: data.pageTitle || data.jobTitle,
      pageUrl: data.pageUrl,
      jobTitle: data.jobTitle,
      jobDescription: data.jobDescription || data.pageText,
      requiredSkills: data.requiredSkills || [],
      budget: data.budget,
      clientHistory: data.clientHistory,
      skills,
      experience: setts.experience,
      hourlyRate: Number(setts.hourlyRate) || undefined,
      matchDepth: deep ? 'deep' : 'basic',
      deepMatch: deep,
      scoreOnly: true,
    });
    if (seq !== analyzeSeq) return data; // newer scan superseded this one
    const enriched = { ...data, analysis };
    persistViewportTarget(enriched, false);
    try {
      chrome.runtime.sendMessage({ type: 'ANALYSIS_READY', data: enriched }, () => { void chrome.runtime.lastError; });
    } catch { /**/ }
    return enriched;
  } catch {
    // Parse-dom failed — return raw scrape so sidepanel can retry inline.
    return data;
  }
}

function skillListFromSettings(settings) {
  return String(settings?.skills || '')
    .split(/[,|\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .slice(0, 24);
}

function settingsAllowDeep(settings) {
  const email = String(settings?.accountEmail || '').trim().toLowerCase();
  const allow = typeof ADMIN_EMAILS !== 'undefined' ? ADMIN_EMAILS : ['kadiryagiz4411@gmail.com'];
  if (settings?.isAdmin === true || allow.includes(email)) return true;
  const tier = Number(settings?.appsumoTier || 0);
  if (tier >= 2) return true;
  if (tier === 1) return false;
  const status = String(settings?.subscriptionStatus || '').toLowerCase();
  if (['active', 'trialing', 'paid'].includes(status)) return true;
  const membership = String(settings?.membership || '').toLowerCase();
  if (membership === 'pro' || membership === 'elite') return true;
  return settings?.b2bAccess === true || settings?.workspace === 'dual' || settings?.workspace === 'b2b';
}

function gapLabels(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (typeof item === 'string') return item;
    return String(item?.area || item?.detail || '').trim();
  }).filter(Boolean).slice(0, 6);
}

function mergeSmartMatch(data, smart) {
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

async function autoAnalyzeViewport(data, force) {
  if (!data) return;
  // If a manual forced scan is running, yield entirely — forceViewportScan owns
  // the analyzeSeq counter for this cycle. Let it win.
  if (forcingScan) return;
  if (data.discarded) {
    lastAnalyzedHash = data.hash || lastAnalyzedHash;
    persistViewportTarget({ ...data, analysis: null, flushed: true, autoAnalyzed: true }, false);
    return;
  }
  const hash = data.hash || data.signature || '';
  if (!force && hash && hash === lastAnalyzedHash && data.analysis) return;
  const seq = ++analyzeSeq;
  lastAnalyzedHash = hash || lastAnalyzedHash;
  const bag = await chrome.storage.local.get('sovereign.settings.v1');
  const settings = bag['sovereign.settings.v1'] || {};
  const skills = skillListFromSettings(settings);
  const deep = settingsAllowDeep(settings);
  try {
    const analysis = await postJson(PARSE_DOM_PATH, {
      pageText: data.pageText || data.jobDescription,
      pageTitle: data.pageTitle || data.jobTitle,
      pageUrl: data.pageUrl,
      jobTitle: data.jobTitle,
      jobDescription: data.jobDescription || data.pageText,
      requiredSkills: data.requiredSkills || [],
      budget: data.budget,
      clientHistory: data.clientHistory,
      skills,
      experience: settings.experience,
      hourlyRate: Number(settings.hourlyRate) || undefined,
      matchDepth: deep ? 'deep' : 'basic',
      deepMatch: deep,
      scoreOnly: true,
    });
    if (seq !== analyzeSeq) return;
    if (analysis?.discarded) {
      persistViewportTarget({
        ...data,
        discarded: true,
        discardReason: analysis.discardReason || 'chrome',
        analysis: null,
        autoAnalyzed: true,
        flushed: true,
      }, false);
      try {
        chrome.runtime.sendMessage({
          type: 'ANALYSIS_READY',
          data: {
            discarded: true,
            flushed: true,
            discardReason: analysis.discardReason || 'chrome',
            hash,
          },
        }, () => {
          void chrome.runtime.lastError;
        });
      } catch {
        // Side panel may be closed.
      }
      return;
    }
    const next = { ...data, analysis, autoAnalyzed: true, flushed: false };
    persistViewportTarget(next, false);
    try {
      chrome.runtime.sendMessage({ type: 'ANALYSIS_READY', data: next }, () => {
        void chrome.runtime.lastError;
      });
    } catch {
      // Side panel may be closed.
    }
  } catch {
    if (seq !== analyzeSeq) return;
    persistViewportTarget({ ...data, autoAnalyzed: false }, false);
  }
}

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (!changeInfo.url) return;
  lastAnalyzedHash = '';
  analyzeSeq += 1;
});

function persistPlanFromMe(data, fallbackEmail) {
  if (!data || data.success === false) return;
  chrome.storage.local.get('sovereign.settings.v1', (bag) => {
    const prev = bag['sovereign.settings.v1'] || {};
    chrome.storage.local.set({
      'sovereign.settings.v1': {
        ...prev,
        accountEmail: data.email || fallbackEmail || prev.accountEmail || '',
        role: data.role || prev.role || '',
        isAdmin: Boolean(data.is_admin || data.isAdmin),
        b2bAccess: Boolean(data.b2b_access || data.hasB2BAccess),
        isAppsumoUser: Boolean(data.is_appsumo_user || data.isAppsumoUser),
        appsumoTier: Number(data.appsumo_tier || 0),
        remainingCredits: Number(data.remainingCredits ?? prev.remainingCredits ?? 0),
        monthlyCreditLimit: Number(data.monthlyCreditLimit ?? data.monthlyCredits ?? prev.monthlyCreditLimit ?? 0),
        subscriptionStatus: data.subscriptionStatus || prev.subscriptionStatus || 'unknown',
        canGenerate: data.canGenerate !== false,
        workspace: data.workspace || prev.workspace || 'b2c',
      },
    });
  });
}

async function fetchMe(accessToken) {
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const res = await fetchNoRedirect(`${apiUrl(EXTENSION_ME_PATH)}?t=${Date.now()}`, {
    method: 'GET',
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Server Error ${res.status}`);
  return data;
}

async function postJson(path, payload) {
  const res = await withTimeout(
    fetchNoRedirect(`${apiUrl(path)}?t=${Date.now()}`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
    15000,
    `POST ${path}`,
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Server Error ${res.status}`);
  return data;
}

function isRestrictedUrl(href) {
  return /^(chrome|edge|about|chrome-extension|moz-extension|devtools):/i.test(String(href || ''))
    || /chromewebstore\.google\.com|chrome\.google\.com\/webstore/i.test(String(href || ''));
}

async function scrapeActiveTab(messageType = 'SCRAPE_PAGE') {
  let tab;
  try {
    const focused = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    tab = focused?.[0];
    if (!tab?.id) {
      const current = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = current?.[0];
    }
  } catch (err) {
    throw new Error(err?.message || 'No active browser tab found.');
  }
  if (!tab?.id) throw new Error('No active browser tab found.');
  if (isRestrictedUrl(tab.url)) {
    throw new Error('Open a job board or public web page, then click Analyze. Chrome system pages cannot be read.');
  }

  try {
    // Wrap sendMessage in a 6-second timeout — the content script could be
    // unresponsive during Nuxt hydration or when the tab is still loading.
    const viaContent = await withTimeout(
      chrome.tabs.sendMessage(tab.id, { type: messageType || 'SCRAPE_PAGE' }).catch(() => null),
      6000,
      'content script scrape',
    ).catch(() => null);
    if (viaContent?.success && viaContent.data?.pageText) return viaContent.data;
  } catch {
    // Content script may not be loaded yet or timed out — fall through to executeScript.
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractActiveJob,
    });
    if (!results?.[0]?.result) throw new Error('Failed to extract page content.');
    return results[0].result;
  } catch (err) {
    const msg = err?.message || String(err);
    if (/permission to access the respective host/i.test(msg)) {
      throw new Error('Reload this unpacked extension so host permissions take effect, then click Analyze again.');
    }
    throw err;
  }
}

async function injectActiveTab(proposalText) {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    .then((tabs) => (tabs?.length ? tabs : chrome.tabs.query({ active: true, currentWindow: true })));
  if (!tab?.id) throw new Error('No active tab found.');
  if (isRestrictedUrl(tab.url)) {
    throw new Error('Cannot insert into Chrome system pages.');
  }

  try {
    const viaContent = await chrome.tabs.sendMessage(tab.id, {
      type: 'INJECT_PROPOSAL',
      proposalText,
    });
    if (viaContent?.success) return true;
  } catch {
    // Content script may not be loaded yet; fall back to executeScript.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ['autofill.js'],
    });
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: async (text) => {
        const run = typeof injectProposalToDOM === 'function'
          ? injectProposalToDOM
          : (typeof sovereignInjectProposal === 'function' ? sovereignInjectProposal : null);
        if (!run) return false;
        return Boolean(await run(text));
      },
      args: [proposalText],
    });
    return (results || []).some((entry) => Boolean(entry?.result));
  } catch (err) {
    const msg = err?.message || String(err);
    if (/permission to access the respective host/i.test(msg)) {
      throw new Error('Reload this unpacked extension so host permissions take effect, then try Auto-Fill again.');
    }
    throw err;
  }
}
