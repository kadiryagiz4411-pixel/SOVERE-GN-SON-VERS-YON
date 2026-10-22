/**
 * Inserts proposal text into visible editors. Never submits the form.
 */
(function sovereignAutofill(global) {
  const SELECTORS = [
    'textarea[aria-labelledby*="cover-letter"]',
    'textarea[aria-label*="cover letter" i]',
    'textarea[placeholder*="cover" i]',
    'textarea[name*="cover" i]',
    'textarea[data-test*="cover"]',
    'textarea.up-textarea',
    'textarea.air3-textarea',
    '[data-test="cover-letter"]',
    '[data-test="cover-letter-input"]',
    '.msg-form__contenteditable',
    '.ql-editor[contenteditable="true"]',
    '.ProseMirror[contenteditable="true"]',
    '[data-slate-editor="true"]',
    '.public-DraftEditor-content[contenteditable="true"]',
    '.DraftEditor-root [contenteditable="true"]',
    'div[contenteditable="true"][aria-label*="cover" i]',
    'div[contenteditable="true"][aria-label*="proposal" i]',
    'div[contenteditable="true"][aria-label*="message" i]',
    'div[contenteditable="true"][role="textbox"]',
    '[contenteditable="true"]',
    'textarea',
  ];

  function viewOf(el) {
    return (el && el.ownerDocument && el.ownerDocument.defaultView) || global;
  }

  function isFillable(el) {
    if (!el || el.disabled || el.readOnly) return false;
    if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return false;
    const win = viewOf(el);
    const style = win.getComputedStyle(el);
    if (!style || style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 && rect.height < 8) return false;
    return true;
  }

  function collectRoots(root, out) {
    if (!root) return;
    out.push(root);
    let nodes;
    try {
      nodes = root.querySelectorAll ? root.querySelectorAll('*') : [];
    } catch {
      return;
    }
    for (const node of nodes) {
      if (node.shadowRoot) collectRoots(node.shadowRoot, out);
    }
  }

  function collectDocuments() {
    const docs = [document];
    const frames = document.querySelectorAll('iframe');
    for (const frame of frames) {
      try {
        const doc = frame.contentDocument;
        if (doc && doc !== document) docs.push(doc);
      } catch {
        /* cross-origin iframe */
      }
    }
    return docs;
  }

  function findEditor() {
    for (const doc of collectDocuments()) {
      const roots = [];
      collectRoots(doc, roots);
      for (const root of roots) {
        for (const selector of SELECTORS) {
          let matches = [];
          try {
            matches = [...root.querySelectorAll(selector)];
          } catch {
            continue;
          }
          const found = matches.find(isFillable);
          if (!found) continue;
          const inner = found.querySelector
            ? found.querySelector('[contenteditable="true"]')
            : null;
          return inner && isFillable(inner) ? inner : found;
        }
      }
    }
    return null;
  }

  function setNativeValue(element, value) {
    const win = viewOf(element);
    const proto = element.tagName === 'TEXTAREA'
      ? win.HTMLTextAreaElement.prototype
      : win.HTMLInputElement.prototype;
    const own = Object.getOwnPropertyDescriptor(element, 'value');
    const inherited = Object.getOwnPropertyDescriptor(proto, 'value');
    const setter = own && own.set ? own.set : inherited && inherited.set;
    if (setter) setter.call(element, value);
    else element.value = value;
    const InputEventCtor = win.InputEvent || InputEvent;
    element.dispatchEvent(new InputEventCtor('input', {
      bubbles: true,
      composed: true,
      data: value,
      inputType: 'insertFromPaste',
    }));
    element.dispatchEvent(new win.Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new win.Event('change', { bubbles: true, composed: true }));
    element.dispatchEvent(new win.Event('blur', { bubbles: true, composed: true }));
  }

  function fillContentEditable(element, text) {
    const doc = element.ownerDocument || document;
    const win = viewOf(element);
    element.focus();
    try {
      const selection = (win.getSelection && win.getSelection()) || doc.getSelection();
      const range = doc.createRange();
      range.selectNodeContents(element);
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch {
      try { doc.execCommand('selectAll', false, null); } catch { /* ignore */ }
    }
    let inserted = false;
    try { inserted = doc.execCommand('insertText', false, text); } catch { inserted = false; }
    if (!inserted || !String(element.innerText || element.textContent || '').trim()) {
      element.textContent = '';
      element.appendChild(doc.createTextNode(text));
    }
    const InputEventCtor = win.InputEvent || InputEvent;
    element.dispatchEvent(new InputEventCtor('input', {
      bubbles: true,
      composed: true,
      data: text,
      inputType: 'insertFromPaste',
    }));
    element.dispatchEvent(new win.Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new win.Event('change', { bubbles: true, composed: true }));
    element.dispatchEvent(new win.Event('blur', { bubbles: true, composed: true }));
  }

  function fill(element, text) {
    try { element.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch { /* ignore */ }
    element.focus();
    const editable = element.isContentEditable || element.getAttribute('contenteditable') === 'true';
    if (editable) fillContentEditable(element, text);
    else setNativeValue(element, text);
    return true;
  }

  function waitForEditor(timeoutMs) {
    const existing = findEditor();
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        try { observer.disconnect(); } catch { /* ignore */ }
        global.clearTimeout(timer);
        resolve(findEditor());
      };
      const observer = new MutationObserver(() => {
        if (findEditor()) finish();
      });
      const timer = global.setTimeout(finish, timeoutMs);
      try {
        observer.observe(document.documentElement, { childList: true, subtree: true });
      } catch {
        finish();
      }
    });
  }

  async function injectProposalToDOM(proposalText) {
    const text = String(proposalText || '');
    if (!text) return false;
    const field = await waitForEditor(2800);
    if (!field) return false;
    return fill(field, text);
  }

  global.injectProposalToDOM = injectProposalToDOM;
  global.sovereignInjectProposal = injectProposalToDOM;
})(typeof window !== 'undefined' ? window : globalThis);
