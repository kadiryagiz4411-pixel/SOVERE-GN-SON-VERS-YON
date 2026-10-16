/**
 * On-demand cover-letter injector for Upwork / LinkedIn / Indeed.
 * Never runs by itself — background.js injects this function on Auto-Fill click.
 */
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

  const nativeSetter = Object.getOwnPropertyDescriptor(
    field.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLElement.prototype,
    'value',
  )?.set;

  if (field.isContentEditable) {
    field.focus();
    field.textContent = proposalText;
    field.dispatchEvent(new InputEvent('input', { bubbles: true, data: proposalText }));
  } else {
    field.focus();
    if (nativeSetter) nativeSetter.call(field, proposalText);
    else field.value = proposalText;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  return true;
}
