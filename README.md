# Canvas RCA - Assignment Summarizer

A sleek, standalone mini-app that detects Canvas assignment pages, extracts content, and provides AI-powered summaries along with external link extraction.

## 🚀 Features

- **Smart Detection**: Automatically detects Canvas assignment pages across different institutions
- **AI Summarization**: Generates concise assignment summaries using LLM APIs
- **Link Extraction**: Identifies and lists external links while filtering out Canvas-internal navigation
- **Modern UI**: Clean, responsive design with smooth animations and accessibility features
- **Error Handling**: Comprehensive error management with user-friendly messages
- **Mobile-First**: Optimized for both desktop and mobile Canvas usage

## 📁 File Structure

```
├── hello.html      # Main HTML structure with header, toggle, and output sections
├── popup.css       # Modern styling with light theme and responsive design
├── popup.js        # Core functionality for detection, extraction, and API integration
└── README.md       # This file
```

## 🛠️ Setup Instructions

### 1. API Configuration

Open `popup.js` and update the API configuration section:

```javascript
this.apiConfig = {
    endpoint: 'YOUR_LLM_ENDPOINT_HERE',     // e.g., 'https://api.openai.com/v1/chat/completions'
    apiKey: 'YOUR_API_KEY_HERE',            // Your actual API key
    model: 'gpt-3.5-turbo'                  // Adjust model as needed
};
```

### 2. Supported LLM APIs

The app is configured for OpenAI's ChatGPT API by default, but can be adapted for:

- **OpenAI**: `https://api.openai.com/v1/chat/completions`
- **Anthropic Claude**: `https://api.anthropic.com/v1/messages`
- **Azure OpenAI**: `https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT/chat/completions?api-version=2023-05-15`
- **Other compatible APIs**: Adjust the payload format in `callLLMAPI()` method

### 3. Canvas Institution Setup

The app auto-detects Canvas environments using common patterns:

- `*.instructure.com`
- `canvas.*`
- `learn.*`
- `lms.*`
- Plus common Canvas DOM selectors

For custom Canvas domains, add your pattern to the `canvasPatterns` array in `detectCanvasEnvironment()`.

## 🎯 Usage

1. **Open the app**: Open `hello.html` in any modern web browser
2. **Navigate to Canvas**: Go to any Canvas assignment page in another tab/window
3. **Check status**: The app will automatically detect if you're on a valid assignment page
4. **Enable summarizer**: Toggle the "Enable Canvas Summarizer" switch
5. **View results**: The app will display the assignment summary and any external links found

## 🎨 Design Features

### Color Palette
- Background: `#f9faff` (very light blue)
- Cards: `#ffffff` with subtle shadows
- Primary accent: `#3366ff` (blue)
- Text: `#2d3748` (dark gray)

### Typography
- Font: Inter (with system fallbacks)
- Responsive sizing with mobile-first approach

### Components
- Modern CSS-only toggle switches
- Smooth loading animations
- Accessible focus states
- High contrast mode support

## 🔧 Technical Details

### Canvas Detection Logic

The app uses a two-step detection process:

1. **Domain Detection**: Checks for common Canvas hostnames
2. **Content Detection**: Looks for assignment-specific DOM elements using multiple selectors:
   - `.assignment-content`
   - `#assignment_show`
   - `[data-testid="assignment-description"]`
   - And more...

### Link Filtering

External links are identified by excluding Canvas-internal patterns:
- `/courses/`, `/modules/`, `/assignments/`
- Navigation and system links
- Anchor links (`#`) and email/tel links

### Security Features

- Content sanitization before API calls
- XSS prevention in summary display
- Secure external link handling (`rel="noopener noreferrer"`)
- Input length limiting (4000 chars max)

## 🚨 Error Handling

The app handles various error scenarios:

- **No Canvas detected**: Disables toggle with warning message
- **No assignment found**: Shows "No assignment found" status
- **API errors**: Displays user-friendly error messages
- **Network failures**: Graceful degradation with retry suggestions
- **Rate limiting**: Button disabling during processing

## 🔧 Customization

### Adding New Canvas Selectors

To support additional Canvas versions, add selectors to the `assignmentSelectors` array:

```javascript
const assignmentSelectors = [
    '.assignment-content',
    '.your-custom-selector',  // Add your selector here
    // ... existing selectors
];
```

### Modifying the UI Theme

Update the CSS variables in `popup.css`:

```css
:root {
    --primary-color: #3366ff;     /* Change primary accent color */
    --background-color: #f9faff;  /* Change background color */
    --card-color: #ffffff;        /* Change card background */
}
```

### API Integration

For different LLM providers, modify the `callLLMAPI()` method:

```javascript
// Example for different API format
const payload = {
    prompt: `Summarize this assignment: ${assignmentData.content}`,
    max_tokens: 300,
    // ... provider-specific parameters
};
```

## 📱 Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🎯 Demo Mode

The app includes a built-in demo mode when no API key is configured. It will:
- Show a mock loading animation
- Generate a sample summary based on detected keywords
- Display the interface without making actual API calls

## 🛡️ Privacy & Security

- No data is stored locally
- Assignment content is only sent to your configured LLM API
- All external links open in new tabs with security headers
- Content is sanitized before processing

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the Canvas Assignment Summarizer.

## License

This project is open-source and available under the MIT License.
