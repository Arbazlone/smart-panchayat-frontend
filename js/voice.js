/**
 * Smart Panchayat - Advanced Voice Command Module
 * Supports: English, Hindi, Urdu, Punjabi
 */

class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentLang = localStorage.getItem('voiceLang') || 'en-IN';
        this.wakeWordEnabled = true;
        this.wakeWord = 'smart panchayat';
        this.wakeWordDetected = false;
        this.commandHistory = [];
        
        this.languages = {
            'en-IN': { name: 'English', flag: '🇬🇧' },
            'hi-IN': { name: 'हिन्दी', flag: '🇮🇳' },
            'ur-IN': { name: 'اردو', flag: '🇵🇰' },
            'pa-IN': { name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' }
        };
        
        this.init();
    }
    
    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Voice recognition not supported in this browser');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            console.log('🎤 Heard:', transcript);
            this.showFeedback(`"${transcript}"`);
            this.processCommand(transcript);
        };
        
        this.recognition.onerror = (event) => {
            console.error('🎤 Error:', event.error);
            if (event.error === 'not-allowed') {
                showToast('Please allow microphone access in browser settings', 'error');
            }
            this.stopListening();
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            this.updateButtonState();
        };
        
        this.buildUI();
    }
    
    // ============ BUILD UI ============
    
    buildUI() {
        // Voice Button
        const btn = document.createElement('button');
        btn.id = 'voiceBtn';
        btn.className = 'voice-btn';
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
        btn.title = 'Voice Commands (Click to speak)';
        btn.addEventListener('click', () => this.toggleListening());
        document.body.appendChild(btn);
        
        // Language Selector
        const langWrap = document.createElement('div');
        langWrap.className = 'voice-lang-wrapper';
        
        const langBtn = document.createElement('button');
        langBtn.className = 'voice-lang-btn';
        langBtn.innerHTML = '🌐';
        langBtn.title = 'Change voice language';
        langBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('voiceLangDropdown');
            if (dropdown) dropdown.classList.toggle('show');
        });
        langWrap.appendChild(langBtn);
        
        const dropdown = document.createElement('div');
        dropdown.id = 'voiceLangDropdown';
        dropdown.className = 'voice-lang-dropdown';
        
        Object.entries(this.languages).forEach(([code, lang]) => {
            const item = document.createElement('div');
            item.className = 'voice-lang-item';
            item.innerHTML = `${lang.flag} ${lang.name}`;
            if (code === this.currentLang) item.classList.add('active');
            item.addEventListener('click', () => {
                this.currentLang = code;
                localStorage.setItem('voiceLang', code);
                dropdown.classList.remove('show');
                showToast(`Voice: ${lang.name}`, 'success');
            });
            dropdown.appendChild(item);
        });
        
        document.body.appendChild(langWrap);
        document.body.appendChild(dropdown);
        
        // Close dropdown on outside click
        document.addEventListener('click', () => dropdown.classList.remove('show'));
        
        // Feedback Display
        const feedback = document.createElement('div');
        feedback.id = 'voiceFeedback';
        feedback.className = 'voice-feedback';
        document.body.appendChild(feedback);
        
        // Help Button
        const helpBtn = document.createElement('button');
        helpBtn.className = 'voice-help-btn';
        helpBtn.innerHTML = '?';
        helpBtn.title = 'Voice Commands Help';
        helpBtn.addEventListener('click', () => this.showHelp());
        document.body.appendChild(helpBtn);
    }
    
    updateButtonState() {
        const btn = document.getElementById('voiceBtn');
        if (!btn) return;
        
        if (this.isListening) {
            btn.classList.add('listening');
            btn.innerHTML = '<i class="fas fa-microphone-alt"></i>';
        } else {
            btn.classList.remove('listening');
            btn.innerHTML = '<i class="fas fa-microphone"></i>';
        }
    }
    
    showFeedback(msg) {
        const fb = document.getElementById('voiceFeedback');
        if (!fb) return;
        fb.textContent = msg;
        fb.classList.add('show');
        clearTimeout(this.feedbackTimeout);
        this.feedbackTimeout = setTimeout(() => fb.classList.remove('show'), 2000);
    }
    
    // ============ LISTENING ============
    
    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }
    
    startListening() {
        if (!this.recognition) {
            showToast('Voice not supported in this browser', 'error');
            return;
        }
        
        this.recognition.lang = this.currentLang;
        this.isListening = true;
        
        try {
            this.recognition.start();
            this.updateButtonState();
            this.showFeedback('🎤 Listening... Speak now');
        } catch (e) {
            console.warn('Recognition error:', e);
            this.isListening = false;
            this.updateButtonState();
        }
    }
    
    stopListening() {
        this.isListening = false;
        try {
            this.recognition.stop();
        } catch (e) {}
        this.updateButtonState();
        this.showFeedback('');
    }
    
    // ============ SPEAK BACK ============
    
    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.currentLang;
            utterance.rate = 0.9;
            utterance.volume = 0.8;
            window.speechSynthesis.speak(utterance);
        }
    }
    
    // ============ COMMAND PROCESSING ============
    
    processCommand(transcript) {
        // Service Creation
        if (this.matchKeywords(transcript, ['service', 'plumber', 'electrician', 'carpenter', 'painter', 'सर्विस', 'प्लंबर', 'इलेक्ट्रीशियन', 'बढ़ई', 'पेंटर', 'kaam'])) {
            this.createService(transcript);
            return;
        }
        
        // Issue Reporting
        if (this.matchKeywords(transcript, ['issue', 'report', 'problem', 'complain', 'समस्या', 'शिकायत', 'रिपोर्ट', 'खराब', 'टूटा'])) {
            this.createIssue(transcript);
            return;
        }
        
        // Emergency
        if (this.matchKeywords(transcript, ['emergency', 'sos', 'help me', 'बचाओ', 'मदद', 'आपातकाल', 'इमरजेंसी'])) {
            this.handleEmergency();
            return;
        }
        
        // Navigation
        if (this.matchKeywords(transcript, ['go to', 'open', 'show', 'जाओ', 'खोलो', 'दिखाओ'])) {
            this.handleNavigation(transcript);
            return;
        }
        
        // Search
        if (this.matchKeywords(transcript, ['search', 'find', 'खोज', 'ढूंढ', 'kaha hai'])) {
            this.handleSearch(transcript);
            return;
        }
        
        // Status
        if (this.matchKeywords(transcript, ['status', 'stats', 'how many', 'कितने', 'स्थिति'])) {
            this.handleStatus();
            return;
        }
        
        // Help
        if (this.matchKeywords(transcript, ['help', 'commands', 'what can', 'मदद', 'सहायता'])) {
            this.showHelp();
            return;
        }
        
        // No match
        this.speak('Command not recognized. Say help for available commands.');
        this.stopListening();
    }
    
    matchKeywords(text, keywords) {
        return keywords.some(k => text.includes(k));
    }
    
    // ============ ACTIONS ============
    
    createService(transcript) {
        const types = {
            'plumber': ['plumber', 'प्लंबर'],
            'electrician': ['electrician', 'इलेक्ट्रीशियन', 'बिजली'],
            'carpenter': ['carpenter', 'बढ़ई'],
            'painter': ['painter', 'पेंटर'],
            'cleaner': ['cleaner', 'सफाई'],
            'mechanic': ['mechanic', 'मैकेनिक'],
            'tutor': ['tutor', 'teacher', 'टीचर']
        };
        
        let serviceType = 'other';
        for (const [type, keys] of Object.entries(types)) {
            if (keys.some(k => transcript.includes(k))) {
                serviceType = type;
                break;
            }
        }
        
        // Extract budget
        let budget = null;
        const budgetMatch = transcript.match(/(\d+)\s*(rupees|rs|rupay|रुपये|₹)/i) || transcript.match(/budget\s*(\d+)/i) || transcript.match(/₹\s*(\d+)/i);
        if (budgetMatch) {
            budget = budgetMatch[1] || budgetMatch[2];
        }
        
        this.speak(`Creating ${serviceType} service request`);
        
        if (window.openCreatePostModal) {
            openCreatePostModal('service');
            setTimeout(() => {
                const typeEl = document.getElementById('serviceType');
                if (typeEl) typeEl.value = serviceType;
                const budgetEl = document.getElementById('serviceBudget');
                if (budgetEl && budget) budgetEl.value = budget;
                const descEl = document.getElementById('postDescription');
                if (descEl) descEl.value = `🎤 Voice request: ${transcript}`;
            }, 500);
        }
        
        showToast(`✅ Service: ${serviceType}`, 'success');
        this.stopListening();
    }
    
    createIssue(transcript) {
        const categories = {
            'water': ['water', 'पानी', 'paani'],
            'electricity': ['electricity', 'light', 'बिजली', 'bijli'],
            'road': ['road', 'सड़क', 'rasta'],
            'sanitation': ['sanitation', 'clean', 'सफाई', 'garbage', 'kachra']
        };
        
        let category = 'other';
        for (const [cat, keys] of Object.entries(categories)) {
            if (keys.some(k => transcript.includes(k))) {
                category = cat;
                break;
            }
        }
        
        let priority = 'medium';
        if (transcript.match(/urgent|high|तुरंत|जरूरी/i)) priority = 'high';
        
        this.speak(`Reporting ${category} issue`);
        
        if (window.openCreatePostModal) {
            openCreatePostModal('issue');
            setTimeout(() => {
                const catEl = document.getElementById('issueCategory');
                if (catEl) catEl.value = category;
                const priEl = document.getElementById('issuePriority');
                if (priEl) priEl.value = priority;
                const descEl = document.getElementById('postDescription');
                if (descEl) descEl.value = `🎤 Voice report: ${transcript}`;
            }, 500);
        }
        
        showToast(`✅ Issue: ${category}`, 'success');
        this.stopListening();
    }
    
    handleEmergency() {
        this.speak('Opening emergency alert');
        if (window.openEmergencyModal) {
            openEmergencyModal();
        }
        this.stopListening();
    }
    
    handleNavigation(transcript) {
        const pages = {
            'dashboard.html': ['home', 'feed', 'dashboard', 'होम', 'फीड', 'घर'],
            'profile.html': ['profile', 'प्रोफाइल'],
            'map.html': ['map', 'नक्शा', 'maps'],
            'users.html': ['users', 'people', 'लोग', 'directory'],
            'chat.html': ['chat', 'message', 'चैट', 'बात']
        };
        
        for (const [page, keys] of Object.entries(pages)) {
            if (keys.some(k => transcript.includes(k))) {
                this.speak(`Opening ${page.replace('.html', '')}`);
                setTimeout(() => window.location.href = page, 500);
                this.stopListening();
                return;
            }
        }
    }
    
    handleSearch(transcript) {
        let query = transcript.replace(/search|find|खोज|ढूंढ|kaha hai/gi, '').trim();
        if (query) {
            this.speak(`Searching for ${query}`);
            if (window.dashboardManager) {
                window.dashboardManager.searchQuery = query;
                window.dashboardManager.switchFilter('all');
            }
            showToast(`🔍 "${query}"`, 'info');
        }
        this.stopListening();
    }
    
    handleStatus() {
        const posts = document.getElementById('postCount')?.textContent || '0';
        const helped = document.getElementById('helpedCount')?.textContent || '0';
        const rating = document.getElementById('ratingValue')?.textContent || '0.0';
        
        const msg = `You have ${posts} posts, helped ${helped} people, rating ${rating}`;
        this.speak(msg);
        showToast(`📊 ${msg}`, 'success');
        this.stopListening();
    }
    
    // ============ HELP ============
    
    showHelp() {
        const commands = [
            { icon: '🔧', en: 'Create service for plumber budget 500', hi: 'प्लंबर सर्विस बजट 500' },
            { icon: '⚠️', en: 'Report water issue', hi: 'पानी की समस्या रिपोर्ट' },
            { icon: '🚨', en: 'Emergency / SOS', hi: 'इमरजेंसी / मदद' },
            { icon: '👤', en: 'Open profile', hi: 'प्रोफाइल खोलो' },
            { icon: '🔍', en: 'Search for electrician', hi: 'इलेक्ट्रीशियन ढूंढो' },
            { icon: '📊', en: 'Check my status', hi: 'मेरा स्टेटस दिखाओ' },
            { icon: '🏠', en: 'Go to home', hi: 'होम पे जाओ' },
            { icon: '💬', en: 'Open chat', hi: 'चैट खोलो' }
        ];
        
        const overlay = document.createElement('div');
        overlay.className = 'voice-help-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        
        overlay.innerHTML = `
            <div class="voice-help-card">
                <div class="voice-help-header">
                    <h3>🎤 Voice Commands</h3>
                    <button onclick="this.closest('.voice-help-overlay').remove()">✕</button>
                </div>
                <div class="voice-help-list">
                    ${commands.map(c => `
                        <div class="voice-help-item">
                            <span class="voice-help-icon">${c.icon}</span>
                            <div>
                                <div class="voice-help-en">${c.en}</div>
                                <div class="voice-help-hi">${c.hi}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.stopListening();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new VoiceAssistant();
});