// Background service worker — handles API calls from content scripts

const DEFAULT_API_URL = 'http://localhost:3000';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SAVE_PRODUCTS') {
    saveProducts(message.products).then(result => {
      sendResponse({ ok: true, ...result });
      // Update badge with count
      chrome.action.setBadgeText({ text: result.saved > 0 ? String(result.saved) : '' });
      chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
    }).catch(err => {
      console.error('[WishMe Scraper] Error:', err.message);
      sendResponse({ ok: false, error: err.message });
    });
    return true; // keep channel open for async response
  }
});

async function saveProducts(products) {
  const config = await chrome.storage.sync.get(['apiUrl', 'apiToken']);
  const apiUrl = (config.apiUrl || DEFAULT_API_URL).replace(/\/$/, '');
  const token = config.apiToken || '';

  const res = await fetch(`${apiUrl}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ products }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return await res.json(); // { saved: N }
}
