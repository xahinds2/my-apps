// Background service worker — receives scraped prices and sends them to the app API.

const DEFAULT_API_URL = 'http://localhost:3000';
const FALLBACK_API_URL = 'https://xahinds2.vercel.app';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'SAVE_GROCERY_PRICES') {
    const store = message.store || 'unknown';
    const diagnostics = message.diagnostics || null;
    const source = message.source || {};

    savePrices(message.products, store).then((result) => {
      sendResponse({ ok: true, ...result });
      const count = result.matched ?? result.saved ?? 0;
      chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
      chrome.action.setBadgeBackgroundColor({ color: count > 0 ? '#16a34a' : '#ef4444' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000);

      appendHistory({
        store,
        matched: result.matched ?? 0,
        saved: result.saved ?? 0,
        unmatched: result.unmatched ?? [],
        source: typeof source === 'string' ? source : source.pageUrl,
        diagnostics,
      });

      if (diagnostics?.driftWarning) {
        console.warn(
          `[Grocery Tracker] Low extraction rate for ${store}: ` +
          `rate=${diagnostics.extractionRate}, cards=${diagnostics.cardsFound}`
        );
      }
    }).catch((err) => {
      console.error('[Grocery Tracker] Error:', err.message);
      sendResponse({ ok: false, error: err.message });
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 4000);
    });

    return true; // keep channel open for async sendResponse
  }
});

async function appendHistory({ store, matched, saved, unmatched, source, diagnostics }) {
  const { scrapeHistory = [] } = await chrome.storage.local.get('scrapeHistory');
  scrapeHistory.unshift({
    store,
    matched,
    saved,
    unmatchedCount: (unmatched || []).length,
    unmatched: (unmatched || []).slice(0, 5),
    source,
    ts: Date.now(),
    cardsFound: diagnostics?.cardsFound ?? null,
    extractionRate: diagnostics?.extractionRate ?? null,
    driftWarning: Boolean(diagnostics?.driftWarning),
  });
  await chrome.storage.local.set({ scrapeHistory: scrapeHistory.slice(0, 20) });
}

async function savePrices(products, store) {
  const config = await chrome.storage.sync.get(['apiUrl']);
  const primary = (config.apiUrl || DEFAULT_API_URL).replace(/\/$/, '');

  async function postTo(apiUrl) {
    const res = await fetch(`${apiUrl}/api/grocery/prices/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store, products }),
    });
    if (!res.ok) { const text = await res.text(); throw new Error(`API error ${res.status}: ${text}`); }
    return await res.json();
  }

  // Fall back to Vercel if localhost is unreachable
  try {
    return await postTo(primary);
  } catch (err) {
    if (primary.includes('localhost') && err.message.includes('Failed to fetch')) {
      return await postTo(FALLBACK_API_URL);
    }
    throw err;
  }
}
