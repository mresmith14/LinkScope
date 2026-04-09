chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    settings: {
      enablePreviews: true,
      highlightInsecure: true,
      showImages: false,
      isPro: false
    },
    savedPreviews: [],
    stats: { previewCount: 0 }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.local.get(['settings'], (result) => {
      sendResponse(result.settings);
    });
    return true;
  }
});