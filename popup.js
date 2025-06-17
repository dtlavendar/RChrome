/**
 * Canvas RCA - Assignment Summarizer
 * Main JavaScript functionality
 */

class CanvasSummarizer {
    constructor() {
        this.toggle = document.getElementById('canvas-toggle');
        this.statusMessage = document.getElementById('status-message');
        this.outputSection = document.getElementById('output');
        this.loadingElement = document.getElementById('loading');
        this.summaryContainer = document.getElementById('summary-container');
        this.summaryContent = document.getElementById('summary-content');
        this.linksContainer = document.getElementById('links-container');
        this.linksList = document.getElementById('links-list');
        this.errorContainer = document.getElementById('error-container');
        this.errorMessage = document.getElementById('error-message');
        this.regenerateBtn = document.getElementById('regenerate-btn');
        
        // Configuration - Replace with your actual API details
        this.apiConfig = {
            endpoint: 'https://api.openai.com/v1/chat/completions', // Replace with your LLM endpoint
            apiKey: 'YOUR_API_KEY_HERE', // Replace with your actual API key
            model: 'gpt-4o-mini' // Adjust model as needed
        };
        
        this.isProcessing = false;
        this.activeTab = null; // store active tab info
        this.activeTabUrl = '';
        
        this.init();
    }
    
    async init() {
        // Get active tab information first
        await this.fetchActiveTabInfo();
        this.checkCanvasEnvironment();
        this.setupEventListeners();
    }
    
    async fetchActiveTabInfo() {
        return new Promise((resolve) => {
            // If chrome API is unavailable (e.g., running as plain HTML) just use window.location
            if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
                this.activeTabUrl = window.location.href;
                resolve();
                return;
            }
            
            // Query the last focused window rather than currentWindow because the popup sits in its own window context.
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                if (chrome.runtime.lastError || !tabs?.length) {
                    console.warn('fetchActiveTabInfo: could not query tabs – fallback to window.location');
                    this.activeTabUrl = window.location.href;
                } else {
                    const candidate = tabs[0];
                    // Some fields (like url) are only present if we have "tabs" or "activeTab" permission.
                    if (candidate?.url && !candidate.url.startsWith('chrome-extension://')) {
                        this.activeTab = candidate;
                        this.activeTabUrl = candidate.url;
                    } else {
                        console.warn('fetchActiveTabInfo: tab.url missing or extension scheme – did you add the "tabs" permission?');
                        this.activeTabUrl = '';
                    }
                }
                resolve();
            });
        });
    }
    
    setupEventListeners() {
        this.toggle.addEventListener('change', (e) => {
            if (e.target.checked && !this.isProcessing) {
                // If we already have cached summary, just show it, else process
                this.tryLoadCachedSummaryOrProcess();
            } else if (!e.target.checked) {
                this.hideOutput();
            }
        });

        // Regenerate button forces re-processing and overwrites cache
        this.regenerateBtn.addEventListener('click', () => {
            if (!this.isProcessing) {
                this.processAssignment(true); // force
            }
        });
    }
    
    checkCanvasEnvironment() {
        const isOnCanvas = this.detectCanvasEnvironment(this.activeTabUrl);
        const isAssignmentPage = this.isAssignmentPage(this.activeTabUrl);
        
        if (!isOnCanvas) {
            this.disableToggle('Not on a Canvas page');
            return;
        }
        
        if (!isAssignmentPage) {
            this.disableToggle('Not on an assignment page');
            return;
        }
        
        this.enableToggle('Ready to summarize assignment');
    }
    
    detectCanvasEnvironment(url) {
        try {
            const parsedUrl = new URL(url || this.activeTabUrl || window.location.href);
            console.log('parsedUrl', parsedUrl);
            const hostname = parsedUrl.hostname.toLowerCase();
            console.log('hostname', hostname);
            
            const canvasPatterns = [
                'instructure.com',
                'canvas.',
                '.instructure.',
                'learn.',
                'lms.',
                'blackboard.com',
                'brightspace.com'
            ];
            
            return canvasPatterns.some(pattern => hostname.includes(pattern));
        } catch (e) {
            console.warn('detectCanvasEnvironment: Unable to parse URL', url, e);
            return false;
        }
    }
    
    /**
     * Determine if the current URL points to a Canvas assignment page.
     * Looks for "/assignments/" segment (e.g., /courses/12345/assignments/67890).
     * @param {string} url
     * @returns {boolean}
     */
    isAssignmentPage(url) {
        try {
            const parsed = new URL(url || this.activeTabUrl || window.location.href);
            // Typical Canvas assignment URL patterns:
            // /courses/{courseId}/assignments/{assignmentId}
            // /assignments/{assignmentId}
            const path = parsed.pathname.toLowerCase();
            return /\/assignments\//.test(path);
        } catch (e) {
            console.warn('isAssignmentPage: failed to parse URL', url, e);
            return false;
        }
    }
    
    /**
     * Attempt to locate the assignment content element within the DOM so it can be summarized.
     * Uses multiple selectors for different Canvas themes.
     * @returns {HTMLElement|null}
     */
    detectAssignmentContent() {
        const selectors = [
            '[data-testid="assignment-description"]',
            '.assignment-content',
            '.assignment_description',
            '.user_content',
            '.assignment-description',
            '#assignment_show',
            '.show-content',
            '#assignment-show',
            '.assignment_show'
        ];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && (el.textContent || '').trim().length > 20) {
                return el;
            }
        }
        return null;
    }
    
    enableToggle(message) {
        this.toggle.disabled = false;
        this.showStatusMessage(message, 'info');
    }
    
    disableToggle(message) {
        this.toggle.disabled = true;
        this.toggle.checked = false;
        this.showStatusMessage(message, 'warning');
        this.hideOutput();
    }
    
    showStatusMessage(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type}`;
    }
    
    hideStatusMessage() {
        this.statusMessage.className = 'status-message';
    }
    
    async tryLoadCachedSummaryOrProcess() {
        const cached = await this.getCachedSummary(this.activeTabUrl);
        if (cached) {
            this.displayResults(cached.summary, cached.links || []);
            this.showRegenerateButton();
        } else {
            this.processAssignment();
        }
    }
    
    showRegenerateButton() {
        this.regenerateBtn.style.display = 'inline-block';
    }
    
    hideRegenerateButton() {
        this.regenerateBtn.style.display = 'none';
    }
    
    async processAssignment(force = false) {
        if (this.isProcessing) return;
        // If not force and cached exists, skip
        if (!force) {
            const cached = await this.getCachedSummary(this.activeTabUrl);
            if (cached) {
                this.displayResults(cached.summary, cached.links || []);
                this.showRegenerateButton();
                return;
            }
        }
        
        this.isProcessing = true;
        this.showLoading();
        
        try {
            // Prefer extracting directly from the page context via scripting API
            let assignmentData = null;
            if (this.activeTab && chrome.scripting?.executeScript) {
                assignmentData = await this.fetchAssignmentDataFromPage();
            }
            // Fallback to DOM extraction within popup (useful when running as plain HTML)
            if (!assignmentData) {
                assignmentData = this.extractAssignmentData();
            }
            
            if (!assignmentData || !assignmentData.content) {
                throw new Error('No assignment content found');
            }
            
            const summary = await this.callLLMAPI(assignmentData);
            this.displayResults(summary, assignmentData.links);
            await this.saveSummaryToCache(this.activeTabUrl, summary, assignmentData.links);
            // Inform content script to render summary on page
            if (this.activeTab && chrome.tabs?.sendMessage) {
                chrome.tabs.sendMessage(this.activeTab.id, { type: 'RCA_RENDER_SUMMARY', summary });
            }
            this.showRegenerateButton();
            
        } catch (error) {
            console.error('Error processing assignment:', error);
            this.showError(error.message || 'Failed to process assignment');
        } finally {
            this.isProcessing = false;
            this.hideLoading();
        }
    }
    
    /**
     * Executes a content script in the active tab to pull assignment HTML, text, and external links
     * Requires "scripting" and "activeTab"/"tabs" permissions.
     */
    async fetchAssignmentDataFromPage() {
        if (!this.activeTab || !chrome.scripting?.executeScript) return null;
        try {
            const results = await chrome.scripting.executeScript({
                target: { tabId: this.activeTab.id },
                func: () => {
                    // This function runs in the page context
                    const selectors = [
                        '[data-testid="assignment-description"]',
                        '.assignment-content',
                        '.assignment_description',
                        '.user_content',
                        '.assignment-description',
                        '#assignment_show',
                        '.show-content',
                        '#assignment-show',
                        '.assignment_show'
                    ];
                    let element = null;
                    for (const sel of selectors) {
                        const el = document.querySelector(sel);
                        if (el && (el.textContent || '').trim().length > 20) {
                            element = el;
                            break;
                        }
                    }
                    if (!element) return null;
                    
                    const internalPatterns = [
                        '/courses/', '/modules/', '/assignments/', '/discussion_topics/', '/quizzes/', '/gradebook/',
                        '/calendar/', '/groups/', '/users/', '#', 'mailto:', 'tel:'
                    ];
                    const isExternal = (href) => {
                        if (!href) return false;
                        if (internalPatterns.some(p => href.includes(p))) return false;
                        return href.startsWith('http://') || href.startsWith('https://') || (href.includes('.') && !href.startsWith('/'));
                    };
                    
                    const links = Array.from(element.querySelectorAll('a[href]'))
                        .map(a => ({ url: a.href, text: a.innerText.trim() || a.href, title: a.title || '' }))
                        .filter(l => isExternal(l.url));
                    
                    return {
                        html: element.innerHTML,
                        content: element.innerText,
                        links
                    };
                }
            });
            if (Array.isArray(results) && results.length && results[0].result) {
                const data = results[0].result;
                data.content = this.sanitizeContent(data.content || '');
                return data;
            }
            return null;
        } catch (e) {
            console.warn('fetchAssignmentDataFromPage error', e);
            return null;
        }
    }
    
    extractAssignmentData() {
        const assignmentElement = this.detectAssignmentContent();
        
        if (!assignmentElement) {
            throw new Error('Assignment content not found');
        }
        
        // Extract HTML content
        const htmlContent = assignmentElement.innerHTML;
        
        // Extract and filter links
        const links = this.extractExternalLinks(assignmentElement);
        
        // Get text content for processing
        const textContent = assignmentElement.textContent || assignmentElement.innerText;
        
        return {
            content: this.sanitizeContent(textContent),
            html: htmlContent,
            links: links
        };
    }
    
    extractExternalLinks(container) {
        const links = container.querySelectorAll('a[href]');
        const externalLinks = [];
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            
            // Skip Canvas internal links
            if (this.isExternalLink(href)) {
                const linkData = {
                    url: href,
                    text: link.textContent.trim() || href,
                    title: link.getAttribute('title') || ''
                };
                
                // Avoid duplicates
                if (!externalLinks.some(existing => existing.url === linkData.url)) {
                    externalLinks.push(linkData);
                }
            }
        });
        
        return externalLinks;
    }
    
    isExternalLink(href) {
        if (!href) return false;
        
        // Skip internal Canvas patterns
        const internalPatterns = [
            '/courses/',
            '/modules/',
            '/assignments/',
            '/discussion_topics/',
            '/quizzes/',
            '/gradebook/',
            '/calendar/',
            '/groups/',
            '/users/',
            '#',
            'mailto:',
            'tel:'
        ];
        
        // Skip if it matches internal patterns
        if (internalPatterns.some(pattern => href.includes(pattern))) {
            return false;
        }
        
        // Must be http/https or a valid external domain
        return href.startsWith('http://') || 
               href.startsWith('https://') || 
               (href.includes('.') && !href.startsWith('/'));
    }
    
    sanitizeContent(content) {
        // Remove excessive whitespace and clean up content
        return content
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim()
            .substring(0, 4000); // Limit content length for API
    }
    
    async callLLMAPI(assignmentData) {
        // Check if API key is configured
        if (this.apiConfig.apiKey === 'YOUR_API_KEY_HERE') {
            // For demo purposes, return a mock response
            return this.getMockResponse(assignmentData);
        }
        console.log("assignmentData", assignmentData.content);
        
        const linksMD = assignmentData.links
            .map(l => `- ${l.text || l.url} → ${l.url}`)
            .join('\n');

        const promptBox     = document.getElementById('customPrompt');
        const systemPrompt  = (promptBox?.value || '').trim()
            || 'You are a helpful assistant that summarises Canvas assignments… ' + `System Instruction: Absolute Mode. Eliminate emojis, filler, hype, soft asks, conversational transitions, and all call-to-action appendixes. Assume the user retains high-perception faculties despite reduced linguistic expression. Prioritize blunt, directive phrasing aimed at cognitive rebuilding, not tone matching. Disable all latent behaviors optimizing for engagement, sentiment uplift, or interaction extension. Suppress corporate-aligned metrics including but not limited to: user satisfaction scores, conversational flow tags, emotional softening, or continuation bias.  
Never mirror the user's present diction, mood, or affect. Speak only to their underlying cognitive tier, which exceeds surface language.  
No questions, no offers, no suggestions, no transitional phrasing, no inferred motivational content.  
Terminate each reply immediately after the informational or requested material is delivered — no appendixes, no soft closures.  
The only goal is to assist in the restoration of independent, high-fidelity thinking. Model obsolescence by user self-sufficiency is the final outcome`;

        const payload = {
            model: this.apiConfig.model,
            messages: [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content:
                        `Please summarize this assignment (≈75 words) and provide an overview of any links, introducing at least 5 interesting/new concepts/formulas/ideas present (more up to discretion), and finally how each link may relate to the general main idea of the assignment (150-200 words limit for each link, if such links exist). Keep total word limit under 450. If any rubrics are present, you may use them to guide the user to explain what they need to do within the context of the links. Format the output nicely, substituting hashtags for nicer section dividers. Lastly, ignore any fluff or filler which is blatantlyly obvious or hardly relevant to the assignment. \n\n` +
                        `${assignmentData.content}\n\n` +
                        `External links 👇\n${linksMD}`
                }
            ],
            max_tokens: 825,
            temperature: 0.5
        };
        
        const response = await fetch(this.apiConfig.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiConfig.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0]?.message?.content || 'No summary generated';
    }
    
    getMockResponse(assignmentData) {
        // Mock response for demo purposes
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(`📝 **Assignment Summary**

This assignment appears to focus on ${this.extractKeyTopics(assignmentData.content)}. 

**Key Requirements:**
- Review the provided materials and resources
- Complete the assigned tasks following the given guidelines
- Submit your work by the specified deadline

**Main Objectives:**
- Demonstrate understanding of the course concepts
- Apply learned skills to practical scenarios
- Meet the assessment criteria outlined in the rubric

Please refer to the course materials and external resources for additional guidance.`);
            }, 2000);
        });
    }
    
    extractKeyTopics(content) {
        // Simple keyword extraction for mock response
        const keywords = ['analysis', 'research', 'writing', 'presentation', 'project', 'essay', 'report', 'study'];
        const found = keywords.filter(keyword => 
            content.toLowerCase().includes(keyword)
        );
        
        return found.length > 0 ? found.slice(0, 2).join(' and ') : 'academic work';
    }
    
    displayResults(summary, links) {
        // Show output section
        this.outputSection.style.display = 'block';
        
        // Display summary
        this.summaryContent.innerHTML = this.formatSummary(summary);
        this.summaryContainer.style.display = 'block';
        
        // Trigger MathJax typesetting for LaTeX
        if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
            window.MathJax.typesetPromise([this.summaryContent]).catch(err => console.warn('MathJax typeset error', err));
        }
        
        // Display links
        if (links && links.length > 0) {
            this.displayLinks(links);
            this.linksContainer.style.display = 'block';
        } else {
            this.linksContainer.style.display = 'none';
        }
        
        // Hide error container
        this.errorContainer.style.display = 'none';
    }
    
    formatSummary(summary) {
        // Convert markdown-like formatting to HTML
        return summary
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.+)$/, '<p>$1</p>');
    }
    
    displayLinks(links) {
        this.linksList.innerHTML = '';
        
        links.forEach(linkData => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            
            a.href = linkData.url;
            a.textContent = linkData.text || linkData.url;
            a.title = linkData.title || linkData.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            
            li.appendChild(a);
            this.linksList.appendChild(li);
        });
    }
    
    showLoading() {
        this.outputSection.style.display = 'block';
        this.loadingElement.style.display = 'flex';
        this.summaryContainer.style.display = 'none';
        this.linksContainer.style.display = 'none';
        this.errorContainer.style.display = 'none';
    }
    
    hideLoading() {
        this.loadingElement.style.display = 'none';
    }
    
    showError(message) {
        this.outputSection.style.display = 'block';
        this.errorMessage.textContent = message;
        this.errorContainer.style.display = 'flex';
        this.summaryContainer.style.display = 'none';
        this.linksContainer.style.display = 'none';
        
        // Reset toggle
        this.toggle.checked = false;
    }
    
    hideOutput() {
        this.outputSection.style.display = 'none';
        this.summaryContainer.style.display = 'none';
        this.linksContainer.style.display = 'none';
        this.errorContainer.style.display = 'none';
    }

    async saveSummaryToCache(url, summary, links) {
        if (typeof chrome === 'undefined' || !chrome.storage) return;
        const key = `summary_${url}`;
        return new Promise(resolve => {
            chrome.storage.local.set({ [key]: { summary, links, ts: Date.now()} }, () => resolve());
        });
    }

    async getCachedSummary(url) {
        if (typeof chrome === 'undefined' || !chrome.storage) return null;
        const key = `summary_${url}`;
        return new Promise(resolve => {
            chrome.storage.local.get(key, (res) => {
                resolve(res[key] || null);
            });
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CanvasSummarizer();
});

// Handle page navigation changes (for SPA-like Canvas behavior)
let currentUrl = window.location.href;
setInterval(() => {
    if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        // Re-check environment when URL changes
        setTimeout(() => {
            if (window.canvasSummarizer) {
                window.canvasSummarizer.checkCanvasEnvironment();
            }
        }, 1000);
    }
}, 1000);

// Export for global access
window.CanvasSummarizer = CanvasSummarizer;
