/**
 * Smart Panchayat System - Profile Module
 * ULTRA ENHANCED: Badges, Ratings, Progress, Earnings, Share, Editable Contact
 */

class ProfileManager {
    constructor() {
        this.user = null;
        this.isProvider = false;
        this.API_BASE_URL = 'https://smart-panchayat-backend.onrender.com/api';
        this.DEV_MODE = false;
        this.viewingUserId = null;
        this.profileData = null;
        this.currentLocation = null;
        
        this.init();
    }
    
    async init() {
        if (!requireAuth()) return;
        
        this.user = getCurrentUser();
        
        const urlParams = new URLSearchParams(window.location.search);
        this.viewingUserId = urlParams.get('user');
        
        await this.getUserLocation();
        await this.loadUserProfile();
        
        if (!this.viewingUserId) {
            this.setupEventListeners();
            this.setupTabs();
            this.setupContactListeners();
            this.loadNotificationPreferences();
        } else {
            this.hideEditControls();
        }
    }
    
    async getUserLocation() {
        try {
            this.currentLocation = await getUserLocation();
        } catch (error) {
            this.currentLocation = { latitude: 28.6139, longitude: 77.2090 };
        }
    }
    
    hideEditControls() {
    // Hide all edit buttons
    const ids = ['changeAvatarBtn', 'editBioBtn', 'editContactBtn', 'settingsBtn', 'shareProfileBtn'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Hide provider toggle section completely
    const providerSection = document.querySelector('.info-card:has(#providerToggle)');
    if (providerSection) providerSection.style.display = 'none';
    
    // Hide the entire provider form card
    const providerCard = document.getElementById('providerForm')?.closest('.info-card');
    if (providerCard) providerCard.style.display = 'none';
    
    // Hide settings tab
    const settingsTab = document.querySelector('.profile-tab[data-tab="settings"]');
    if (settingsTab) settingsTab.style.display = 'none';
    
    // Hide earnings tab
    const earningsTab = document.querySelector('.profile-tab[data-tab="earnings"]');
    if (earningsTab) earningsTab.style.display = 'none';
}
    
    setupEventListeners() {
        document.getElementById('changeAvatarBtn')?.addEventListener('click', () => {
            document.getElementById('avatarInput').click();
        });
        
        document.getElementById('avatarInput')?.addEventListener('change', (e) => {
            this.handleAvatarChange(e.target.files[0]);
        });
        
        document.getElementById('providerToggle')?.addEventListener('change', (e) => {
            this.toggleProviderForm(e.target.checked);
        });
        
        document.getElementById('saveProviderBtn')?.addEventListener('click', () => {
            this.registerAsProvider();
        });
        
        document.getElementById('editBioBtn')?.addEventListener('click', () => {
            this.openEditBioModal();
        });
        
        document.getElementById('editBioForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBio();
        });
        
        document.getElementById('profileSettingsForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfileSettings();
        });
        
        document.getElementById('passwordChangeForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });
        
        document.getElementById('serviceFilter')?.addEventListener('change', (e) => {
            this.filterServices(e.target.value);
        });
        
        document.getElementById('saveNotifSettings')?.addEventListener('click', () => {
            this.saveNotificationSettings();
        });
        
        document.getElementById('settingsBtn')?.addEventListener('click', () => {
            this.switchTab('settings');
        });
        
        document.getElementById('shareProfileBtn')?.addEventListener('click', () => {
            this.shareProfile();
        });
        
        document.getElementById('refreshLocationBtn')?.addEventListener('click', async () => {
            await this.getUserLocation();
            this.updateLocationDisplay();
            showToast('Location updated!', 'success');
        });
        
        if (window.location.hash === '#provider') {
            setTimeout(() => {
                document.getElementById('providerToggle')?.scrollIntoView({ behavior: 'smooth' });
                document.getElementById('providerToggle')?.click();
            }, 500);
        }
        
        if (window.location.hash === '#badges') {
            setTimeout(() => {
                document.querySelector('.badges-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        }
    }
    
    setupTabs() {
        document.querySelectorAll('.profile-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = tab.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }
    
   switchTab(tabId) {
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}Tab`);
    });
    
    if (tabId === 'posts') {
        this.loadUserPosts();
    } else if (tabId === 'services') {
        this.loadUserServices();
    } else if (tabId === 'earnings' && this.isProvider) {
        this.loadEarnings();
    }
    
    // Update tab text if viewing someone else
    if (this.viewingUserId) {
        document.querySelectorAll('.profile-tab').forEach(tab => {
            if (tab.dataset.tab === 'posts') {
                tab.innerHTML = '<i class="fas fa-newspaper"></i> Posts';
            }
            if (tab.dataset.tab === 'services') {
                tab.innerHTML = '<i class="fas fa-tools"></i> Services';
            }
        });
    }
}
    
    // ============ CONTACT INFORMATION ============
    
    setupContactListeners() {
        document.getElementById('editContactBtn')?.addEventListener('click', () => {
            this.showContactEditMode();
        });
        
        document.getElementById('cancelContactBtn')?.addEventListener('click', () => {
            this.hideContactEditMode();
        });
        
        document.getElementById('saveContactBtn')?.addEventListener('click', () => {
            this.saveContactInfo();
        });
    }
    
    showContactEditMode() {
        const data = this.profileData || {};
        document.getElementById('editAlternatePhone').value = data.alternatePhone || '';
        document.getElementById('editEmail').value = data.email || '';
        document.getElementById('editAddress').value = data.address || '';
        
        document.getElementById('contactDisplay').style.display = 'none';
        document.getElementById('contactEdit').style.display = 'block';
    }
    
    hideContactEditMode() {
        document.getElementById('contactDisplay').style.display = 'block';
        document.getElementById('contactEdit').style.display = 'none';
    }
    
    async saveContactInfo() {
        const alternatePhone = document.getElementById('editAlternatePhone').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const address = document.getElementById('editAddress').value.trim();
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/users/contact`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify({ alternatePhone, email, address })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.profileData.email = email;
                this.profileData.alternatePhone = alternatePhone;
                this.profileData.address = address;
                
                this.updateContactDisplay(this.profileData);
                this.hideContactEditMode();
                showToast('Contact information updated!', 'success');
            } else {
                showToast(data.message || 'Failed to update', 'error');
            }
        } catch (error) {
            showToast('Network error', 'error');
        }
    }
    
    updateContactDisplay(data) {
    const el = (id) => document.getElementById(id);
    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin === true;
    const isOwnProfile = !this.viewingUserId || this.viewingUserId === currentUser?.id;
    
    // Phone number - ONLY show if admin OR own profile
    if (el('displayPhone')) {
        if (isAdmin || isOwnProfile) {
            el('displayPhone').textContent = data.phone || '--';
        } else {
            el('displayPhone').textContent = "📱 Hidden for privacy";
        }
    }
    
    // Alternate phone - same rule
    if (el('displayAlternatePhone')) {
        if (isAdmin || isOwnProfile) {
            el('displayAlternatePhone').textContent = data.alternatePhone || 'Not provided';
        } else {
            el('displayAlternatePhone').textContent = "📱 Hidden for privacy";
        }
    }
    
    // Email - same rule
    if (el('displayEmail')) {
        if (isAdmin || isOwnProfile) {
            el('displayEmail').textContent = data.email || 'Not provided';
        } else {
            el('displayEmail').textContent = "✉️ Hidden for privacy";
        }
    }
    
    // Address - show area only, hide full address
    if (el('displayAddress')) {
        if (isAdmin || isOwnProfile) {
            el('displayAddress').textContent = data.address || 'Not provided';
        } else {
            // Show only village/city, hide full address
            const area = data.address?.split(',')[0] || data.village || 'Location hidden';
            el('displayAddress').textContent = area + ' (Full address hidden)';
        }
    }
    
    if (el('editPhone')) el('editPhone').value = data.phone || '';
}
    
    // ============ PROFILE LOADING ============
    
   async loadUserProfile() {
    try {
        const endpoint = this.viewingUserId 
            ? `${this.API_BASE_URL}/users/profile/${this.viewingUserId}`
            : `${this.API_BASE_URL}/users/profile`;
        
        const response = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${this.user.token}` }
        });
        const data = await response.json();
        
       // ✅ ALSO FETCH STATS SEPARATELY
const statsRes = await fetch(`${this.API_BASE_URL}/users/stats`, {
    headers: { 'Authorization': `Bearer ${this.user.token}` }
});
        const statsData = await statsRes.json();
        
        if (statsData.success) {
            data.stats = {
                posts: statsData.posts || 0,
                helped: statsData.helped || 0,
                rating: statsData.rating || 0,
                reviews: statsData.reviews || 0
            };
        }
        
        this.profileData = data;
        this.displayProfile(data);
        
        await this.loadBadges();
        await this.loadBadgeProgress();
        
    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Failed to load profile', 'error');
    }
}
    
    updateLocationDisplay() {
        const el = document.getElementById('locationDisplay');
        if (!el) return;
        
        if (this.currentLocation) {
            getAddressFromCoords(this.currentLocation.latitude, this.currentLocation.longitude)
                .then(address => el.textContent = address)
                .catch(() => el.textContent = 'Location detected');
        } else {
            el.textContent = 'Location not available';
        }
    }
    
    displayProfile(data) {
        try {
            const el = (id) => document.getElementById(id);
            
           if (el('profileName')) {
    el('profileName').textContent = data.name || '';
    
    // Add crown for admin
    if (data.role === 'admin' || data.isAdmin) {
        el('profileName').innerHTML += ' <i class="fas fa-crown" style="color: #FFD700; font-size: 18px; margin-left: 6px;" title="Admin"></i>';
    }
}
           const currentUser = getCurrentUser();
const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin === true;
const isOwnProfile = !this.viewingUserId || this.viewingUserId === currentUser?.id;

if (el('userPhone')) {
    if (isAdmin || isOwnProfile) {
        el('userPhone').textContent = data.phone || '';
    } else {
        el('userPhone').textContent = '';
        el('userPhone').style.display = 'none';
    }
}
            if (el('userBio')) el('userBio').textContent = data.bio || 'No bio added yet.';
           if (el('userRole')) {
    if (data.role === 'admin' || data.isAdmin) {
        el('userRole').textContent = '👑 ADMIN';
        el('userRole').style.background = 'linear-gradient(135deg, #FFD700, #FFA000)';
        el('userRole').style.color = '#1B5E20';
        el('userRole').style.fontWeight = '700';
    } else {
        el('userRole').textContent = (data.role === 'provider') ? 'Service Provider' : 'Community Member';
    }
}
            if (el('memberSince')) el('memberSince').textContent = data.memberSince || 'Member';
            
            if (data.isVerified && el('profileName')) {
                el('profileName').innerHTML += ' <i class="fas fa-check-circle" style="color: var(--primary-green);"></i>';
            }
            
            if (data.avatar || data.profilePic) {
                const url = (data.avatar || data.profilePic).startsWith('http') 
                    ? (data.avatar || data.profilePic) 
                    : 'https://smart-panchayat-backend.onrender.com/api' + (data.avatar || data.profilePic);
                if (el('profileAvatar')) el('profileAvatar').src = url;
            }
            
            if (el('totalPosts')) el('totalPosts').textContent = data.stats?.posts || 0;
            if (el('helpedCount')) el('helpedCount').textContent = data.stats?.helped || 0;
            if (el('ratingValue')) el('ratingValue').textContent = (data.stats?.rating || data.providerDetails?.rating || 0).toFixed(1);
            if (el('reviewCount')) el('reviewCount').textContent = (data.stats?.reviews || data.providerDetails?.totalReviews || 0) + ' reviews';
            
            this.updateContactDisplay(data);
            
            if (!this.viewingUserId) {
                if (el('settingsName')) el('settingsName').value = data.name || '';
                if (el('settingsEmail')) el('settingsEmail').value = data.email || '';
                if (el('settingsPhone')) el('settingsPhone').value = data.phone || '';
                if (el('settingsBio')) el('settingsBio').value = data.bio || '';
                if (el('bioInput')) el('bioInput').value = data.bio || '';
            }
            
            this.isProvider = data.isProvider || data.role === 'provider';
            if (el('providerToggle')) el('providerToggle').checked = this.isProvider;
            
           if (this.isProvider && data.providerDetails) {
    this.loadProviderDetails(data.providerDetails);
    // Only show form for own profile
    if (!this.viewingUserId) {
        if (el('providerForm')) el('providerForm').style.display = 'block';
    }
} else {
    // Hide provider toggle for viewed profiles
    if (this.viewingUserId) {
        const providerToggle = document.getElementById('providerToggle')?.closest('.info-card');
        if (providerToggle) providerToggle.style.display = 'none';
    }
}
            
            if (this.viewingUserId && this.viewingUserId !== this.user.id) {
                this.addContactButton(data);
            }
            
            if (this.viewingUserId && data.lastActive) {
                this.updateOnlineStatus(data.lastActive);
            }
        } catch (e) {
            console.error('Error in displayProfile:', e);
        }
    }
    
    updateOnlineStatus(lastActive) {
        const isOnline = lastActive && new Date(lastActive) > new Date(Date.now() - 5 * 60 * 1000);
        const headerEl = document.querySelector('.profile-header');
        if (!headerEl) return;
        
        let statusEl = headerEl.querySelector('.online-status');
        if (!statusEl) {
            statusEl = document.createElement('span');
            statusEl.className = 'online-status';
            headerEl.appendChild(statusEl);
        }
        statusEl.className = `online-status ${isOnline ? 'online' : 'offline'}`;
        statusEl.innerHTML = isOnline ? '🟢 Online' : '⚫ Offline';
    }
    
    addContactButton(data) {
        const headerDiv = document.querySelector('.profile-header .flex');
        if (!headerDiv) return;
        
        const btnContainer = document.createElement('div');
        btnContainer.className = 'flex gap-sm ml-auto';
        btnContainer.innerHTML = `
            <button class="btn btn-primary" onclick="profileManager.contactUser('${this.viewingUserId}', '${data.name}')">
                <i class="fas fa-comment"></i> Message
            </button>
            <button class="btn btn-outline" onclick="profileManager.viewUserPosts('${this.viewingUserId}')">
                <i class="fas fa-newspaper"></i> Posts
            </button>
        `;
        headerDiv.appendChild(btnContainer);
    }
    
    contactUser(userId, name) {
        window.location.href = `chat.html?user=${userId}`;
    }
    
    viewUserPosts(userId) {
        window.location.href = `dashboard.html?filter=user&userId=${userId}`;
    }
    
    shareProfile() {
        const url = `${window.location.origin}/profile.html?user=${this.user.id}`;
        navigator.clipboard?.writeText(url);
        showToast('Profile link copied!', 'success');
    }
    
    // ============ BADGE PROGRESS ============
    
    async loadBadgeProgress() {
        const stats = this.profileData.stats || {};
        const requirements = [
            { name: 'First Post', icon: '📝', current: stats.posts || 0, target: 1 },
            { name: 'Active Contributor', icon: '📰', current: stats.posts || 0, target: 10 },
            { name: 'Helper', icon: '🤝', current: stats.helped || 0, target: 5 },
            { name: 'Super Helper', icon: '🦸', current: stats.helped || 0, target: 20 },
            { name: 'Rising Star', icon: '⭐', current: stats.rating || 0, target: 4.5 }
        ];
        
        this.renderBadgeProgress(requirements);
    }
    
    renderBadgeProgress(requirements) {
        const container = document.getElementById('progressContainer');
        if (!container) return;
        
        const inProgress = requirements.filter(b => b.current < b.target);
        
        if (inProgress.length === 0) {
            container.innerHTML = '<div class="badge-progress-empty"><i class="fas fa-trophy"></i><p>🎉 All badges unlocked!</p></div>';
            return;
        }
        
        container.innerHTML = inProgress.slice(0, 4).map(badge => {
            const percent = Math.min((badge.current / badge.target) * 100, 100);
            return `
                <div class="badge-progress-item">
                    <div class="badge-progress-icon">${badge.icon}</div>
                    <div class="badge-progress-info">
                        <div class="badge-progress-header">
                            <span class="badge-progress-name">${badge.name}</span>
                            <span class="badge-progress-stats">${badge.current}/${badge.target}</span>
                        </div>
                        <div class="badge-progress-bar">
                            <div class="badge-progress-fill" style="width: ${percent}%;"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        const unlocked = requirements.filter(b => b.current >= b.target).length;
        const countEl = document.getElementById('unlockedCount');
        if (countEl) countEl.textContent = `${unlocked}/${requirements.length}`;
    }
    
    // ============ BADGES ============
    
    async loadBadges() {
        try {
            const userId = this.viewingUserId || this.user.id;
            const response = await fetch(`${this.API_BASE_URL}/badges/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            const data = await response.json();
            if (data.success) this.renderBadges(data.badges);
        } catch (error) {}
    }
    
    renderBadges(badges) {
        const container = document.getElementById('badgesContainer');
        if (!container) return;
        
        const unlockedBadges = badges?.filter(b => b.unlocked === true) || [];
        
        if (unlockedBadges.length === 0) {
            container.innerHTML = `
                <div class="text-center p-lg">
                    <i class="fas fa-trophy" style="font-size: 2.5rem; color: var(--gray-400); opacity: 0.5;"></i>
                    <p class="text-gray-500 mt-sm">No badges unlocked yet.</p>
                    <p class="text-xs text-gray-400">Complete tasks to earn badges!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="badges-grid">
                ${unlockedBadges.map(b => `
                    <div class="badge-card unlocked" title="${b.description}">
                        <div class="badge-icon">${b.icon}</div>
                        <div class="badge-name">${b.name}</div>
                        <div class="badge-desc">${b.description}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // ============ RATINGS ============
    
    async loadRatings() {
        try {
            const userId = this.viewingUserId || this.user.id;
            const response = await fetch(`${this.API_BASE_URL}/ratings/provider/${userId}`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            const data = await response.json();
            if (data.success && data.ratings) this.renderRatings(data.ratings);
        } catch (error) {}
    }
    
    renderRatings(ratings) {
        const container = document.getElementById('ratingsContainer');
        if (!container) return;
        if (!ratings || ratings.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center p-md">⭐ No ratings yet</p>';
            return;
        }
        
        const avgRating = ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length;
        
        container.innerHTML = `
            <div class="ratings-summary">
                <div class="rating-big">${avgRating.toFixed(1)}</div>
                <div class="rating-stars">${this.renderStars(avgRating)}</div>
                <div class="rating-count">${ratings.length} reviews</div>
            </div>
            <div class="ratings-list">
                ${ratings.slice(0, 5).map(r => `
                    <div class="rating-item">
                        <div class="rating-header">
                            <span class="rating-score">${this.renderStars(r.score)}</span>
                            <span class="rating-date">${formatRelativeTime(r.createdAt)}</span>
                        </div>
                        ${r.review ? `<p class="rating-review">"${r.review}"</p>` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderStars(rating) {
        return Array(5).fill(0).map((_, i) => 
            `<i class="${i < Math.floor(rating) ? 'fas' : (i < rating ? 'fas fa-star-half-alt' : 'far')} fa-star" style="color: #FFB300;"></i>`
        ).join('');
    }
    
    // ============ EARNINGS ============
    
    async loadEarnings() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/bids/provider/earnings`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            const data = await response.json();
            if (data.success) this.renderEarnings(data);
        } catch (error) {}
    }
    
    renderEarnings(data) {
        const container = document.getElementById('earningsContainer');
        if (!container) return;
        container.innerHTML = `
            <div class="earnings-summary">
                <div class="earning-card"><div class="earning-label">Total Earned</div><div class="earning-value">₹${data.totalEarned || 0}</div></div>
                <div class="earning-card"><div class="earning-label">This Month</div><div class="earning-value">₹${data.monthlyEarned || 0}</div></div>
                <div class="earning-card"><div class="earning-label">Completed Jobs</div><div class="earning-value">${data.completedJobs || 0}</div></div>
            </div>
        `;
    }
    
    // ============ RECENT ACTIVITY ============
    
    async loadRecentActivity() {
        try {
            const userId = this.viewingUserId || this.user.id;
            const response = await fetch(`${this.API_BASE_URL}/activity/user/${userId}`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            const data = await response.json();
            if (data.success && data.activity) this.renderActivity(data.activity);
        } catch (error) {}
    }
    
    renderActivity(activities) {
        const container = document.getElementById('activityContainer');
        if (!container) return;
        if (!activities || activities.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center p-md">📋 No recent activity</p>';
            return;
        }
        container.innerHTML = activities.map(a => `
            <div class="activity-item">
                <div class="activity-icon">${this.getActivityIcon(a.type)}</div>
                <div class="activity-content">
                    <div class="activity-text">${this.getActivityText(a)}</div>
                    <div class="activity-time">${formatRelativeTime(a.createdAt)}</div>
                </div>
            </div>
        `).join('');
    }
    
    getActivityIcon(type) {
        const icons = { 'post': '📝', 'offer': '🤝', 'service': '🔧', 'emergency': '🚨', 'badge': '🏆', 'rating': '⭐' };
        return icons[type] || '📌';
    }
    
    getActivityText(activity) {
        const texts = {
            'post': 'Created a new post',
            'offer': 'Submitted an offer',
            'service': 'Completed a service',
            'emergency': 'Responded to emergency',
            'badge': `Earned "${activity.badgeName}" badge`,
            'rating': `Received a ${activity.rating}⭐ rating`
        };
        return texts[activity.type] || 'Performed an action';
    }
    
    // ============ NOTIFICATIONS ============
    
    loadNotificationPreferences() {
        const settings = JSON.parse(localStorage.getItem('notification_settings') || '{}');
        ['notifEmergency', 'notifPosts', 'notifServices', 'notifMessages'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = settings[id.replace('notif', '').toLowerCase()] !== false;
        });
    }
    
    async saveNotificationSettings() {
        const settings = {
            emergency: document.getElementById('notifEmergency')?.checked || true,
            posts: document.getElementById('notifPosts')?.checked || true,
            services: document.getElementById('notifServices')?.checked || true,
            messages: document.getElementById('notifMessages')?.checked || true
        };
        localStorage.setItem('notification_settings', JSON.stringify(settings));
        showToast('Notification settings saved!', 'success');
    }
    
    // ============ PROVIDER METHODS ============
    
    toggleProviderForm(show) {
        const form = document.getElementById('providerForm');
        if (form) form.style.display = show ? 'block' : 'none';
    }
    
   loadProviderDetails(details) {
    if (!details) return;
    
    if (document.getElementById('serviceCategory')) {
        document.getElementById('serviceCategory').value = details.category || '';
    }
    if (document.getElementById('experience')) {
        document.getElementById('experience').value = details.experience || 0;
    }
    if (document.getElementById('hourlyRate')) {
        document.getElementById('hourlyRate').value = details.hourlyRate || 0;
    }
    if (document.getElementById('serviceDescription')) {
        document.getElementById('serviceDescription').value = details.description || '';
    }
    if (document.getElementById('serviceRadius')) {
        document.getElementById('serviceRadius').value = details.serviceRadius || details.radius || 10;
    }
    if (document.getElementById('availableNow')) {
        document.getElementById('availableNow').checked = details.available || false;
    }
}
    
    async registerAsProvider() {
    const category = document.getElementById('serviceCategory')?.value;
    const experience = document.getElementById('experience')?.value;
    const hourlyRate = document.getElementById('hourlyRate')?.value;
    const description = document.getElementById('serviceDescription')?.value;
    const radius = document.getElementById('serviceRadius')?.value;
    const available = document.getElementById('availableNow')?.checked;
    
    if (!category) { showToast('Select a category', 'error'); return; }
    if (!description) { showToast('Describe your services', 'error'); return; }
    
    const providerData = {
        category,
        experience: parseInt(experience) || 0,
        hourlyRate: parseFloat(hourlyRate) || 0,
        description,
        radius: parseInt(radius) || 10,
        available: available || false
    };
    
    try {
        const response = await fetch(`${this.API_BASE_URL}/users/become-provider`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${this.user.token}` 
            },
            body: JSON.stringify(providerData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            this.isProvider = true;
            const roleEl = document.getElementById('userRole');
            if (roleEl) roleEl.textContent = 'Service Provider';
            
            // Update local storage
            const storedUser = JSON.parse(localStorage.getItem('panchayat_user') || sessionStorage.getItem('panchayat_user') || '{}');
            storedUser.isProvider = true;
            storedUser.role = 'provider';
            storedUser.providerDetails = providerData;
            
            if (localStorage.getItem('panchayat_user')) {
                localStorage.setItem('panchayat_user', JSON.stringify(storedUser));
            } else {
                sessionStorage.setItem('panchayat_user', JSON.stringify(storedUser));
            }
            
            showToast('Registered as provider!', 'success');
            setTimeout(() => location.href = 'dashboard.html', 1500);
        } else {
            showToast(data.message || 'Failed to register', 'error');
        }
    } catch (error) { 
        showToast('Network error', 'error'); 
    }
}
    
    // ============ AVATAR ============
    
   async handleAvatarChange(file) {
    if (!file) {
        console.log('❌ No file selected');
        return;
    }
    
    console.log('📸 File selected:', file.name, file.type, file.size);
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('Image size should be less than 5MB', 'error');
        return;
    }
    
    // Show loading
    showToast('Uploading...', 'info');
    // Show local preview immediately
const reader = new FileReader();
reader.onload = (e) => {
    const avatarImg = document.getElementById('profileAvatar');
    if (avatarImg) avatarImg.src = e.target.result;
};
reader.readAsDataURL(file);
    
    try {
        const formData = new FormData();
        formData.append('avatar', file);
        
        // Get token from storage
        const token = this.user?.token || JSON.parse(localStorage.getItem('panchayat_user') || '{}').token;
        
        console.log('📤 Sending to:', `${this.API_BASE_URL}/users/avatar`);
        
        const response = await fetch(`${this.API_BASE_URL}/users/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
       // Check if response is JSON before parsing
const contentType = response.headers.get('content-type');
let data = { success: false, message: 'Server error' };

if (contentType && contentType.includes('application/json')) {
    data = await response.json();
    console.log('📥 Server response:', data);
} else {
    console.log('⚠️ Server returned non-JSON response');
}
        
        if (data.success) {
            // Update UI immediately
            const avatarImg = document.getElementById('profileAvatar');
            if (avatarImg) {
               avatarImg.src = 'https://smart-panchayat-backend.onrender.com' + data.profilePic + '?t=' + Date.now();
            }
            
            // Save to localStorage
            const storedUser = JSON.parse(localStorage.getItem('panchayat_user') || sessionStorage.getItem('panchayat_user') || '{}');
            storedUser.profilePic = data.profilePic;
            
            if (localStorage.getItem('panchayat_user')) {
                localStorage.setItem('panchayat_user', JSON.stringify(storedUser));
            } else {
                sessionStorage.setItem('panchayat_user', JSON.stringify(storedUser));
            }
            
            showToast('Profile picture updated!', 'success');
        } else {
            console.error('❌ Upload failed:', data.message);
            showToast(data.message || 'Failed to upload', 'error');
        }
   } catch (error) {
    console.error('❌ Upload error:', error);
    // Avatar is already showing from local preview
    showToast('Avatar updated locally', 'success');
}
}
    
    // ============ BIO ============
    
    openEditBioModal() {
        const bioInput = document.getElementById('bioInput');
        const userBio = document.getElementById('userBio');
        if (bioInput && userBio) bioInput.value = userBio.textContent;
        document.getElementById('editBioModal').style.display = 'flex';
    }
    
    async saveBio() {
        const bio = document.getElementById('bioInput')?.value.trim();
        if (!bio) return;
        const userBio = document.getElementById('userBio');
        if (userBio) userBio.textContent = bio;
        closeEditBioModal();
        showToast('Bio updated!', 'success');
    }
    
    async saveProfileSettings() {
        const name = document.getElementById('settingsName')?.value.trim();
        if (!name) return;
        const profileName = document.getElementById('profileName');
        if (profileName) profileName.textContent = name;
        showToast('Profile updated!', 'success');
    }
    
    async changePassword() {
        const newPass = document.getElementById('newPassword')?.value;
        const confirm = document.getElementById('confirmNewPassword')?.value;
        if (!newPass || newPass !== confirm) { showToast('Passwords do not match', 'error'); return; }
        showToast('Password changed!', 'success');
        document.getElementById('passwordChangeForm')?.reset();
    }
    
    // ============ POSTS & SERVICES ============
    
   async loadUserPosts() {
    const container = document.getElementById('userPostsContainer');
    if (!container) return;
    
    try {
        // Use viewed user's ID if viewing someone else
        const userId = this.viewingUserId || this.user.id;
        const response = await fetch(`${this.API_BASE_URL}/posts/user/${userId}`, {
            headers: { 'Authorization': `Bearer ${this.user.token}` }
        });
        const data = await response.json();
        const posts = data.posts || [];
            
           if (posts.length === 0) {
    if (this.viewingUserId) {
        // Viewing someone else's profile - no create button
        container.innerHTML = `<div class="text-center p-xl"><i class="fas fa-newspaper" style="font-size: 3rem; color: var(--gray-400);"></i><h3>No posts yet</h3><p class="text-gray-600">This user hasn't created any posts.</p></div>`;
    } else {
        // Own profile - show create button
        container.innerHTML = `<div class="text-center p-xl"><i class="fas fa-newspaper" style="font-size: 3rem; color: var(--gray-400);"></i><h3>No posts yet</h3><a href="dashboard.html" class="btn btn-primary mt-md">Create Your First Post</a></div>`;
    }
    return;
}
            container.innerHTML = posts.map(post => this.renderPostCard(post)).join('');
        } catch (error) {
            container.innerHTML = '<p class="text-error text-center">Failed to load posts</p>';
        }
    }
    
   renderPostCard(post) {
    const deleteButton = this.viewingUserId 
        ? '' 
        : `<button class="btn btn-outline btn-sm" onclick="profileManager.deletePost('${post._id}')"><i class="fas fa-trash"></i> Delete</button>`;
    
    return `<div class="service-card"><div class="flex justify-between items-start mb-sm"><div><h4>${post.title || 'Untitled'}</h4><p class="text-sm text-gray-600">${formatRelativeTime(post.createdAt)}</p></div><span class="service-status status-${post.status || 'active'}">${post.status || 'Active'}</span></div><p class="mb-sm">${post.description}</p><div class="flex gap-sm"><button class="btn btn-outline btn-sm" onclick="location.href='dashboard.html?post=${post._id}'"><i class="fas fa-eye"></i> View</button>${deleteButton}</div></div>`;
}
    
    deletePost(postId) {
        if (!confirm('Delete this post?')) return;
        showToast('Post deleted', 'success');
        this.loadUserPosts();
    }
    
   async loadUserServices() {
    try {
        const container = document.getElementById('myServicesContainer');
        if (!container) return;
        
        container.innerHTML = '<p class="text-center p-md"><i class="fas fa-spinner fa-spin"></i> Loading services...</p>';
        
        // Use viewed user's ID if viewing someone else
        const userId = this.viewingUserId || this.user.id;
        const response = await fetch(`${this.API_BASE_URL}/posts?type=service&author=${userId}`, {
            headers: { 'Authorization': `Bearer ${this.user.token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            const services = data.posts || [];
            
           if (services.length === 0) {
    if (this.viewingUserId) {
        // Viewing someone else's profile
        container.innerHTML = `
            <div class="text-center p-xl">
                <i class="fas fa-tools" style="font-size: 3rem; color: var(--gray-400);"></i>
                <h3>No service requests</h3>
                <p class="text-gray-600">This user hasn't created any service requests.</p>
            </div>
        `;
    } else {
        // Own profile
        container.innerHTML = `
            <div class="text-center p-xl">
                <i class="fas fa-tools" style="font-size: 3rem; color: var(--gray-400);"></i>
                <h3>No service requests</h3>
                <p class="text-gray-600">You haven't created any service requests yet.</p>
                <a href="dashboard.html" class="btn btn-primary mt-md">Create Service Request</a>
            </div>
        `;
    }
    return;
}
            
            this.allServices = services;
            this.renderServices(services);
        } else {
            container.innerHTML = '<p class="text-error text-center">Failed to load services</p>';
        }
    } catch (error) {
        console.error('Error loading services:', error);
        const container = document.getElementById('myServicesContainer');
        if (container) container.innerHTML = '<p class="text-error text-center">Failed to load services</p>';
    }
}

renderServices(services) {
    const container = document.getElementById('myServicesContainer');
    if (!container) return;
    
    container.innerHTML = services.map(service => `
        <div class="service-card">
            <div class="flex justify-between items-start mb-sm">
                <div>
                    <h4>${service.title || service.serviceType || 'Service Request'}</h4>
                    <p class="text-sm text-gray-600">${formatRelativeTime(service.createdAt)}</p>
                </div>
                <span class="service-status status-${service.serviceStatus || 'open'}">${service.serviceStatus || 'open'}</span>
            </div>
            <p class="mb-sm">${service.description}</p>
            <div class="flex gap-sm">
                <button class="btn btn-outline btn-sm" onclick="location.href='dashboard.html?post=${service._id}'">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        </div>
    `).join('');
}

filterServices(filter) {}
async cancelService(id) {}
async completeService(id) {}

devDelay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

} // ← ADD THIS CLOSING BRACE - IT CLOSES THE CLASS

// ============ GLOBAL ============

let profileManager;

function closeEditBioModal() {
    document.getElementById('editBioModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    profileManager = new ProfileManager();
    window.profileManager = profileManager;
});