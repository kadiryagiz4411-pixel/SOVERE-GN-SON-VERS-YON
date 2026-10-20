/**
 * Sovereign extension service worker — click-only scrape.
 * Auto-fill inserts text into editors. It never submits the form.
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

  if (request.type === 'INJECT_PROPOSAL') {
    injectActiveTab(request.proposalText || '')
      .then((ok) => sendResponse({ success: ok }))
      .catch((err) => sendResponse({ success: false, error: err.message || String(err) }));
    return true;
  }

  if (request.type === 'PARSE_DOM') {
    parseDomViaApi(request.apiBase, request.payload)
      .then((data) => sendResponse({ success: true, data }))
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

function parseDomEndpoint() {
  return `${canonicalizeApiBase(API_BASE_URL)}/api/extension/parse-dom`;
}

function extensionHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-extension-id': chrome.runtime.id || '',
  };
}

async function pingParseDom() {
  const url = `${parseDomEndpoint()}?t=${Date.now()}`;
  const optionsRes = await fetch(url, { method: 'OPTIONS', headers: extensionHeaders() });
  if (optionsRes.ok || optionsRes.status === 204) {
    return { ok: true, status: optionsRes.status, method: 'OPTIONS' };
  }
  const getRes = await fetch(url, { method: 'GET', cache: 'no-store', headers: extensionHeaders() });
  if (getRes.ok) return { ok: true, status: getRes.status, method: 'GET' };
  throw new Error(`API HTTP ${optionsRes.status || getRes.status}`);
}

async function parseDomViaApi(_apiBase, payload) {
  const res = await fetch(`${parseDomEndpoint()}?t=${Date.now()}`, {
    method: 'POST',
    cache: 'no-store',
    headers: extensionHeaders(),
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
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectProposalToDOM,
      args: [proposalText],
    });
    return Boolean(results?.[0]?.result);
  } catch (err) {
    const msg = err?.message || String(err);
    if (/permission to access the respective host/i.test(msg)) {
      throw new Error('Reload this unpacked extension so host permissions take effect, then try Auto-Fill again.');
    }
    throw err;
  }
}

function injectProposalToDOM(proposalText) {
  const text = String(proposalText || '');
  if (!text) return false;
  const isVisible = (el) => {
    const r = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return r.width > 40 && r.height > 24 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  const selectors = [
    'textarea[aria-labelledby*="cover-letter"]',
    'textarea[aria-label*="cover letter" i]',
    'textarea[placeholder*="cover" i]',
    'textarea[name*="cover" i]',
    'textarea.up-textarea',
    'textarea[data-test="cover-letter"]',
    '.msg-form__contenteditable',
    'div.ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][aria-label*="message" i]',
    'div[contenteditable="true"][role="textbox"]',
    'textarea',
  ];
  let field = null;
  for (const selector of selectors) {
    const found = [...document.querySelectorAll(selector)].find(isVisible);
    if (found) {
      field = found;
      break;
    }
  }
  if (!field) return false;
  field.focus();
  if (field.isContentEditable) {
    field.textContent = text;
    field.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    const proto = field.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(field, text);
    else field.value = text;
    field.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return true;
}
