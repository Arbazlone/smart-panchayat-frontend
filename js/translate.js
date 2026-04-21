// Smart Panchayat - Google Translate (Unlimited Free + Dynamic Content)
class PageTranslator {
    constructor() {
        this.currentLang = localStorage.getItem('language') || 'en';
        this.retryAttempts = 0;
        this.maxRetries = 10;
        this.init();
    }
    
    init() {
        this.addLanguageSwitcherToTopBar();
        this.addGoogleTranslateWidget();
        
        if (this.currentLang !== 'en') {
            setTimeout(() => this.triggerGoogleTranslate(this.currentLang), 500);
        }
        
        // Make available globally
        window.translator = this;
    }
    
    addGoogleTranslateWidget() {
        // Skip if already added
        if (document.getElementById('google_translate_element')) return;
        
        const div = document.createElement('div');
        div.id = 'google_translate_element';
        div.style.display = 'none';
        document.body.appendChild(div);
        
        const script = document.createElement('script');
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateInit';
        document.body.appendChild(script);
        
        window.googleTranslateInit = () => {
            new google.translate.TranslateElement({
                pageLanguage: 'en',
                includedLanguages: 'hi,ur,pa',
                layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                autoDisplay: false
            }, 'google_translate_element');
            
            // Retry if language was set before widget loaded
            if (this.currentLang !== 'en') {
                setTimeout(() => this.triggerGoogleTranslate(this.currentLang), 300);
            }
        };
    }
    
    addLanguageSwitcherToTopBar() {
        // Skip if already exists
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
        
        select.addEventListener('change', (e) => {
            const lang = e.target.value;
            localStorage.setItem('language', lang);
            this.currentLang = lang;
            
            if (lang === 'en') {
                location.reload();
            } else {
                select.disabled = true;
                select.style.opacity = '0.6';
                this.triggerGoogleTranslate(lang);
                setTimeout(() => {
                    select.disabled = false;
                    select.style.opacity = '1';
                }, 1000);
            }
            document.body.style.direction = lang === 'ur' ? 'rtl' : 'ltr';
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
    
    triggerGoogleTranslate(lang, attempts = 0) {
        const googleSelect = document.querySelector('.goog-te-combo');
        
        if (googleSelect) {
            googleSelect.value = lang;
            googleSelect.dispatchEvent(new Event('change'));
            this.retryAttempts = 0;
        } else if (attempts < this.maxRetries) {
            setTimeout(() => this.triggerGoogleTranslate(lang, attempts + 1), 200);
        } else {
            console.warn('Google Translate widget failed to load');
        }
    }
    
    // Call this after dynamic content loads (Load More, new posts, etc.)
    refreshDynamicContent() {
        if (this.currentLang !== 'en') {
            // Small delay to let DOM update
            setTimeout(() => this.triggerGoogleTranslate(this.currentLang), 100);
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new PageTranslator();
});