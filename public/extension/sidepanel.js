const apiInput = document.getElementById('api');
const statusEl = document.getElementById('status');
const outEl = document.getElementById('out');

apiInput.value = localStorage.getItem('sovereign_api') || 'https://sovereign.app';

document.getElementById('parse').addEventListener('click', async () => {
  const apiBase = apiInput.value.replace(/\/$/, '');
  localStorage.setItem('sovereign_api', apiBase);
  statusEl.textContent = 'Scraping tab…';
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const scraped = await chrome.tabs.sendMessage(tab.id, { type: 'SOVEREIGN_SCRAPE' });
    statusEl.textContent = 'Calling /api/extension/parse-dom…';
    const res = await fetch(`${apiBase}/api/extension/parse-dom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: scraped.text, sourceUrl: scraped.sourceUrl }),
    });
    const data = await res.json();
    outEl.textContent = JSON.stringify(data, null, 2);
    statusEl.textContent = `Intent: ${data.intent || 'error'}`;
  } catch (err) {
    statusEl.textContent = String(err.message || err);
  }
});
