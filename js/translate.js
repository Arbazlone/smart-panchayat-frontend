// Smart Panchayat - Fast Translation with Caching
class PageTranslator {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'en';
        this.translationCache = new Map();
        this.originalTexts = new Map();
        this.apiUrl = 'https://api.mymemory.translated.net/get';
        this.init();
    }
    
    init() {
        this.captureOriginalTexts();
        this.addLanguageSwitcherToTopBar();
        if (this.currentLang !== 'en') {
            setTimeout(() => this.translatePage(this.currentLang), 300);
        }
    }
    
    captureOriginalTexts() {
        this.originalTexts.clear();
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const parent = node.parentElement;
                    if (!parent || parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || 
                        parent.tagName === 'NOSCRIPT' || parent.tagName === 'CODE' ||
                        parent.id === 'languageSwitcher' || parent.closest('#langSwitcher')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    const text = node.textContent.trim();
                    if (text.length < 2) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const text = node.textContent.trim();
            if (!this.originalTexts.has(node)) {
                this.originalTexts.set(node, text);
            }
        }
    }
    
    addLanguageSwitcherToTopBar() {
        // Create wrapper for top bar placement
        const wrapper = document.createElement('div');
        wrapper.className = 'lang-switcher-wrapper';
        wrapper.style.cssText = `
            display: flex;
            align-items: center;
            margin-left: 12px;
        `;
        
        const select = document.createElement('select');
        select.id = 'langSwitcher';
        select.style.cssText = `
            padding: 6px 12px;
            border-radius: 20px;
            border: 1px solid #ddd;
            background: white;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            outline: none;
            color: #333;
        `;
        
        const langs = [
            { code: 'en', name: '🇬🇧 EN' },
            { code: 'hi', name: '🇮🇳 हिन्दी' },
            { code: 'ur', name: '🇵🇰 اردو' },
            { code: 'pa', name: '🇮🇳 ਪੰਜਾਬੀ' }
        ];
        
        langs.forEach(lang => {
            const opt = document.createElement('option');
            opt.value = lang.code;
            opt.textContent = lang.name;
            if (lang.code === this.currentLang) opt.selected = true;
            select.appendChild(opt);
        });
        
        select.addEventListener('change', async (e) => {
            const lang = e.target.value;
            localStorage.setItem('language', lang);
            
            if (lang === 'en') {
                this.restoreOriginalTexts();
                document.body.style.direction = 'ltr';
            } else {
                select.disabled = true;
                select.style.opacity = '0.6';
                await this.translatePage(lang);
                select.disabled = false;
                select.style.opacity = '1';
                document.body.style.direction = lang === 'ur' ? 'rtl' : 'ltr';
            }
        });
        
        wrapper.appendChild(select);
        
        // Try to add to multiple possible top bar locations
        const topBar = document.querySelector('.header-top, .navbar, nav, header, .top-bar, .flex.items-center');
        if (topBar) {
            topBar.appendChild(wrapper);
        } else {
            // Fallback - fixed position top right
            wrapper.style.cssText += `
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: 9999;
            `;
            document.body.appendChild(wrapper);
        }
    }
    
    async translatePage(targetLang) {
        const nodes = [];
        const texts = [];
        
        for (const [node, text] of this.originalTexts) {
            if (text.length > 0) {
                nodes.push(node);
                texts.push(text);
            }
        }
        
        // Process in batches of 5 for speed
        const batchSize = 5;
        for (let i = 0; i < texts.length; i += batchSize) {
            const batchTexts = texts.slice(i, i + batchSize);
            const batchNodes = nodes.slice(i, i + batchSize);
            
            await Promise.all(batchTexts.map(async (text, idx) => {
                const node = batchNodes[idx];
                const cacheKey = `${targetLang}:${text}`;
                
                // Check cache first
                if (this.translationCache.has(cacheKey)) {
                    node.textContent = this.translationCache.get(cacheKey);
                    return;
                }
                
                try {
                    const url = `${this.apiUrl}?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
                    const response = await fetch(url);
                    const data = await response.json();
                    
                    if (data.responseData?.translatedText) {
                        const translated = data.responseData.translatedText;
                        this.translationCache.set(cacheKey, translated);
                        node.textContent = translated;
                    }
                } catch (error) {
                    // Silent fail - keep original text
                }
            }));
            
            // Tiny delay between batches
            await this.sleep(50);
        }
    }
    
    restoreOriginalTexts() {
        for (const [node, text] of this.originalTexts) {
            node.textContent = text;
        }
    }
    
        sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async refreshTranslation() {
        if (this.currentLang === 'en') return;
        this.captureOriginalTexts();
        await this.translatePage(this.currentLang);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.translator = new PageTranslator();
});