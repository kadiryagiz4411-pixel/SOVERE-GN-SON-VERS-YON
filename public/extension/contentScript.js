/**
 * Template content script — scrapes visible page text and posts it
 * to the Sovereign side panel. No credentials are read from the page.
 */
(function sovereignScrape() {
  const text = (document.body && document.body.innerText) || '';
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === 'SOVEREIGN_SCRAPE') {
      sendResponse({
        text: text.slice(0, 80000),
        sourceUrl: location.href,
        title: document.title,
      });
    }
    return true;
  });
})();
