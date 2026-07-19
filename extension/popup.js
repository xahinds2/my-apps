const STORES = [
  { id: 'amazon',   name: 'Amazon',         patterns: ['amazon.in/s', 'amazon.in/s?'] },
  { id: 'flipkart', name: 'Flipkart',        patterns: ['flipkart.com/search'] },
  { id: 'myntra',   name: 'Myntra',          patterns: ['myntra.com'] },
  { id: 'nykaa',    name: 'Nykaa',           patterns: ['nykaa.com/search'] },
  { id: 'croma',    name: 'Croma',           patterns: ['croma.com/searchB'] },
  { id: 'google',   name: 'Google Shopping', patterns: ['google.com/search'] },
];

const SUPPORTED_IDS = new Set(['amazon', 'flipkart', 'myntra', 'nykaa', 'croma']); // extension covers these

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
  // Detect current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  const currentStore = detectStore(url);

  // Status dot
  const dot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  if (currentStore && SUPPORTED_IDS.has(currentStore.id)) {
    dot.className = 'status-dot active';
    statusText.innerHTML = `Active on <span>${currentStore.name}</span> — scraping on page load`;
  } else if (currentStore) {
    dot.className = 'status-dot inactive';
    statusText.innerHTML = `<span>${currentStore.name}</span> detected — extension not yet supported`;
  } else {
    dot.className = 'status-dot inactive';
    statusText.textContent = 'Not a supported store page';
  }

  // Store pills
  const storeList = document.getElementById('storeList');
  storeList.innerHTML = STORES.map(s => {
    const isCurrent = currentStore?.id === s.id;
    const isSupported = SUPPORTED_IDS.has(s.id);
    const cls = isCurrent ? 'store-pill current' : isSupported ? 'store-pill supported' : 'store-pill';
    return `<div class="${cls}"><span class="dot"></span>${s.name}</div>`;
  }).join('');

  // Scrape history
  const { scrapeHistory = [] } = await chrome.storage.local.get('scrapeHistory');
  const historyList = document.getElementById('historyList');
  if (scrapeHistory.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No scrapes yet — browse a search page.</div>';
  } else {
    historyList.innerHTML = scrapeHistory.map(h => `
      <div class="scrape-item">
        <div class="scrape-meta">
          <span class="scrape-store ${h.store}">${h.store}</span>
          <span class="scrape-count">${h.count} products</span>
          <span class="scrape-time">${timeAgo(h.ts)}</span>
        </div>
        <div class="scrape-titles">
          ${(h.titles || []).map(t => `<div class="scrape-title">· ${t}</div>`).join('')}
        </div>
      </div>
    `).join('');
  }

  // Settings
  const { apiUrl, apiToken } = await chrome.storage.sync.get(['apiUrl', 'apiToken']);
  document.getElementById('apiUrl').value = apiUrl || 'http://localhost:3000';
  document.getElementById('apiToken').value = apiToken || '';

  document.getElementById('save').addEventListener('click', () => {
    const url = document.getElementById('apiUrl').value.trim() || 'http://localhost:3000';
    const token = document.getElementById('apiToken').value.trim();
    chrome.storage.sync.set({ apiUrl: url, apiToken: token }, () => {
      const s = document.getElementById('status');
      s.textContent = 'Saved!';
      s.className = 'ok';
      setTimeout(() => { s.textContent = ''; s.className = ''; }, 2000);
    });
  });
}

init();
