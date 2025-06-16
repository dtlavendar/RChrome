// Content script injected into Canvas assignment pages
// Responsibilities:
// 1. Retrieve cached summary from chrome.storage and render it if available.
// 2. Listen for messages from popup to update / regenerate summary.

(function() {
  const STORAGE_PREFIX = 'summary_';
  const pageKey = STORAGE_PREFIX + window.location.href;
  const containerId = 'rca-summary-container';

  function createContainer() {
    let el = document.getElementById(containerId);
    if (el) return el;
    el = document.createElement('aside');
    el.id = containerId;
    el.style.position = 'fixed';
    el.style.right = '16px';
    el.style.bottom = '16px';
    el.style.maxWidth = '340px';
    el.style.background = '#ffffff';
    el.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';
    el.style.borderRadius = '12px';
    el.style.padding = '1rem';
    el.style.fontFamily = "'Inter', sans-serif";
    el.style.fontSize = '14px';
    el.style.lineHeight = '1.6';
    el.style.zIndex = '9999';
    el.style.overflowY = 'auto';
    el.style.maxHeight = '60vh';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '8px';
    closeBtn.style.right = '12px';
    closeBtn.style.border = 'none';
    closeBtn.style.background = 'transparent';
    closeBtn.style.fontSize = '1.25rem';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', () => el.remove());

    const header = document.createElement('h3');
    header.textContent = 'RCA Summary';
    header.style.marginTop = '0';
    header.style.color = '#3366ff';

    const content = document.createElement('div');
    content.id = containerId + '-content';

    el.appendChild(closeBtn);
    el.appendChild(header);
    el.appendChild(content);
    document.body.appendChild(el);
    return el;
  }

  function renderSummary(html) {
    const container = createContainer();
    const content = document.getElementById(containerId + '-content');
    content.innerHTML = html;
    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
      window.MathJax.typesetPromise([content]).catch(console.warn);
    }
  }

  // Load cached summary on page load
  if (chrome.storage) {
    chrome.storage.local.get(pageKey, (res) => {
      const data = res[pageKey];
      if (data && data.summary) {
        renderSummary(data.summary);
      }
    });
  }

  // Listen for runtime messages from popup
  chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (msg.type === 'RCA_RENDER_SUMMARY' && msg.summary) {
      renderSummary(msg.summary);
    }
  });
})(); 