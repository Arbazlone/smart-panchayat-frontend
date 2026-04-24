// Smart Panchayat - Voice Command Module
class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.supportedLanguages = ['en-IN', 'hi-IN', 'ur-IN', 'pa-IN'];
        this.currentLang = 'en-IN';
        this.init();
    }
    
    init() {
        // Check browser support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('🗣️ Voice recognition not supported in this browser');
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = this.currentLang;
        
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            console.log('🎤 Voice command:', transcript);
            this.processCommand(transcript);
        };
        
        this.recognition.onerror = (event) => {
            console.error('🎤 Voice error:', event.error);
            if (event.error === 'not-allowed') {
                showToast('Please allow microphone access', 'error');
            }
        };
        
        this.recognition.onend = () => {
            this.isListening = false;
            document.getElementById('voiceBtn')?.classList.remove('listening');
        };
        
        this.addVoiceButton();
    }
    
    addVoiceButton() {
        // Create floating voice button
        const btn = document.createElement('button');
        btn.id = 'voiceBtn';
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
        btn.style.cssText = `
            position: fixed;
            bottom: 90px;
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
            z-index: 999;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        btn.addEventListener('click', () => this.toggleListening());
        document.body.appendChild(btn);
        
        // Add language selector
        const langSelect = document.createElement('select');
        langSelect.id = 'voiceLangSelect';
        langSelect.style.cssText = `
            position: fixed;
            bottom: 155px;
            right: 20px;
            padding: 8px 12px;
            border-radius: 20px;
            border: 1px solid #ddd;
            background: white;
            font-size: 12px;
            z-index: 999;
            cursor: pointer;
        `;
        langSelect.innerHTML = `
            <option value="en-IN">🇬🇧 EN</option>
            <option value="hi-IN">🇮🇳 हिन्दी</option>
            <option value="ur-IN">🇵🇰 اردو</option>
            <option value="pa-IN">🇮🇳 ਪੰਜਾਬੀ</option>
        `;
        langSelect.addEventListener('change', (e) => {
            this.currentLang = e.target.value;
        });
        document.body.appendChild(langSelect);
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
        this.recognition.start();
        
        const btn = document.getElementById('voiceBtn');
        if (btn) {
            btn.classList.add('listening');
            btn.innerHTML = '<i class="fas fa-microphone-alt fa-beat" style="color: #FF0000;"></i>';
        }
        
        showToast('🎤 Listening... Speak now', 'info');
    }
    
    stopListening() {
        this.isListening = false;
        this.recognition.stop();
        
        const btn = document.getElementById('voiceBtn');
        if (btn) {
            btn.classList.remove('listening');
            btn.innerHTML = '<i class="fas fa-microphone"></i>';
        }
    }
    
    processCommand(transcript) {
        // Service Request Commands
        if (this.matchCommand(transcript, ['service', 'plumber', 'electrician', 'carpenter', 'painter', 'सर्विस', 'प्लंबर', 'इलेक्ट्रीशियन', 'बिजली', 'सेवा'])) {
            this.createServiceFromVoice(transcript);
            return;
        }
        
        // Issue Report Commands
        if (this.matchCommand(transcript, ['issue', 'report', 'problem', 'समस्या', 'शिकायत', 'रिपोर्ट', 'मुद्दा'])) {
            this.createIssueFromVoice(transcript);
            return;
        }
        
        // Emergency Commands
        if (this.matchCommand(transcript, ['emergency', 'help', 'sos', 'बचाओ', 'मदद', 'आपातकाल', 'इमरजेंसी'])) {
            this.triggerEmergencyFromVoice();
            return;
        }
        
        // Navigation Commands
        if (this.matchCommand(transcript, ['profile', 'प्रोफाइल', 'my profile'])) {
            window.location.href = 'profile.html';
            return;
        }
        
        if (this.matchCommand(transcript, ['posts', 'feed', 'पोस्ट', 'फीड'])) {
            window.location.href = 'dashboard.html';
            return;
        }
        
        if (this.matchCommand(transcript, ['map', 'नक्शा', 'maps'])) {
            window.location.href = 'map.html';
            return;
        }
        
        // If no command matched
        showToast(`Heard: "${transcript}" - No action matched`, 'info');
    }
    
    matchCommand(transcript, keywords) {
        return keywords.some(keyword => transcript.includes(keyword.toLowerCase()));
    }
    
    createServiceFromVoice(transcript) {
        // Extract service type
        const services = {
            plumber: ['plumber', 'प्लंबर', 'plumbing'],
            electrician: ['electrician', 'इलेक्ट्रीशियन', 'बिजली', 'electrical'],
            carpenter: ['carpenter', 'बढ़ई', 'carpentry'],
            painter: ['painter', 'पेंटर', 'painting'],
            cleaner: ['cleaner', 'सफाई', 'cleaning'],
            mechanic: ['mechanic', 'मैकेनिक']
        };
        
        let serviceType = 'other';
        for (const [type, keywords] of Object.entries(services)) {
            if (keywords.some(k => transcript.includes(k))) {
                serviceType = type;
                break;
            }
        }
        
        // Extract budget
        const budgetMatch = transcript.match(/budget\s*(\d+)|₹\s*(\d+)|(\d+)\s*rupees|(\d+)\s*रुपये/i);
        let budget = null;
        if (budgetMatch) {
            budget = budgetMatch[1] || budgetMatch[2] || budgetMatch[3] || budgetMatch[4];
        }
        
        // Extract description
        const description = transcript.replace(/\d+/, '').trim();
        
        // Open create post modal and pre-fill
        if (window.openCreatePostModal) {
            openCreatePostModal('service');
            
            setTimeout(() => {
                const serviceTypeEl = document.getElementById('serviceType');
                if (serviceTypeEl) serviceTypeEl.value = serviceType;
                
                const budgetEl = document.getElementById('serviceBudget');
                if (budgetEl && budget) budgetEl.value = budget;
                
                const descEl = document.getElementById('postDescription');
                if (descEl) descEl.value = `Voice request: ${description}`;
                
                showToast(`✅ Service request created: ${serviceType}`, 'success');
            }, 500);
        }
    }
    
    createIssueFromVoice(transcript) {
        // Extract issue category
        const categories = {
            water: ['water', 'पानी', 'paani'],
            electricity: ['electricity', 'light', 'बिजली', 'bijli'],
            road: ['road', 'सड़क', 'rasta', 'path'],
            sanitation: ['sanitation', 'clean', 'सफाई', 'garbage']
        };
        
        let category = 'other';
        for (const [cat, keywords] of Object.entries(categories)) {
            if (keywords.some(k => transcript.includes(k))) {
                category = cat;
                break;
            }
        }
        
        if (window.openCreatePostModal) {
            openCreatePostModal('issue');
            
            setTimeout(() => {
                const categoryEl = document.getElementById('issueCategory');
                if (categoryEl) categoryEl.value = category;
                
                const descEl = document.getElementById('postDescription');
                if (descEl) descEl.value = `Voice report: ${transcript}`;
                
                showToast(`✅ Issue reported: ${category}`, 'success');
            }, 500);
        }
    }
    
    triggerEmergencyFromVoice() {
        if (window.openEmergencyModal) {
            openEmergencyModal();
            showToast('🚨 Opening emergency modal', 'warning');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.voiceAssistant = new VoiceAssistant();
});