const apiUrlEl = document.getElementById('apiUrl');
const apiTokenEl = document.getElementById('apiToken');
const saveBtn = document.getElementById('save');
const statusEl = document.getElementById('status');

// Load saved settings
chrome.storage.sync.get(['apiUrl', 'apiToken'], config => {
  apiUrlEl.value = config.apiUrl || 'http://localhost:3000';
  apiTokenEl.value = config.apiToken || '';
});

saveBtn.addEventListener('click', () => {
  const apiUrl = apiUrlEl.value.trim() || 'http://localhost:3000';
  const apiToken = apiTokenEl.value.trim();
  chrome.storage.sync.set({ apiUrl, apiToken }, () => {
    statusEl.textContent = 'Saved!';
    statusEl.className = 'ok';
    setTimeout(() => { statusEl.textContent = ''; statusEl.className = ''; }, 2000);
  });
});
