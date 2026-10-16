/**
 * Sovereign extension service worker — click-only. No polling, no background scrape.
 */

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

  return false;
});

async function scrapeActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractPageContent,
  });
  return result;
}

function extractPageContent() {
  const pageText = document.body?.innerText || '';
  const pageTitle = document.title || '';
  const pageUrl = window.location.href || '';
  return { pageText: pageText.slice(0, 80_000), pageTitle, pageUrl };
}

async function injectActiveTab(proposalText) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab');

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: injectProposalToDOM,
    args: [proposalText],
  });
  return Boolean(result);
}

function injectProposalToDOM(proposalText) {
  const selectors = [
    'textarea[aria-labelledby*="cover-letter"]',
    'textarea[aria-label*="cover letter" i]',
    'textarea[aria-label*="Cover letter" i]',
    'textarea[name*="cover" i]',
    'textarea[placeholder*="cover" i]',
    'textarea.up-textarea',
    'textarea[data-test="cover-letter"]',
    'div[contenteditable="true"][aria-label*="message" i]',
    'div[contenteditable="true"][role="textbox"]',
    'textarea',
  ];

  let field = null;
  for (const selector of selectors) {
    const found = document.querySelector(selector);
    if (found) {
      field = found;
      break;
    }
  }
  if (!field) return false;

  if (field.isContentEditable) {
    field.focus();
    field.textContent = proposalText;
    field.dispatchEvent(new InputEvent('input', { bubbles: true, data: proposalText }));
  } else {
    field.focus();
    const proto = field.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(field, proposalText);
    else field.value = proposalText;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return true;
}
