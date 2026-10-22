/**
 * Inserts proposal text into visible editors. Never submits the form.
 */
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

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request?.type === 'SCRAPE_PAGE') {
    try {
      const data = typeof extractActiveJob === 'function' ? extractActiveJob() : null;
      sendResponse({ success: Boolean(data?.pageText), data });
    } catch (err) {
      sendResponse({ success: false, error: err?.message || String(err) });
    }
    return true;
  }
  if (request?.type !== 'INJECT_PROPOSAL') return false;
  try {
    sendResponse({ success: injectProposalToDOM(request.proposalText || '') });
  } catch (err) {
    sendResponse({ success: false, error: err?.message || String(err) });
  }
  return true;
});
