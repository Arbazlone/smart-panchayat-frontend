// Smart Panchayat - Microsoft Translator (Free, No Limits, Reliable)
class PageTranslator {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'en';
        this.apiKey = null;
        this.originalTexts = new Map();
        this.translationCache = new Map();
        this.init();
    }
    
    async init() {
        await this.getToken();
        this.captureOriginalTexts();
        this.addLanguageSwitcherToTopBar();
        
        if (this.currentLang !== 'en') {
            setTimeout(() => this.translatePage(this.currentLang), 500);
        }
        
        window.translator = this;
    }
    
    async getToken() {
        try {
            const res = await fetch('https://edge.microsoft.com/translate/auth');
            this.apiKey = await res.text();
            console.log('✅ Microsoft Translator ready');
        } catch (e) {
            console.warn('⚠️ Microsoft Translator unavailable');
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
                        parent.id === 'langSwitcher' || parent.closest('#langSwitcher')) {
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
        if (document.getElementById('langSwitcher')) return;
        
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
            this.currentLang = lang;
            
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
        
        const topBar = document.querySelector('.header-top, .navbar, nav, header, .top-bar, .flex.items-center');
        if (topBar) {
            topBar.appendChild(wrapper);
        } else {
            wrapper.style.cssText += `position: fixed; top: 10px; right: 10px; z-index: 9999;`;
            document.body.appendChild(wrapper);
        }
    }
    
    async translatePage(targetLang) {
        if (!this.apiKey) {
            console.warn('No API key available');
            return;
        }
        
        const nodes = [];
        const texts = [];
        
        for (const [node, text] of this.originalTexts) {
            if (text.length > 0) {
                nodes.push(node);
                texts.push(text);
            }
        }
        
        // Process in batches of 25
        const batchSize = 25;
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const nodeBatch = nodes.slice(i, i + batchSize);
            
            try {
                const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${targetLang}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(batch.map(t => ({ Text: t })))
                });
                
                const data = await response.json();
                
                data.forEach((item, idx) => {
                    if (nodeBatch[idx] && item.translations[0]) {
                        nodeBatch[idx].textContent = item.translations[0].text;
                        this.translationCache.set(`${targetLang}:${batch[idx]}`, item.translations[0].text);
                    }
                });
            } catch (error) {
                console.warn('Translation batch failed:', error);
            }
            
            await this.sleep(50);
        }
    }
    
    restoreOriginalTexts() {
        for (const [node, text] of this.originalTexts) {
            node.textContent = text;
        }
    }
    
    async refreshDynamicContent() {
        if (this.currentLang !== 'en') {
            this.captureOriginalTexts();
            await this.translatePage(this.currentLang);
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new PageTranslator();
});