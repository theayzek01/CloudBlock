chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'set_badge') {
    chrome.action.setBadgeText({ text: message.text || '' });
    chrome.action.setBadgeBackgroundColor({ color: '#ea4335' }); // Google Red color for alerts
  }
  sendResponse({ success: true });
});
