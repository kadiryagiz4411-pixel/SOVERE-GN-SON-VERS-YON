/**
 * Sovereign extension service worker — click-only scrape.
 * Auto-fill inserts text into editors. It never submits the form.
 */
importScripts('config.js', 'scraper.js');

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

function fetchNoRedirect(url, init) {
  return fetch(url, {
    cache: 'no-store',
    redirect: 'manual',
    ...init,
    headers: { ...extensionHeaders(), ...(init?.headers || {}) },
  });
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
  const res = await fetchNoRedirect(`${apiUrl(path)}?t=${Date.now()}`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || `Server Error ${res.status}`);
  return data;
}

function isRestrictedUrl(href) {
  return /^(chrome|edge|about|chrome-extension|moz-extension|devtools):/i.test(String(href || ''))
    || /chromewebstore\.google\.com|chrome\.google\.com\/webstore/i.test(String(href || ''));
}

async function scrapeActiveTab() {
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
    const viaContent = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_PAGE' }).catch(() => null);
    if (viaContent?.success && viaContent.data?.pageText) return viaContent.data;
  } catch {
    // Content script may not be loaded yet.
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
