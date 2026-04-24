// Smart Panchayat - Advanced Voice Command Module
class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.conversationMode = false;
        this.commandHistory = [];
        this.currentLang = 'en-IN';
        this.wakeWord = 'smart panchayat';
        this.wakeWordDetected = false;
        
        this.supportedLanguages = {
            'en-IN': 'English',
            'hi-IN': 'हिन्दी',
            'ur-IN': 'اردو',
            'pa-IN': 'ਪੰਜਾਬੀ'
        };
        
        this.init();
    }
    
    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('Voice recognition not supported');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = this.currentLang;
        
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase().trim();
            console.log('🎤 Heard:', transcript);
            
            if (this.conversationMode) {
                this.handleConversation(transcript);
            } else {
                // Check wake word first
                if (transcript.includes(this.wakeWord)) {
                    this.wakeWordDetected = true;
                    const command = transcript.replace(this.wakeWord, '').trim();
                    if (command) {
                        this.processCommand(command);
                    } else {
                        this.speak('Yes? How can I help you?');
                        this.startListeningForCommand();
                    }
                } else if (this.wakeWordDetected) {
                    this.processCommand(transcript);
                    this.wakeWordDetected = false;
                } else {
                    this.processCommand(transcript);
                }
            }
            
            this.commandHistory.push({
                command: transcript,
                timestamp: new Date(),
                language: this.currentLang
            });
        };
        
        this.recognition.onerror = (event) => {
            console.error('Voice error:', event.error);
            if (event.error === 'not-allowed') {
                showToast('Please allow microphone access', 'error');
            }
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            const btn = document.getElementById('voiceBtn');
            if (btn) {
                btn.classList.remove('listening');
                btn.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        };
        
        this.addVoiceUI();
    }
    
    // ============ VOICE UI ============
    
    addVoiceUI() {
        // Main Voice Button
        const btn = document.createElement('button');
        btn.id = 'voiceBtn';
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
        btn.title = 'Voice Commands (Say "Smart Panchayat" to activate)';
        btn.style.cssText = `
            position: fixed;
            bottom: 25px;
            right: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #FF6B35, #E55A2B);
            color: white;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(255, 107, 53, 0.4);
            z-index: 998;
            transition: all 0.3s ease;
        `;
        btn.addEventListener('click', () => this.toggleListening());
        document.body.appendChild(btn);
        
        // Voice Feedback Display
        const feedback = document.createElement('div');
        feedback.id = 'voiceFeedback';
        feedback.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 16px;
            border-radius: 16px;
            font-size: 14px;
            z-index: 998;
            display: none;
            max-width: 250px;
            backdrop-filter: blur(10px);
            animation: fadeIn 0.3s ease;
        `;
        document.body.appendChild(feedback);
        
        // Language Selector
        const langSelect = document.createElement('select');
        langSelect.id = 'voiceLangSelect';
        langSelect.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 85px;
            padding: 6px 10px;
            border-radius: 20px;
            border: 1px solid #ddd;
            background: white;
            font-size: 11px;
            z-index: 998;
            cursor: pointer;
        `;
        Object.entries(this.supportedLanguages).forEach(([code, name]) => {
            const opt = document.createElement('option');
            opt.value = code;
            opt.textContent = name.split(' ')[0];
            langSelect.appendChild(opt);
        });
        langSelect.addEventListener('change', (e) => {
            this.currentLang = e.target.value;
            showToast(`Voice language: ${this.supportedLanguages[this.currentLang]}`, 'info');
        });
        document.body.appendChild(langSelect);
        
        // Help tooltip
        const helpBtn = document.createElement('button');
        helpBtn.id = 'voiceHelpBtn';
        helpBtn.innerHTML = '?';
        helpBtn.title = 'Voice Commands Help';
        helpBtn.style.cssText = `
            position: fixed;
            bottom: 88px;
            right: 155px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 1px solid #ddd;
            background: white;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            z-index: 998;
        `;
        helpBtn.addEventListener('click', () => this.showHelp());
        document.body.appendChild(helpBtn);
    }
    
    toggleListening() {
        if (!this.recognition) {
            showToast('Voice not supported in this browser', 'error');
            return;
        }
        
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }
    
    startListening() {
        this.recognition.lang = this.currentLang;
        this.isListening = true;
        
        try {
            this.recognition.start();
            this.showFeedback('🎤 Listening...');
            
            const btn = document.getElementById('voiceBtn');
            if (btn) {
                btn.classList.add('listening');
                btn.innerHTML = '<i class="fas fa-microphone-alt"></i>';
                btn.style.animation = 'voicePulse 1.5s infinite';
            }
        } catch (e) {
            console.warn('Recognition already started');
        }
    }
    
    startListeningForCommand() {
        setTimeout(() => {
            if (!this.isListening) {
                this.startListening();
            }
        }, 500);
    }
    
    stopListening() {
        this.isListening = false;
        try {
            this.recognition.stop();
        } catch (e) {}
        
        const btn = document.getElementById('voiceBtn');
        if (btn) {
            btn.classList.remove('listening');
            btn.innerHTML = '<i class="fas fa-microphone"></i>';
            btn.style.animation = '';
        }
        this.hideFeedback();
    }
    
    showFeedback(message) {
        const fb = document.getElementById('voiceFeedback');
        if (fb) {
            fb.textContent = message;
            fb.style.display = 'block';
        }
    }
    
    hideFeedback() {
        const fb = document.getElementById('voiceFeedback');
        if (fb) {
            fb.style.display = 'none';
        }
    }
    
    // ============ TEXT-TO-SPEECH ============
    
    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.currentLang;
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    }
    
    // ============ COMMAND PROCESSING ============
    
    processCommand(transcript) {
        this.showFeedback(`Processing: "${transcript}"`);
        
        // Service Creation
        if (this.matchServiceCommand(transcript)) {
            this.createServiceFromVoice(transcript);
            return;
        }
        
        // Issue Reporting
        if (this.matchIssueCommand(transcript)) {
            this.createIssueFromVoice(transcript);
            return;
        }
        
        // Emergency
        if (this.matchEmergencyCommand(transcript)) {
            this.triggerEmergency();
            return;
        }
        
        // Navigation
        if (this.matchNavigationCommand(transcript)) {
            this.navigateFromVoice(transcript);
            return;
        }
        
        // Search/Browse
        if (this.matchSearchCommand(transcript)) {
            this.searchFromVoice(transcript);
            return;
        }
        
        // Profile Actions
        if (this.matchProfileCommand(transcript)) {
            this.profileActionFromVoice(transcript);
            return;
        }
        
        // Status/Info
        if (this.matchStatusCommand(transcript)) {
            this.getStatusInfo(transcript);
            return;
        }
        
        // Help
        if (this.matchHelpCommand(transcript)) {
            this.showHelp();
            return;
        }
        
        // No match
        this.speak('Command not recognized. Say help for available commands.');
        this.hideFeedback();
        this.wakeWordDetected = false;
    }
    
    // ============ COMMAND MATCHERS ============
    
    matchServiceCommand(text) {
        const keywords = [
            'create service', 'new service', 'request service', 'need a', 'i need',
            'सर्विस', 'सेवा', 'प्लंबर', 'इलेक्ट्रीशियन', 'बढ़ई', 'पेंटर',
            'plumber', 'electrician', 'carpenter', 'painter', 'mechanic', 'tutor',
            'service chahiye', 'kaam karwana', 'service request'
        ];
        return keywords.some(k => text.includes(k));
    }
    
    matchIssueCommand(text) {
        const keywords = [
            'report', 'issue', 'problem', 'complain', 'complaint', 'broken', 'not working',
            'समस्या', 'शिकायत', 'रिपोर्ट', 'खराब', 'टूटा', 'problem hai'
        ];
        return keywords.some(k => text.includes(k));
    }
    
    matchEmergencyCommand(text) {
        const keywords = [
            'emergency', 'sos', 'help me', 'urgent', 'danger', 'fire', 'accident',
            'बचाओ', 'मदद', 'आपातकाल', 'आग', 'दुर्घटना', 'इमरजेंसी'
        ];
        return keywords.some(k => text.includes(k));
    }
    
    matchNavigationCommand(text) {
        const keywords = [
            'go to', 'open', 'show', 'navigate', 'take me',
            'जाओ', 'खोलो', 'दिखाओ', 'ले चलो', 'जाना'
        ];
        return keywords.some(k => text.includes(k));
    }
    
    matchSearchCommand(text) {
        const keywords = [
            'search', 'find', 'look for', 'show me', 'where is',
            'खोज', 'ढूंढ', 'दिखाओ', 'कहां है'
        ];
        return keywords.some(k => text.includes(k));
    }
    
    matchProfileCommand(text) {
        const keywords = [
            'profile', 'my account', 'settings', 'edit', 'update',
            'प्रोफाइल', 'सेटिंग्स', 'अकाउंट', 'बदलो'
        ];
        return keywords.some(k => text.includes(k));
    }
    
    matchStatusCommand(text) {
        const keywords = [
            'status', 'how many', 'count', 'my stats', 'check',
            'कितने', 'स्थिति', 'देखो', 'बताओ'
        ];
        return keywords.some(k => text.includes(k));
    }
    
    matchHelpCommand(text) {
        const keywords = [
            'help', 'what can you do', 'commands', 'features',
            'मदद', 'सहायता', 'क्या कर सकते', 'सुविधाएं'
        ];
        return keywords.some(k => text.includes(k));
    }
    
    // ============ ACTION HANDLERS ============
    
    createServiceFromVoice(transcript) {
        // Extract service type
        const serviceMap = {
            'plumber': ['plumber', 'प्लंबर', 'plumbing'],
            'electrician': ['electrician', 'इलेक्ट्रीशियन', 'बिजली', 'electrical'],
            'carpenter': ['carpenter', 'बढ़ई', 'carpentry', 'furniture'],
            'painter': ['painter', 'पेंटर', 'painting', 'paint'],
            'cleaner': ['cleaner', 'सफाई', 'cleaning'],
            'mechanic': ['mechanic', 'मैकेनिक', 'repair'],
            'tutor': ['tutor', 'teacher', 'टीचर', 'teaching', 'पढ़ाई']
        };
        
        let serviceType = 'other';
        for (const [type, keywords] of Object.entries(serviceMap)) {
            if (keywords.some(k => transcript.includes(k))) {
                serviceType = type;
                break;
            }
        }
        
        // Extract budget
        let budget = null;
        const budgetPatterns = [
            /budget\s*(\d+)/i,
            /₹\s*(\d+)/,
            /(\d+)\s*rupees/i,
            /(\d+)\s*rupay/i,
            /(\d+)\s*रुपये/i,
            /(\d+)\s*rs/i,
            /price\s*(\d+)/i
        ];
        for (const pattern of budgetPatterns) {
            const match = transcript.match(pattern);
            if (match) {
                budget = match[1];
                break;
            }
        }
        
        // Extract description (everything after service type)
        let description = transcript;
        for (const keywords of Object.values(serviceMap)) {
            for (const k of keywords) {
                description = description.replace(k, '').trim();
            }
        }
        description = description.replace(/budget|₹|rupees|rupay|price/gi, '').replace(/\d+/g, '').trim();
        
        // Speak confirmation
        const serviceName = Object.keys(serviceMap).find(k => k === serviceType) || serviceType;
        this.speak(`Creating service request for ${serviceName}${budget ? ' with budget ' + budget + ' rupees' : ''}`);
        
        // Open modal and pre-fill
        if (window.openCreatePostModal) {
            openCreatePostModal('service');
            
            setTimeout(() => {
                const serviceTypeEl = document.getElementById('serviceType');
                if (serviceTypeEl) serviceTypeEl.value = serviceType;
                
                const budgetEl = document.getElementById('serviceBudget');
                if (budgetEl && budget) budgetEl.value = budget;
                
                const descEl = document.getElementById('postDescription');
                if (descEl && description) descEl.value = `🎤 Voice: ${description}`;
                
                showToast(`✅ Service: ${serviceName}${budget ? ' - ₹' + budget : ''}`, 'success');
            }, 500);
        }
        
        this.stopListening();
        this.hideFeedback();
    }
    
    createIssueFromVoice(transcript) {
        const categoryMap = {
            'water': ['water', 'पानी', 'paani', 'nal'],
            'electricity': ['electricity', 'light', 'बिजली', 'bijli', 'current'],
            'road': ['road', 'सड़क', 'rasta', 'path', 'road'],
            'sanitation': ['sanitation', 'clean', 'सफाई', 'garbage', 'kachra', 'गंदगी']
        };
        
        let category = 'other';
        for (const [cat, keywords] of Object.entries(categoryMap)) {
            if (keywords.some(k => transcript.includes(k))) {
                category = cat;
                break;
            }
        }
        
        // Extract priority
        let priority = 'medium';
        if (transcript.includes('urgent') || transcript.includes('high') || transcript.includes('तुरंत') || transcript.includes('जरूरी')) {
            priority = 'high';
        } else if (transcript.includes('low') || transcript.includes('normal') || transcript.includes('कम')) {
            priority = 'low';
        }
        
        const description = transcript.replace(/report|issue|problem|समस्या|शिकायत/gi, '').trim();
        
        this.speak(`Reporting ${category} issue`);
        
        if (window.openCreatePostModal) {
            openCreatePostModal('issue');
            
            setTimeout(() => {
                const categoryEl = document.getElementById('issueCategory');
                if (categoryEl) categoryEl.value = category;
                
                const priorityEl = document.getElementById('issuePriority');
                if (priorityEl) priorityEl.value = priority;
                
                const descEl = document.getElementById('postDescription');
                if (descEl && description) descEl.value = `🎤 Voice: ${description}`;
                
                showToast(`✅ Issue: ${category} - ${priority} priority`, 'success');
            }, 500);
        }
        
        this.stopListening();
        this.hideFeedback();
    }
    
    triggerEmergency() {
        this.speak('Opening emergency alert. Please confirm.');
        
        if (window.openEmergencyModal) {
            openEmergencyModal();
            showToast('🚨 Emergency modal opened', 'warning');
        }
        
        this.stopListening();
        this.hideFeedback();
    }
    
    navigateFromVoice(transcript) {
        const pages = {
            'dashboard': ['dashboard', 'home', 'feed', 'होम', 'फीड', 'घर'],
            'profile': ['profile', 'प्रोफाइल', 'my profile'],
            'map': ['map', 'नक्शा', 'maps'],
            'users': ['users', 'लोग', 'directory', 'people'],
            'chat': ['chat', 'message', 'बात', 'चैट']
        };
        
        let targetPage = null;
        for (const [page, keywords] of Object.entries(pages)) {
            if (keywords.some(k => transcript.includes(k))) {
                targetPage = page;
                break;
            }
        }
        
        if (targetPage) {
            this.speak(`Opening ${targetPage}`);
            setTimeout(() => {
                window.location.href = `${targetPage}.html`;
            }, 500);
        }
        
        this.stopListening();
        this.hideFeedback();
    }
    
    searchFromVoice(transcript) {
        let query = transcript;
        ['search', 'find', 'look for', 'show me', 'where is', 'खोज', 'ढूंढ', 'दिखाओ', 'कहां है'].forEach(k => {
            query = query.replace(k, '').trim();
        });
        
        if (query) {
            this.speak(`Searching for ${query}`);
            
            // Filter feed by search term
            if (window.dashboardManager) {
                window.dashboardManager.searchQuery = query;
                window.dashboardManager.switchFilter('all');
                showToast(`🔍 Searching: ${query}`, 'success');
            }
        }
        
        this.stopListening();
        this.hideFeedback();
    }
    
    profileActionFromVoice(transcript) {
        if (transcript.includes('edit') || transcript.includes('update') || transcript.includes('change') || transcript.includes('बदलो')) {
            window.location.href = 'profile.html#settings';
            this.speak('Opening profile settings');
        } else {
            window.location.href = 'profile.html';
            this.speak('Opening your profile');
        }
        
        this.stopListening();
        this.hideFeedback();
    }
    
    getStatusInfo(transcript) {
        if (window.dashboardManager) {
            const stats = {
                posts: document.getElementById('postCount')?.textContent || '0',
                helped: document.getElementById('helpedCount')?.textContent || '0',
                rating: document.getElementById('ratingValue')?.textContent || '0.0'
            };
            
            const message = `You have ${stats.posts} posts, helped ${stats.helped} people, with a rating of ${stats.rating}`;
            this.speak(message);
            showToast(`📊 ${message}`, 'success');
        }
        
        this.stopListening();
        this.hideFeedback();
    }
    
    // ============ HELP ============
    
    showHelp() {
        const helpText = this.currentLang === 'hi-IN' 
            ? 'आप ये कह सकते हैं: सर्विस बनाओ, समस्या रिपोर्ट करो, इमरजेंसी, प्रोफाइल खोलो, स्टेटस दिखाओ'
            : 'Try: Create service for plumber, Report water issue, Emergency, Open profile, Check status';
        
        this.speak(helpText);
        
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;
        overlay.addEventListener('click', () => overlay.remove());
        
        overlay.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 24px; max-width: 350px; width: 90%;" onclick="event.stopPropagation()">
                <h3 style="margin-bottom: 16px;">🎤 Voice Commands</h3>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${this.getHelpItems()}
                </div>
                <button class="btn btn-primary" style="margin-top: 16px;" onclick="this.closest('div').parentElement.remove()">Got it</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.stopListening();
        this.hideFeedback();
    }
    
    getHelpItems() {
        const items = [
            { icon: '🔧', en: 'Create service for plumber budget 500', hi: 'प्लंबर की सर्विस बनाओ बजट 500' },
            { icon: '⚠️', en: 'Report water issue in my area', hi: 'पानी की समस्या रिपोर्ट करो' },
            { icon: '🚨', en: 'Emergency / SOS', hi: 'इमरजेंसी / मदद' },
            { icon: '👤', en: 'Open profile', hi: 'प्रोफाइल खोलो' },
            { icon: '🔍', en: 'Search for electrician', hi: 'इलेक्ट्रीशियन ढूंढो' },
            { icon: '📊', en: 'Check my status', hi: 'मेरा स्टेटस दिखाओ' },
            { icon: '🏠', en: 'Go to home/dashboard', hi: 'होम पे जाओ' },
            { icon: '💬', en: 'Open chat', hi: 'चैट खोलो' },
            { icon: '🗺️', en: 'Open map', hi: 'नक्शा खोलो' }
        ];
        
        return items.map(item => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #eee;">
                <span style="font-size: 20px;">${item.icon}</span>
                <div>
                    <div style="font-weight: 600; font-size: 14px;">${item.en}</div>
                    <div style="font-size: 12px; color: #666;">${item.hi}</div>
                </div>
            </div>
        `).join('');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('dashboard')) {
        window.voiceAssistant = new VoiceAssistant();
    }
});

// Add pulse animation
const style = document.createElement('style');
style.textContent = `
    @keyframes voicePulse {
        0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.5); }
        70% { box-shadow: 0 0 0 20px rgba(255, 0, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    #voiceBtn:hover {
        transform: scale(1.1) !important;
    }
`;
document.head.appendChild(style);