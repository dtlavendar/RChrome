# RCA – Read Canvas Assignments

A Chrome extension that detects Canvas assignment pages, extracts the prompt, summarises the requirements with an LLM and lists all external links referenced in the assignment.

## Features

- Detects Canvas domains and only enables on pages that contain `/assignments/` in the URL.
- Extracts assignment HTML, text content and external links (filters out Canvas-internal URLs).
- Sends the content to an LLM endpoint (default: OpenAI Chat Completions) and renders the summary in the popup and directly on the page.
- Caches the summary per-URL in `chrome.storage.local`; a cached summary is reused until the user chooses **Regenerate**.
- Supports LaTeX via MathJax.

## File Overview

```
hello.html        Popup UI markup
popup.css         Popup styling
popup.js          Extension logic (detection, extraction, API calls)
contentScript.js  Renders the summary inside the Canvas page
manifest.json     Chrome extension manifest (MV3)
```

## Setup

1. Clone or download the repository.
2. Open `popup.js` and set your API key and model name in `this.apiConfig`.
3. Load the extension:
   - Go to `chrome://extensions`.
   - Enable *Developer mode*.
   - Click *Load unpacked* and select the project folder.
4. Optional: adjust domain patterns or selectors in `popup.js` if your Canvas instance uses custom markup.

## Usage

1. Navigate to a Canvas assignment page.
2. Open the extension popup. The toggle becomes active when an assignment is detected.
3. Enable the toggle. The extension extracts the assignment, calls the LLM and shows the summary.
4. The summary is also displayed in a floating card on the assignment page. Click **Regenerate** in the popup to refresh the summary.

## Custom Prompt

Add a prompt in the *Custom prompt* text area before enabling the toggle. The text is used as the system message for the LLM request and is stored in Chrome storage for reuse.

## Storage and Privacy

Summaries are stored locally in the browser's extension storage and are keyed by the full assignment URL. No data is transmitted anywhere except to your configured LLM endpoint.

## License

MIT
