let settings = {
  enablePreviews: true,
  highlightInsecure: true,
  showImages: false,
  isPro: false
};

let previewElement = null;
let hoverTimeout = null;
let currentLink = null;
let previewCache = new Map();
let stats = { previewCount: 0 };

chrome.storage.local.get(['settings', 'stats'], (result) => {
  if (result.settings) settings = result.settings;
  if (result.stats) stats = result.stats;
  initLinkScope();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings) {
    settings = changes.settings.newValue;
  }
});

function initLinkScope() {
  document.addEventListener('mouseover', handleLinkHover);
  document.addEventListener('mouseout', handleLinkOut);
  
  if (settings.highlightInsecure) {
    highlightInsecureLinks();
  }
}

function handleLinkHover(e) {
  if (!settings.enablePreviews) return;
  
  const link = e.target.closest('a');
  if (!link || !link.href) return;
  
  currentLink = link;
  
  clearTimeout(hoverTimeout);
  hoverTimeout = setTimeout(() => {
    showPreview(link, e.clientX, e.clientY);
  }, 500);
}

function handleLinkOut(e) {
  const link = e.target.closest('a');
  if (link === currentLink) {
    clearTimeout(hoverTimeout);
    hidePreview();
  }
}

function showPreview(link, x, y) {
  const url = link.href;
  
  if (url.startsWith('javascript:') || url.startsWith('mailto:') || url.startsWith('tel:')) {
    return;
  }
  
  hidePreview();
  
  previewElement = document.createElement('div');
  previewElement.className = 'linkscope-preview';
  
  const maxLeft = window.innerWidth - 420;
  const maxTop = window.innerHeight - 300;
  previewElement.style.left = Math.min(x + 10, maxLeft) + 'px';
  previewElement.style.top = Math.min(y + 10, maxTop) + 'px';
  
  if (previewCache.has(url)) {
    previewElement.innerHTML = previewCache.get(url);
  } else {
    previewElement.innerHTML = '<div class="linkscope-preview-loading">Loading preview...</div>';
    fetchPreview(url);
  }
  
  document.body.appendChild(previewElement);
  
  stats.previewCount++;
  chrome.storage.local.set({ stats });
}

function hidePreview() {
  if (previewElement) {
    previewElement.remove();
    previewElement = null;
  }
}

async function fetchPreview(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'omit',
      cache: 'force-cache'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch');
    }
    
    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const title = doc.querySelector('title')?.textContent || 'No title';
    const metaDesc = doc.querySelector('meta[name="description"]')?.content || '';
    const ogImage = doc.querySelector('meta[property="og:image"]')?.content || '';
    
    let firstPara = '';
    const paragraphs = doc.querySelectorAll('p');
    for (let p of paragraphs) {
      if (p.textContent.trim().length > 50) {
        firstPara = p.textContent.trim().substring(0, 200) + '...';
        break;
      }
    }
    
    const content = metaDesc || firstPara || 'No preview available';
    
    let warnings = [];
    if (!url.startsWith('https://')) {
      warnings.push('⚠️ Insecure connection');
    }
    
    const previewHTML = `
      <div class="linkscope-preview-header">
        <div class="linkscope-preview-title">${escapeHtml(title)}</div>
      </div>
      ${warnings.length > 0 ? warnings.map(w => `<div class="linkscope-warning">${w}</div>`).join('') : ''}
      <div class="linkscope-preview-url">${escapeHtml(url)}</div>
      <div class="linkscope-preview-content">
        ${settings.showImages && ogImage ? `<img src="${escapeHtml(ogImage)}" class="linkscope-preview-image" />` : ''}
        <div class="linkscope-preview-text">${escapeHtml(content)}</div>
      </div>
      ${settings.isPro ? `<div class="linkscope-preview-summary"><strong>TL;DR:</strong> ${generateSummary(content)}</div>` : ''}
      <button class="linkscope-save-btn" data-url="${escapeHtml(url)}" data-title="${escapeHtml(title)}">Save Preview</button>
    `;
    
    previewCache.set(url, previewHTML);
    
    if (previewElement) {
      previewElement.innerHTML = previewHTML;
      
      const saveBtn = previewElement.querySelector('.linkscope-save-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => savePreview(url, title));
      }
    }
  } catch (error) {
    if (previewElement) {
      previewElement.innerHTML = `
        <div class="linkscope-preview-header">
          <div class="linkscope-preview-title">Preview Unavailable</div>
        </div>
        <div class="linkscope-preview-error">Could not load preview for this link.</div>
      `;
    }
  }
}

function generateSummary(text) {
  const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 0);
  return sentences[0]?.trim() + '.' || text.substring(0, 100) + '...';
}

function savePreview(url, title) {
  chrome.storage.local.get(['savedPreviews', 'settings'], (result) => {
    let saved = result.savedPreviews || [];
    const isPro = result.settings?.isPro || false;
    
    if (!isPro && saved.length >= 10) {
      alert('Free version limited to 10 saved previews. Upgrade to Pro for unlimited saves!');
      return;
    }
    
    if (!saved.find(s => s.url === url)) {
      saved.push({ url, title, timestamp: Date.now() });
      chrome.storage.local.set({ savedPreviews: saved });
      alert('Preview saved!');
    }
  });
}

function highlightInsecureLinks() {
  document.querySelectorAll('a[href^="http://"]').forEach(link => {
    link.classList.add('linkscope-insecure-link');
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}