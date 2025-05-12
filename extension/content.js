// Content script runs in the context of web pages

// This script has access to the DOM of the current page
console.log('URL Bookmarker content script loaded');

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getPageContent') {
    // Get the page title and description (meta tags)
    const title = document.title;
    
    // Try to get description from meta tags
    let description = '';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      description = metaDescription.getAttribute('content');
    }
    
    // Send data back to the sender
    sendResponse({
      title: title,
      description: description
    });
  }
});

// Optional: Add keyboard shortcut to quickly open the extension
document.addEventListener('keydown', function(e) {
  // Alt+B to open the extension popup
  if (e.altKey && e.key === 'b') {
    chrome.runtime.sendMessage({action: 'openPopup'});
  }
});