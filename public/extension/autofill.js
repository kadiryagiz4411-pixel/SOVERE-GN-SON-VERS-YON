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

  function dispatchReactEvents(element, value) {
    const win = viewOf(element);
    const InputEventCtor = win.InputEvent || InputEvent;
    element.dispatchEvent(new InputEventCtor('beforeinput', {
      bubbles: true,
      composed: true,
      cancelable: true,
      data: value,
      inputType: 'insertFromPaste',
    }));
    element.dispatchEvent(new InputEventCtor('input', {
      bubbles: true,
      composed: true,
      data: value,
      inputType: 'insertFromPaste',
    }));
    element.dispatchEvent(new win.Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new win.Event('change', { bubbles: true, composed: true }));
    element.dispatchEvent(new win.KeyboardEvent('keydown', { bubbles: true, composed: true, key: 'a', keyCode: 65 }));
    element.dispatchEvent(new win.KeyboardEvent('keyup', { bubbles: true, composed: true, key: 'a', keyCode: 65 }));
    element.dispatchEvent(new win.Event('blur', { bubbles: true, composed: true }));
    element.dispatchEvent(new win.Event('focus', { bubbles: true, composed: true }));
  }

  function setNativeValue(element, value) {
    const win = viewOf(element);
    const proto = element.tagName === 'TEXTAREA'
      ? win.HTMLTextAreaElement.prototype
      : win.HTMLInputElement.prototype;
    const own = Object.getOwnPropertyDescriptor(element, 'value');
    const inherited = Object.getOwnPropertyDescriptor(proto, 'value');
    const setter = own && own.set ? own.set : inherited && inherited.set;
    try {
      const tracker = element._valueTracker;
      if (tracker && typeof tracker.setValue === 'function') tracker.setValue('');
    } catch { /**/ }
    if (setter) setter.call(element, value);
    else element.value = value;
    dispatchReactEvents(element, value);
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
      element.innerHTML = '';
      element.appendChild(doc.createTextNode(text));
    }
    dispatchReactEvents(element, text);
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

  function deployStatusBadge(success, platform) {
    try {
      const existing = document.getElementById('sovereign-deploy-badge');
      if (existing) existing.remove();
      const badge = document.createElement('div');
      badge.id = 'sovereign-deploy-badge';
      badge.setAttribute('role', 'status');
      badge.setAttribute('aria-live', 'polite');
      Object.assign(badge.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '2147483647',
        background: success ? '#064e3b' : '#7f1d1d',
        color: success ? '#6ee7b7' : '#fca5a5',
        border: `1px solid ${success ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.45)'}`,
        borderRadius: '12px',
        padding: '12px 18px',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
        fontWeight: '700',
        lineHeight: '1.5',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
        maxWidth: '320px',
        wordBreak: 'break-word',
        transition: 'opacity 400ms ease',
      });
      badge.textContent = success
        ? 'Proposal successfully deployed as professional entity. Review and send on the platform — Sovereign never auto-submits.'
        : 'No editor found. Open the cover-letter field on this page, then try Auto-Fill again.';
      document.body.appendChild(badge);
      setTimeout(() => {
        badge.style.opacity = '0';
        setTimeout(() => { try { badge.remove(); } catch { /**/ } }, 450);
      }, 5000);
    } catch { /**/ }
  }

  function detectPlatformName() {
    const host = String(window.location.hostname || '').replace(/^www\./, '').toLowerCase();
    if (host.includes('upwork.com')) return 'Upwork';
    if (host.includes('linkedin.com')) return 'LinkedIn';
    if (host.includes('indeed.com')) return 'Indeed';
    if (host.includes('glassdoor.com')) return 'Glassdoor';
    if (host.includes('fiverr.com')) return 'Fiverr';
    if (host.includes('freelancer.com')) return 'Freelancer';
    return '';
  }

  function looksLikeSubmitControl(el) {
    const blob = `${el?.textContent || ''} ${el?.getAttribute?.('aria-label') || ''} ${el?.value || ''}`.toLowerCase();
    return /submit|send proposal|apply now|apply for this job|place bid|next step/.test(blob);
  }

  function fillSupportingFields(cover, extras) {
    const rate = String(extras?.hourlyRate || extras?.fixedRate || '').replace(/[^\d.]/g, '');
    const skills = String(extras?.skills || '').split(/[,|\n]+/).map((item) => item.trim()).filter(Boolean);
    const wins = String(extras?.pastWins || extras?.experience || '').replace(/\s+/g, ' ').trim();
    let filled = 0;
    const docs = collectDocuments();
    for (const doc of docs) {
      const roots = [];
      collectRoots(doc, roots);
      for (const root of roots) {
        let matches = [];
        try { matches = [...root.querySelectorAll('input, textarea')]; } catch { matches = []; }
        for (const el of matches) {
          if (el === cover || !isFillable(el)) continue;
          const type = String(el.type || '').toLowerCase();
          if (['hidden', 'password', 'file', 'checkbox', 'radio', 'submit', 'button'].includes(type)) continue;
          const label = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
          const current = String(el.value || el.innerText || '').trim();
          if (current) continue;
          if (filled >= 4) return;
          if (rate && /bid|hourly|rate|budget|milestone|amount/.test(label) && el.tagName === 'INPUT') {
            fill(el, rate);
            filled += 1;
            continue;
          }
          if (el.tagName === 'TEXTAREA' && /question|screen|cover|proposal|why|experience|describe/.test(label)) {
            const firstSkill = skills[0] || 'this stack';
            const answer = wins
              ? wins.slice(0, 280)
              : `Yes. I have shipped this with ${firstSkill} and can start on the first deliverable this week.`;
            fill(el, answer);
            filled += 1;
          }
        }
      }
    }
  }

  async function injectProposalToDOM(proposalText, extras) {
    const text = String(proposalText || '');
    if (!text) return false;
    const field = await waitForEditor(3200);
    const platform = detectPlatformName();
    if (!field) {
      deployStatusBadge(false, platform);
      return false;
    }
    const ok = fill(field, text);
    try { fillSupportingFields(field, extras || {}); } catch { /**/ }
    const submit = [...document.querySelectorAll('button, input[type="submit"], a[role="button"]')]
      .find(looksLikeSubmitControl);
    if (submit) {
      try { submit.setAttribute('data-sovereign-ready', '1'); } catch { /**/ }
    }
    deployStatusBadge(ok, platform);
    return ok;
  }

  global.injectProposalToDOM = injectProposalToDOM;
  global.sovereignInjectProposal = injectProposalToDOM;
})(typeof window !== 'undefined' ? window : globalThis);
