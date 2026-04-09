let settings = {
  enablePreviews: true,
  highlightInsecure: true,
  showImages: false,
  isPro: false
};

let savedPreviews = [];
let stats = { previewCount: 0 };

function loadData() {
  chrome.storage.local.get(['settings', 'savedPreviews', 'stats'], (result) => {
    if (result.settings) settings = result.settings;
    if (result.savedPreviews) savedPreviews = result.savedPreviews;
    if (result.stats) stats = result.stats;
    updateUI();
  });
}

function saveSettings() {
  chrome.storage.local.set({ settings });
}

function updateUI() {
  document.getElementById('enablePreviews').checked = settings.enablePreviews;
  document.getElementById('highlightInsecure').checked = settings.highlightInsecure;
  document.getElementById('showImages').checked = settings.showImages;
  
  document.getElementById('versionBadge').textContent = settings.isPro ? 'Pro' : 'Free';
  document.getElementById('previewCount').textContent = stats.previewCount || 0;
  
  const maxSaved = settings.isPro ? '∞' : '10';
  document.getElementById('savedCount').textContent = `${savedPreviews.length}/${maxSaved}`;
  
  renderSavedList();
}

function renderSavedList() {
  const savedList = document.getElementById('savedList');
  
  if (savedPreviews.length === 0) {
    savedList.innerHTML = '<div class="empty-state">No saved previews yet</div>';
    return;
  }
  
  savedList.innerHTML = savedPreviews.map((item, index) => `
    <div class="saved-item">
      <a href="${item.url}" target="_blank" title="${item.url}">${item.title || item.url}</a>
      <button class="delete-btn" data-index="${index}">×</button>
    </div>
  `).join('');
  
  savedList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      savedPreviews.splice(index, 1);
      chrome.storage.local.set({ savedPreviews });
      renderSavedList();
      updateUI();
    });
  });
}

document.getElementById('enablePreviews').addEventListener('change', (e) => {
  settings.enablePreviews = e.target.checked;
  saveSettings();
});

document.getElementById('highlightInsecure').addEventListener('change', (e) => {
  settings.highlightInsecure = e.target.checked;
  saveSettings();
});

document.getElementById('showImages').addEventListener('change', (e) => {
  settings.showImages = e.target.checked;
  saveSettings();
});

document.getElementById('activatePro').addEventListener('click', () => {
  const key = document.getElementById('proKey').value.trim();
  if (key === 'LINKSCOPE-PRO-2024' || key.length > 10) {
    settings.isPro = true;
    saveSettings();
    alert('Pro activated! Enjoy unlimited features.');
    updateUI();
  } else {
    alert('Invalid activation key. Purchase via CashApp: $smithethanf');
  }
});

loadData();