/**
 * Page bridge: session inherit on sovereignapp.pro, Auto-Fill into editors.
 * Never submits the form.
 */

function markSovereignHost() {
  try {
    const version = typeof EXTENSION_VERSION !== 'undefined' ? EXTENSION_VERSION : '1.6.2';
    document.documentElement.setAttribute('data-sovereign-extension', version);
    window.postMessage({ type: 'SOVEREIGN_EXTENSION_READY', version }, '*');
  } catch {
    // Page may be restricted.
  }
}

function captureSovereignSession() {
  try {
    const host = String(location.hostname || '');
    if (!/(^|\.)sovereignapp\.pro$/i.test(host)) return;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('sb-') || !key.includes('auth-token')) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const accessToken = parsed?.access_token || parsed?.currentSession?.access_token || '';
      const email = parsed?.user?.email
        || parsed?.currentSession?.user?.email
        || parsed?.user?.user_metadata?.email
        || '';
      if (!accessToken) continue;
      chrome.storage.local.set({
        'sovereign.session.v1': { accessToken, email, at: Date.now() },
      });
      try {
        chrome.runtime.sendMessage({ type: 'SYNC_SESSION', accessToken, email });
      } catch {
        /* background may be asleep */
      }
      break;
    }
  } catch {
    // Ignore locked storage.
  }
}

markSovereignHost();
captureSovereignSession();
if (/(^|\.)sovereignapp\.pro$/i.test(String(location.hostname || ''))) {
  window.addEventListener('focus', captureSovereignSession);
  window.addEventListener('storage', captureSovereignSession);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') captureSovereignSession();
  });
  setInterval(captureSovereignSession, 15000);
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
  const run = typeof injectProposalToDOM === 'function'
    ? injectProposalToDOM
    : (typeof sovereignInjectProposal === 'function' ? sovereignInjectProposal : null);
  if (!run) {
    sendResponse({ success: false, error: 'Auto-Fill is not loaded. Reload the extension.' });
    return true;
  }
  Promise.resolve(run(request.proposalText || ''))
    .then((ok) => sendResponse({ success: Boolean(ok) }))
    .catch((err) => sendResponse({ success: false, error: err?.message || String(err) }));
  return true;
});
