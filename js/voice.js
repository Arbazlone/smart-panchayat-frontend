/**
 * Smart Panchayat - Voice Command Module (Fixed)
 */

class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.currentLang = localStorage.getItem('voiceLang') || 'en-IN';
        
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
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 3;
        this.recognition.lang = this.currentLang;
        
        this.recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            transcript = transcript.toLowerCase().trim();
            
            if (event.results[0].isFinal) {
                console.log('🎤 Final:', transcript);
                this.showFeedback(`"${transcript}"`);
                this.processCommand(transcript);
            } else {
                this.showFeedback(`...${transcript}`);
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('🎤 Error:', event.error);
            if (event.error === 'not-allowed') {
                showToast('Please allow microphone access', 'error');
            }
            this.stopListening();
        };
        
        this.recognition.onend = () => {
            if (this.isListening) {
                this.updateButton(false);
            }
            this.isListening = false;
            this.updateButton(false);
        };
        
        this.buildUI();
    }
    
    buildUI() {
        // Mic Button Only - positioned above bottom nav
        const btn = document.createElement('button');
        btn.id = 'voiceBtn';
        btn.innerHTML = '<i class="fas fa-microphone"></i>';
        btn.title = 'Voice Commands - Click to speak';
        btn.addEventListener('click', () => this.toggleListening());
        btn.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            border: none;
            background: linear-gradient(135deg, #FF6B35, #E55A2B);
            color: white;
            font-size: 22px;
            cursor: pointer;
            box-shadow: 0 4px 16px rgba(255, 107, 53, 0.4);
            z-index: 996;
            transition: all 0.3s ease;
        `;
        document.body.appendChild(btn);
        
        // Small feedback text near mic
        const feedback = document.createElement('div');
        feedback.id = 'voiceFeedback';
        feedback.style.cssText = `
            position: fixed;
            bottom: 138px;
            right: 16px;
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 8px 14px;
            border-radius: 10px;
            font-size: 12px;
            z-index: 996;
            max-width: 200px;
            display: none;
            text-align: right;
        `;
        document.body.appendChild(feedback);
        
        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes voicePulse {
                0% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.6); }
                70% { box-shadow: 0 0 0 20px rgba(211, 47, 47, 0); }
                100% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0); }
            }
            #voiceBtn:hover { transform: scale(1.08); }
        `;
        document.head.appendChild(style);
    }
    
    updateButton(listening) {
        const btn = document.getElementById('voiceBtn');
        if (!btn) return;
        
        if (listening) {
            btn.style.background = 'linear-gradient(135deg, #D32F2F, #B71C1C)';
            btn.style.animation = 'voicePulse 1.5s infinite';
            btn.innerHTML = '<i class="fas fa-microphone-alt"></i>';
        } else {
            btn.style.background = 'linear-gradient(135deg, #FF6B35, #E55A2B)';
            btn.style.animation = '';
            btn.innerHTML = '<i class="fas fa-microphone"></i>';
        }
    }
    
    showFeedback(msg) {
        const fb = document.getElementById('voiceFeedback');
        if (!fb) return;
        fb.textContent = msg;
        fb.style.display = 'block';
        clearTimeout(this.fbTimeout);
        this.fbTimeout = setTimeout(() => fb.style.display = 'none', 3000);
    }
    
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
            this.updateButton(true);
            this.showFeedback('🎤 Listening...');
        } catch (e) {
            this.isListening = false;
            this.updateButton(false);
        }
    }
    
    stopListening() {
        this.isListening = false;
        try { this.recognition.stop(); } catch (e) {}
        this.updateButton(false);
    }
    
    processCommand(text) {
        console.log('🔍 Processing:', text);
        
        // Detect language and set voice
        if (/[अ-ह]/.test(text)) this.currentLang = 'hi-IN';
        else if (/[أ-ي]/.test(text)) this.currentLang = 'ur-IN';
        else if (/[ਅ-ੲ]/.test(text)) this.currentLang = 'pa-IN';
        else this.currentLang = 'en-IN';
        
        // ============ SERVICE REQUEST ============
        const serviceKeywords = [
            'chahiye', 'service', 'kaam', 'karwana', 'carpenter', 'electrician',
            'plumber', 'painter', 'mechanic', 'tutor', 'cleaner', 'doctor',
            'सर्विस', 'सेवा', 'चाहिए', 'काम', 'प्लंबर', 'इलेक्ट्रीशियन',
            'बढ़ई', 'पेंटर', 'मैकेनिक', 'टीचर', 'डॉक्टर', 'बिजली',
            'plumber', 'electric', 'repair', 'fix', 'need'
        ];
        
        if (serviceKeywords.some(k => text.includes(k))) {
            this.createService(text);
            return;
        }
        
        // ============ ISSUE REPORT ============
        const issueKeywords = [
            'problem', 'issue', 'report', 'complain', 'broken', 'not working',
            'समस्या', 'शिकायत', 'खराब', 'टूटा', 'नहीं', 'रिपोर्ट',
            'kharab', 'problem hai', 'gadbad'
        ];
        
        if (issueKeywords.some(k => text.includes(k))) {
            this.createIssue(text);
            return;
        }
        
        // ============ EMERGENCY ============
        const emergencyKeywords = [
            'emergency', 'sos', 'help', 'बचाओ', 'मदद', 'आपातकाल',
            'इमरजेंसी', 'bachao', 'madad'
        ];
        
        if (emergencyKeywords.some(k => text.includes(k))) {
            this.handleEmergency();
            return;
        }
        
        // ============ NAVIGATION ============
        if (text.includes('profile') || text.includes('प्रोफाइल')) {
            window.location.href = 'profile.html';
            this.stopListening();
            return;
        }
        if (text.includes('home') || text.includes('feed') || text.includes('होम') || text.includes('फीड')) {
            window.location.href = 'dashboard.html';
            this.stopListening();
            return;
        }
        if (text.includes('map') || text.includes('नक्शा')) {
            window.location.href = 'map.html';
            this.stopListening();
            return;
        }
        if (text.includes('chat') || text.includes('message') || text.includes('चैट')) {
            window.location.href = 'chat.html';
            this.stopListening();
            return;
        }
        if (text.includes('users') || text.includes('लोग') || text.includes('directory')) {
            window.location.href = 'users.html';
            this.stopListening();
            return;
        }
        
        // ============ HELP ============
        if (text.includes('help') || text.includes('command') || text.includes('मदद')) {
            this.showHelp();
            this.stopListening();
            return;
        }
        
        // No match
        showToast(`Not recognized: "${text}". Try: electrician chahiye, report water problem`, 'info');
        this.stopListening();
    }
    
    createService(text) {
        // Detect service type
        const serviceMap = {
            'plumber': ['plumber', 'प्लंबर', 'plumbing'],
            'electrician': ['electrician', 'electric', 'इलेक्ट्रीशियन', 'बिजली', 'bijli'],
            'carpenter': ['carpenter', 'बढ़ई', 'furniture', 'lakdi'],
            'painter': ['painter', 'पेंटर', 'paint', 'rang'],
            'cleaner': ['cleaner', 'सफाई', 'safai', 'cleaning'],
            'mechanic': ['mechanic', 'मैकेनिक', 'repair', 'thik'],
            'tutor': ['tutor', 'teacher', 'टीचर', 'padhai', 'पढ़ाई'],
            'doctor': ['doctor', 'डॉक्टर', 'medical', 'ilaj']
        };
        
        let serviceType = 'other';
        let serviceName = 'Service';
        for (const [type, keywords] of Object.entries(serviceMap)) {
            if (keywords.some(k => text.includes(k))) {
                serviceType = type;
                serviceName = type.charAt(0).toUpperCase() + type.slice(1);
                break;
            }
        }
        
        // Extract budget
        let budget = null;
        const patterns = [
            /(\d+)\s*(?:rupay|rupees|rs|रुपये|₹|rupaye)/i,
            /(?:budget|price|rate)\s*(?:is\s*)?(\d+)/i,
            /(?:₹|rs\.?)\s*(\d+)/i,
            /(\d+)\s*(?:ka|mein|main|me)/i
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                budget = match[1];
                break;
            }
        }
        
        // Create title
        const title = `Need ${serviceName}${budget ? ' - ₹' + budget : ''}`;
        
        // Extract description
        let description = text;
        Object.values(serviceMap).flat().forEach(k => description = description.replace(k, ''));
        ['chahiye', 'service', 'kaam', 'karwana', 'create', 'new', 'need', 'want', 'mujhe', 'mere'].forEach(k => {
            description = description.replace(new RegExp(k, 'gi'), '');
        });
        description = description.replace(/\d+/g, '').replace(/₹|rs|rupay|rupees|rupaye/gi, '').trim();
        if (!description) description = `Need ${serviceName} service`;
        description = '🎤 ' + description.charAt(0).toUpperCase() + description.slice(1);
        
        // Speak back
        this.speak(`Creating ${serviceName} service request`);
        showToast(`✅ ${title}`, 'success');
        
        // Open modal and fill
        if (window.openCreatePostModal) {
            openCreatePostModal('service');
            setTimeout(() => {
                const typeEl = document.getElementById('serviceType');
                if (typeEl) typeEl.value = serviceType;
                
                const budgetEl = document.getElementById('serviceBudget');
                if (budgetEl && budget) budgetEl.value = budget;
                
                const titleEl = document.getElementById('postTitle');
                if (titleEl) titleEl.value = title;
                
                const descEl = document.getElementById('postDescription');
                if (descEl) descEl.value = description;
                
                // Trigger char count update
                if (descEl) descEl.dispatchEvent(new Event('input'));
            }, 600);
        }
        
        this.stopListening();
    }
    
    createIssue(text) {
        const categoryMap = {
            'water': ['water', 'पानी', 'paani', 'nal'],
            'electricity': ['electric', 'light', 'बिजली', 'bijli', 'current', 'power'],
            'road': ['road', 'सड़क', 'rasta', 'path', 'road'],
            'sanitation': ['sanitation', 'clean', 'सफाई', 'garbage', 'kachra', 'गंदगी', 'safai']
        };
        
        let category = 'other';
        for (const [cat, keywords] of Object.entries(categoryMap)) {
            if (keywords.some(k => text.includes(k))) {
                category = cat;
                break;
            }
        }
        
        let priority = 'medium';
        if (text.match(/urgent|high|तुरंत|जरूरी|fast|quick/i)) priority = 'high';
        
        const title = `Issue: ${category.charAt(0).toUpperCase() + category.slice(1)} Problem`;
        let description = text;
        ['report', 'issue', 'problem', 'complaint', 'समस्या', 'शिकायत', 'रिपोर्ट', 'kharab'].forEach(k => {
            description = description.replace(new RegExp(k, 'gi'), '');
        });
        description = '🎤 ' + description.trim();
        
        this.speak(`Reporting ${category} issue`);
        showToast(`✅ Issue: ${category}`, 'success');
        
        if (window.openCreatePostModal) {
            openCreatePostModal('issue');
            setTimeout(() => {
                const catEl = document.getElementById('issueCategory');
                if (catEl) catEl.value = category;
                
                const priEl = document.getElementById('issuePriority');
                if (priEl) priEl.value = priority;
                
                const titleEl = document.getElementById('postTitle');
                if (titleEl) titleEl.value = title;
                
                const descEl = document.getElementById('postDescription');
                if (descEl) descEl.value = description;
            }, 600);
        }
        
        this.stopListening();
    }
    
    handleEmergency() {
        this.speak('Opening emergency alert');
        if (window.openEmergencyModal) openEmergencyModal();
        this.stopListening();
    }
    
    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = this.currentLang;
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    }
    
    showHelp() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
        `;
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        
        overlay.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 24px; max-width: 350px; width: 90%;" onclick="event.stopPropagation()">
                <h3 style="margin-bottom: 16px;">🎤 Voice Commands</h3>
                <div style="max-height: 300px; overflow-y: auto;">
                    <p>🔧 "Electrician chahiye 200 mein"</p>
                    <p>⚠️ "Water problem hai"</p>
                    <p>🚨 "Emergency" / "Help"</p>
                    <p>👤 "Open profile"</p>
                    <p>🏠 "Go to home"</p>
                    <p>💬 "Open chat"</p>
                </div>
                <button style="margin-top: 16px; width:100%; padding:12px; background:#FF6B35; color:white; border:none; border-radius:12px; font-size:16px; font-weight:600;" onclick="this.closest('div').parentElement.remove()">Got it</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new VoiceAssistant();
});