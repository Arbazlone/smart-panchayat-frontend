// LibreTranslate Widget - No Branding, Full Page Translation
class LibreTranslator {
  constructor() {
    this.apiUrl = 'https://translate.argosopentech.com'; // Free public instance
    this.supportedLangs = {
      'hi': 'Hindi',
      'pa': 'Punjabi', 
      'ur': 'Urdu',
      'en': 'English'
    };
    this.currentLang = localStorage.getItem('selectedLanguage') || 'en';
    this.originalTexts = new Map();
    this.init();
  }

  init() {
    this.captureOriginalTexts();
    this.createLanguageSwitcher();
    if (this.currentLang !== 'en') {
      this.translatePage(this.currentLang);
    }
  }

  captureOriginalTexts() {
    // Store all text nodes with their original English content
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script, style, and empty text
          if (node.parentElement.tagName === 'SCRIPT' || 
              node.parentElement.tagName === 'STYLE' ||
              node.textContent.trim() === '') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let textNode;
    while (textNode = walker.nextNode()) {
      const text = textNode.textContent.trim();
      if (text && !this.originalTexts.has(textNode)) {
        this.originalTexts.set(textNode, text);
      }
    }
  }

  createLanguageSwitcher() {
    const switcher = document.createElement('select');
    switcher.id = 'languageSwitcher';
    switcher.style.cssText = `
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #ddd;
      background: white;
      font-size: 14px;
      cursor: pointer;
      margin: 0 10px;
    `;

    Object.entries(this.supportedLangs).forEach(([code, name]) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = name;
      if (code === this.currentLang) option.selected = true;
      switcher.appendChild(option);
    });

    switcher.addEventListener('change', async (e) => {
      const lang = e.target.value;
      localStorage.setItem('selectedLanguage', lang);
      if (lang === 'en') {
        this.restoreOriginalTexts();
      } else {
        await this.translatePage(lang);
      }
    });

    // Add to navbar - adjust selector based on your HTML
    const navContainer = document.querySelector('nav, .navbar, header');
    if (navContainer) {
      navContainer.appendChild(switcher);
    } else {
      document.body.insertBefore(switcher, document.body.firstChild);
    }
  }

  async translatePage(targetLang) {
    const textsToTranslate = [];
    const textNodes = [];

    for (let [node, text] of this.originalTexts) {
      if (text.length > 0) {
        textsToTranslate.push(text);
        textNodes.push(node);
      }
    }

    // Translate in chunks (API limit)
    const chunkSize = 50;
    for (let i = 0; i < textsToTranslate.length; i += chunkSize) {
      const chunk = textsToTranslate.slice(i, i + chunkSize);
      const nodeChunk = textNodes.slice(i, i + chunkSize);
      
      try {
        const response = await fetch(`${this.apiUrl}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: chunk,
            source: 'en',
            target: targetLang,
            format: 'text'
          })
        });

        const data = await response.json();
        
        if (data.translatedText) {
          const translations = Array.isArray(data.translatedText) ? data.translatedText : [data.translatedText];
          nodeChunk.forEach((node, index) => {
            if (translations[index]) {
              node.textContent = translations[index];
            }
          });
        }
      } catch (error) {
        console.error('Translation chunk failed:', error);
      }
    }

    // Handle RTL for Urdu
    if (targetLang === 'ur') {
      document.body.style.direction = 'rtl';
    } else {
      document.body.style.direction = 'ltr';
    }
  }

  restoreOriginalTexts() {
    for (let [node, originalText] of this.originalTexts) {
      node.textContent = originalText;
    }
    document.body.style.direction = 'ltr';
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.translator = new LibreTranslator();
});