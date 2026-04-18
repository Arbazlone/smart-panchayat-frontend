// Language Switcher - Working Version
class LanguageSwitcher {
  constructor() {
    this.currentLang = localStorage.getItem('selectedLanguage') || 'en';
    this.init();
  }

  init() {
    this.createDropdown();
  }

  createDropdown() {
    const select = document.createElement('select');
    select.id = 'languageSelect';
    select.style.cssText = `
      padding: 8px 16px;
      border-radius: 20px;
      border: 1px solid #ddd;
      background: white;
      font-size: 14px;
      margin: 0 10px;
      cursor: pointer;
    `;

    const languages = [
      { code: 'en', name: 'English' },
      { code: 'hi', name: 'हिन्दी' },
      { code: 'pa', name: 'ਪੰਜਾਬੀ' },
      { code: 'ur', name: 'اردو' }
    ];

    languages.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang.code;
      option.textContent = lang.name;
      if (lang.code === this.currentLang) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      const newLang = e.target.value;
      localStorage.setItem('selectedLanguage', newLang);
      this.changeLanguage(newLang);
    });

    // Add to header
    const header = document.querySelector('header, nav, .navbar, .top-bar');
    if (header) {
      header.appendChild(select);
    } else {
      document.body.insertBefore(select, document.body.firstChild);
    }
  }

  changeLanguage(lang) {
    if (lang === 'en') {
      // Reload page to reset to English
      location.reload();
      return;
    }

    // Create Google Translate iframe (invisible)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `https://translate.google.com/translate?hl=${lang}&sl=en&u=${window.location.href}`;
    
    iframe.onload = () => {
      try {
        const translatedText = iframe.contentDocument.body.innerText;
        // This approach is limited - Google blocks direct access
        console.log('Translation loaded');
      } catch (e) {
        console.log('Using alternate method');
      }
    };
    
    document.body.appendChild(iframe);

    // Fallback: Use Google Translate free widget (invisible)
    if (!document.getElementById('google_translate_element')) {
      const div = document.createElement('div');
      div.id = 'google_translate_element';
      div.style.display = 'none';
      document.body.appendChild(div);

      const script = document.createElement('script');
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateCallback';
      document.body.appendChild(script);

      window.googleTranslateCallback = () => {
        new google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: 'hi,pa,ur',
          layout: google.translate.TranslateElement.InlineLayout.SIMPLE
        }, 'google_translate_element');

        // Trigger translation
        setTimeout(() => {
          const select = document.querySelector('.goog-te-combo');
          if (select) {
            select.value = lang;
            select.dispatchEvent(new Event('change'));
          }
        }, 500);
      };
    }
  }
}

// Start when page loads
document.addEventListener('DOMContentLoaded', () => {
  new LanguageSwitcher();
});