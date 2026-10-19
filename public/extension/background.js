/**
 * Sovereign extension service worker — click-only scrape.
 * Never injects into forms and never auto-submits proposals.
 */
importScripts('config.js');

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

  if (request.type === 'PARSE_DOM') {
    parseDomViaApi(request.apiBase, request.payload)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message || String(err) }));
    return true;
  }

  return false;
});

async function parseDomViaApi(apiBase, payload) {
  const bases = [...new Set([canonicalizeApiBase(apiBase), API_BASE_URL])];
  let lastError;
  for (const base of bases) {
    try {
      const res = await fetch(`${base}/api/extension/parse-dom?t=${Date.now()}`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          'x-extension-id': chrome.runtime.id || '',
        },
        body: JSON.stringify(payload || {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || `Server Error ${res.status}`);
      return data;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Could not connect to Sovereign API.');
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
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContent,
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

function extractPageContent() {
  const pageText = document.body?.innerText || '';
  const pageTitle = document.title || '';
  const pageUrl = window.location.href || '';
  return { pageText: pageText.slice(0, 80_000), pageTitle, pageUrl };
}
