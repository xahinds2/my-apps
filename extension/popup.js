const STORES = [
  { id: 'zepto',            name: 'Zepto',    patterns: ['zepto.com/search', 'zepto.com/cn/', 'zepto.com/c/'] },
  { id: 'instamart',        name: 'Swiggy',   patterns: ['instamart.in/search', 'instamart.in/c/', 'instamart.in/collection/', 'swiggy.com/instamart/search', 'swiggy.com/instamart/c/', 'swiggy.com/instamart/collection/'] },
  { id: 'flipkart_minutes', name: 'Flipkart', patterns: ['flipkart.com/search', 'flipkart.com/grocery/', 'flipkart.com/supermart/'] },
  { id: 'amazon_fresh',     name: 'Amazon',   patterns: ['amazon.in/s?', 'amazon.in/gp/browse', 'amazon.in/stores/'] },
];

function detectStore(url) {
  for (const s of STORES) {
    if (s.patterns.some(p => url.includes(p))) return s;
  }
  return null;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  const currentStore = detectStore(url);

  const dot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  if (currentStore) {
    dot.className = 'status-dot active';
    statusText.innerHTML = `Active on <span>${currentStore.name}</span> — prices scraped on page load`;
  } else {
    dot.className = 'status-dot inactive';
    statusText.textContent = `Not a supported store — visit ${STORES.map(s => s.name).join(', ')} search`;
  }

  // Store pills
  const storeList = document.getElementById('storeList');
  storeList.innerHTML = STORES.map(s => {
    const isCurrent = currentStore?.id === s.id;
    const cls = isCurrent ? 'store-pill current' : 'store-pill supported';
    return `<div class="${cls}"><span class="dot"></span>${s.name}</div>`;
  }).join('');

  // Scrape history
  const { scrapeHistory = [] } = await chrome.storage.local.get('scrapeHistory');
  const recentHistory = scrapeHistory.slice(-3).reverse();
  const historyList = document.getElementById('historyList');
  if (recentHistory.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No scrapes yet — browse a search page.</div>';
  } else {
    historyList.innerHTML = recentHistory.map(h => `
      <div class="scrape-item">
        <div class="scrape-meta">
          <span class="scrape-store ${h.store}">${h.store}</span>
          <span class="scrape-count">${h.matched ?? 0} matched</span>
          <span class="scrape-time">${timeAgo(h.ts)}</span>
        </div>
        ${h.driftWarning ? `<div class="scrape-alert">⚠ Low extraction rate (${Math.round((h.extractionRate || 0) * 100)}%) — selectors may need update</div>` : ''}
        ${h.unmatchedCount > 0 ? `<div class="scrape-unmatched">${h.unmatchedCount} unmatched: ${(h.unmatched || []).join(', ')}</div>` : ''}
      </div>
    `).join('');
  }

  // Load saved API URL
  const { apiUrl } = await chrome.storage.sync.get(['apiUrl']);
  document.getElementById('apiUrl').value = apiUrl || 'http://localhost:3000';

  document.getElementById('save').addEventListener('click', () => {
    const url = document.getElementById('apiUrl').value.trim() || 'http://localhost:3000';
    chrome.storage.sync.set({ apiUrl: url }, () => {
      const s = document.getElementById('status');
      s.textContent = 'Saved!';
      s.className = 'ok';
      setTimeout(() => { s.textContent = ''; s.className = ''; }, 2000);
    });
  });
}

init();
