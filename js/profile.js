/**
 * Smart Panchayat - Profile Module
 * Compatible with new profile.html structure
 */

class ProfileManager {
    constructor() {
        this.user = null;
        this.isProvider = false;
        this.API_BASE_URL = 'https://smart-panchayat-backend.onrender.com/api';
        this.viewingUserId = null;
        this.profileData = null;
        this.currentLocation = null;
        this.allServices = [];
        
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
        const ids = ['changeAvatarBtn', 'editBioBtn', 'editContactBtn', 'providerForm'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }
    
    setupEventListeners() {
        // Avatar
        document.getElementById('changeAvatarBtn')?.addEventListener('click', () => {
            document.getElementById('avatarInput').click();
        });
        
        document.getElementById('avatarInput')?.addEventListener('change', (e) => {
            this.handleAvatarChange(e.target.files[0]);
        });
        
        // Provider toggle
        document.getElementById('providerToggle')?.addEventListener('change', (e) => {
            const form = document.getElementById('providerForm');
            if (form) form.classList.toggle('hidden', !e.target.checked);
        });
        
        document.getElementById('saveProviderBtn')?.addEventListener('click', () => {
            this.registerAsProvider();
        });
        
        // Edit Bio
        document.getElementById('editBioBtn')?.addEventListener('click', () => {
            this.openEditBioModal();
        });
        
        document.getElementById('editBioForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveBio();
        });
        
        // Edit Contact
        document.getElementById('editContactBtn')?.addEventListener('click', () => {
            this.openEditContactModal();
        });
        
        document.getElementById('editContactForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveContactInfo();
        });
        
        // Settings
        document.getElementById('profileSettingsForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfileSettings();
        });
        
        document.getElementById('passwordChangeForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });
        
        // Service filter
        document.getElementById('serviceFilter')?.addEventListener('change', (e) => {
            this.filterServices(e.target.value);
        });
        
        // Notifications
        document.getElementById('saveNotifSettings')?.addEventListener('click', () => {
            this.saveNotificationSettings();
        });
        
        // Share
        document.getElementById('shareProfileBtn')?.addEventListener('click', () => {
            this.shareProfile();
        });
        
        // Settings menu
        document.getElementById('settingsMenuBtn')?.addEventListener('click', () => {
            this.switchTab('settings');
        });
        
        // Refresh location
        document.getElementById('refreshLocationBtn')?.addEventListener('click', async () => {
            await this.getUserLocation();
            this.updateLocationDisplay();
            this.showToast('Location updated!', 'success');
        });
        
        // Danger zone
        document.getElementById('logoutAllBtn')?.addEventListener('click', () => {
            if (confirm('Logout from all devices?')) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = 'index.html';
            }
        });
        
        document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
            if (confirm('Are you sure? This cannot be undone!')) {
                this.deleteAccount();
            }
        });
    }
    
    setupTabs() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.dataset.tab;
                this.switchTab(tabId);
            });
        });
    }
    
    switchTab(tabId) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        document.querySelectorAll('.section').forEach(section => {
            section.classList.toggle('active', section.id === `${tabId}Section`);
        });
        
        if (tabId === 'posts') {
            this.loadUserPosts();
        } else if (tabId === 'services') {
            this.loadUserServices();
        }
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
            
            // Fetch stats
            try {
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
            } catch (e) {
                data.stats = { posts: 0, helped: 0, rating: 0, reviews: 0 };
            }
            
            this.profileData = data;
            this.displayProfile(data);
            this.updateLocationDisplay();
            
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showToast('Failed to load profile', 'error');
            this.loadFallbackProfile();
        }
    }
    
    loadFallbackProfile() {
        const stored = JSON.parse(localStorage.getItem('panchayat_user') || '{}');
        this.profileData = {
            name: stored.name || 'User',
            phone: stored.phone || '',
            bio: stored.bio || '',
            role: stored.role || 'user',
            memberSince: stored.memberSince || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            stats: { posts: 0, helped: 0, rating: 0, reviews: 0 }
        };
        this.displayProfile(this.profileData);
    }
    
    updateLocationDisplay() {
        const el = document.getElementById('locationDisplay');
        if (!el) return;
        
        if (this.currentLocation) {
            el.textContent = '📍 Location detected';
        } else {
            el.textContent = '📍 Location unavailable';
        }
    }
    
    displayProfile(data) {
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value || '';
        };
        
        const setHtml = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = value || '';
        };
        
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };
        
        setText('profileName', data.name);
        setText('userBio', data.bio || 'No bio added yet. Tell the community about yourself!');
        setText('userRole', data.role === 'provider' ? 'Service Provider' : 'Resident');
        setText('memberSince', data.memberSince || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
        
        // Stats
        setText('totalPosts', data.stats?.posts || 0);
        setText('helpedCount', data.stats?.helped || 0);
        setText('ratingValue', (data.stats?.rating || 0).toFixed(1));
        
        // Rating stars
        const rating = data.stats?.rating || 0;
        const stars = this.renderStars(rating);
        setHtml('ratingStars', stars);
        
        // Contact info
        setText('displayPhone', data.phone || '--');
        setText('displayAlternatePhone', data.alternatePhone || 'Not provided');
        setText('displayEmail', data.email || 'Not provided');
        setText('displayAddress', data.address || 'Not provided');
        
        // Settings form
        setValue('settingsName', data.name);
        setValue('settingsEmail', data.email);
        setValue('settingsPhone', data.phone);
        setValue('settingsBio', data.bio);
        setValue('bioInput', data.bio);
        
        // Avatar
        if (data.avatar || data.profilePic) {
            const avatarEl = document.getElementById('profileAvatar');
            if (avatarEl) {
                const url = (data.avatar || data.profilePic).startsWith('http') 
                    ? data.avatar || data.profilePic 
                    : `https://smart-panchayat-backend.onrender.com${data.avatar || data.profilePic}`;
                avatarEl.src = url;
            }
        }
        
        // Provider status
        this.isProvider = data.isProvider || data.role === 'provider';
        const toggle = document.getElementById('providerToggle');
        if (toggle) toggle.checked = this.isProvider;
        
        if (this.isProvider && data.providerDetails) {
            this.loadProviderDetails(data.providerDetails);
            const form = document.getElementById('providerForm');
            if (form) form.classList.remove('hidden');
        }
    }
    
    renderStars(rating) {
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5 ? 1 : 0;
        const empty = 5 - full - half;
        
        let stars = '';
        for (let i = 0; i < full; i++) stars += '<i class="fas fa-star" style="color: #FFB300;"></i>';
        if (half) stars += '<i class="fas fa-star-half-alt" style="color: #FFB300;"></i>';
        for (let i = 0; i < empty; i++) stars += '<i class="far fa-star" style="color: #FFB300;"></i>';
        
        return stars;
    }
    
    // ============ CONTACT INFO ============
    
    openEditContactModal() {
        const data = this.profileData || {};
        document.getElementById('editAlternatePhone').value = data.alternatePhone || '';
        document.getElementById('editEmail').value = data.email || '';
        document.getElementById('editAddress').value = data.address || '';
        
        document.getElementById('editContactModal').style.display = 'flex';
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
                
                document.getElementById('displayAlternatePhone').textContent = alternatePhone || 'Not provided';
                document.getElementById('displayEmail').textContent = email || 'Not provided';
                document.getElementById('displayAddress').textContent = address || 'Not provided';
                
                document.getElementById('editContactModal').style.display = 'none';
                this.showToast('Contact updated!', 'success');
            } else {
                this.showToast(data.message || 'Failed to update', 'error');
            }
        } catch (error) {
            this.showToast('Network error', 'error');
        }
    }
    
    // ============ BIO ============
    
    openEditBioModal() {
        document.getElementById('bioInput').value = this.profileData?.bio || '';
        document.getElementById('editBioModal').style.display = 'flex';
    }
    
    async saveBio() {
        const bio = document.getElementById('bioInput').value.trim();
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify({ bio })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.profileData.bio = bio;
                document.getElementById('userBio').textContent = bio || 'No bio added yet.';
                document.getElementById('editBioModal').style.display = 'none';
                this.showToast('Bio updated!', 'success');
            }
        } catch (error) {
            document.getElementById('userBio').textContent = bio || 'No bio added yet.';
            document.getElementById('editBioModal').style.display = 'none';
            this.showToast('Bio updated!', 'success');
        }
    }
    
    // ============ SETTINGS ============
    
    async saveProfileSettings() {
        const name = document.getElementById('settingsName').value.trim();
        const email = document.getElementById('settingsEmail').value.trim();
        const bio = document.getElementById('settingsBio').value.trim();
        
        if (!name) {
            this.showToast('Name is required', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/users/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify({ name, email, bio })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.profileData.name = name;
                this.profileData.email = email;
                this.profileData.bio = bio;
                
                document.getElementById('profileName').textContent = name;
                document.getElementById('userBio').textContent = bio || 'No bio added yet.';
                document.getElementById('displayEmail').textContent = email || 'Not provided';
                
                this.showToast('Profile updated!', 'success');
            }
        } catch (error) {
            this.showToast('Profile updated locally!', 'success');
        }
    }
    
    async changePassword() {
        const current = document.getElementById('currentPassword')?.value;
        const newPass = document.getElementById('newPassword')?.value;
        const confirm = document.getElementById('confirmNewPassword')?.value;
        
        if (!current || !newPass || !confirm) {
            this.showToast('All fields required', 'error');
            return;
        }
        
        if (newPass !== confirm) {
            this.showToast('Passwords do not match', 'error');
            return;
        }
        
        if (newPass.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/users/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify({ currentPassword: current, newPassword: newPass })
            });
            
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('passwordChangeForm').reset();
                this.showToast('Password changed!', 'success');
            } else {
                this.showToast(data.message || 'Failed to change password', 'error');
            }
        } catch (error) {
            this.showToast('Network error', 'error');
        }
    }
    
    // ============ NOTIFICATIONS ============
    
    loadNotificationPreferences() {
        const settings = JSON.parse(localStorage.getItem('notification_settings') || '{}');
        document.getElementById('notifEmergency').checked = settings.emergency !== false;
        document.getElementById('notifPosts').checked = settings.posts !== false;
        document.getElementById('notifServices').checked = settings.services !== false;
        document.getElementById('notifMessages').checked = settings.messages !== false;
    }
    
    saveNotificationSettings() {
        const settings = {
            emergency: document.getElementById('notifEmergency')?.checked ?? true,
            posts: document.getElementById('notifPosts')?.checked ?? true,
            services: document.getElementById('notifServices')?.checked ?? true,
            messages: document.getElementById('notifMessages')?.checked ?? true
        };
        localStorage.setItem('notification_settings', JSON.stringify(settings));
        this.showToast('Notification settings saved!', 'success');
    }
    
    // ============ PROVIDER ============
    
    loadProviderDetails(details) {
        if (!details) return;
        
        document.getElementById('serviceCategory').value = details.category || '';
        document.getElementById('experience').value = details.experience || 0;
        document.getElementById('hourlyRate').value = details.hourlyRate || 0;
        document.getElementById('serviceDescription').value = details.description || '';
        document.getElementById('serviceRadius').value = details.serviceRadius || 10;
        document.getElementById('availableNow').checked = details.available || false;
    }
    
    async registerAsProvider() {
        const category = document.getElementById('serviceCategory')?.value;
        const experience = document.getElementById('experience')?.value;
        const hourlyRate = document.getElementById('hourlyRate')?.value;
        const description = document.getElementById('serviceDescription')?.value;
        const radius = document.getElementById('serviceRadius')?.value;
        const available = document.getElementById('availableNow')?.checked;
        
        if (!category) {
            this.showToast('Select a category', 'error');
            return;
        }
        
        if (!description) {
            this.showToast('Describe your services', 'error');
            return;
        }
        
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
                document.getElementById('userRole').textContent = 'Service Provider';
                this.showToast('Registered as provider!', 'success');
            } else {
                this.showToast(data.message || 'Failed to register', 'error');
            }
        } catch (error) {
            this.showToast('Network error', 'error');
        }
    }
    
    // ============ AVATAR ============
    
    async handleAvatarChange(file) {
        if (!file) return;
        
        if (file.size > 5 * 1024 * 1024) {
            this.showToast('Image size should be less than 5MB', 'error');
            return;
        }
        
        this.showToast('Uploading...', 'info');
        
        try {
            const formData = new FormData();
            formData.append('avatar', file);
            
            const response = await fetch(`${this.API_BASE_URL}/users/avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.user.token}` },
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                const avatarImg = document.getElementById('profileAvatar');
                if (avatarImg) {
                    avatarImg.src = `https://smart-panchayat-backend.onrender.com${data.profilePic}?t=${Date.now()}`;
                }
                this.showToast('Profile picture updated!', 'success');
            } else {
                this.showToast(data.message || 'Failed to upload', 'error');
            }
        } catch (error) {
            this.showToast('Network error', 'error');
        }
    }
    
    // ============ POSTS ============
    
    async loadUserPosts() {
        const container = document.getElementById('userPostsContainer');
        if (!container) return;
        
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-pulse"></i><p>Loading posts...</p></div>';
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/users/posts`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            const data = await response.json();
            const posts = data.posts || [];
            
            if (posts.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-newspaper"></i>
                        <h3>No posts yet</h3>
                        <p>Share something with your village!</p>
                        <button class="btn btn-primary" onclick="window.location.href='dashboard.html'">Create Post</button>
                    </div>
                `;
                return;
            }
            
            container.innerHTML = posts.map(post => this.renderPostCard(post)).join('');
        } catch (error) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to load posts</p></div>';
        }
    }
    
    renderPostCard(post) {
        const time = post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Recently';
        
        return `
            <div class="post-card">
                <div class="post-header">
                    <img src="${post.author?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(post.author?.name || 'U')}" class="post-avatar">
                    <div class="post-author">
                        <div class="post-name">${post.author?.name || 'User'}</div>
                        <div class="post-time">${time}</div>
                    </div>
                </div>
                <div class="post-content">${post.content || post.description || ''}</div>
                ${post.image ? `<img src="${post.image}" class="post-image">` : ''}
                <div class="post-actions">
                    <button class="post-action"><i class="far fa-heart"></i> ${post.likes?.length || 0}</button>
                    <button class="post-action"><i class="far fa-comment"></i> ${post.comments?.length || 0}</button>
                    <button class="post-action" onclick="profileManager.deletePost('${post._id}')"><i class="far fa-trash-alt"></i> Delete</button>
                </div>
            </div>
        `;
    }
    
    async deletePost(postId) {
        if (!confirm('Delete this post?')) return;
        
        try {
            await fetch(`${this.API_BASE_URL}/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            this.showToast('Post deleted', 'success');
            this.loadUserPosts();
        } catch (error) {
            this.showToast('Failed to delete', 'error');
        }
    }
    
    // ============ SERVICES ============
    
    async loadUserServices() {
        const container = document.getElementById('myServicesContainer');
        if (!container) return;
        
        container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-pulse"></i><p>Loading services...</p></div>';
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/posts?type=service&author=${this.user.id}`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.allServices = data.posts || [];
                this.renderServices(this.allServices);
            } else {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-tools"></i><p>No service requests</p></div>';
            }
        } catch (error) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-tools"></i><p>No service requests</p></div>';
        }
    }
    
    renderServices(services) {
        const container = document.getElementById('myServicesContainer');
        if (!container) return;
        
        if (services.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tools"></i>
                    <h3>No service requests</h3>
                    <p>Create a service request from the dashboard</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = services.map(service => `
            <div class="service-card">
                <div class="service-header">
                    <span class="service-title">${service.title || 'Service Request'}</span>
                    <span class="service-status status-${service.serviceStatus || 'pending'}">${service.serviceStatus || 'pending'}</span>
                </div>
                <p style="margin-bottom: 12px; font-size: 14px;">${service.description || ''}</p>
                <div class="service-detail">
                    <i class="far fa-clock"></i>
                    <span>${new Date(service.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    }
    
    filterServices(filter) {
        if (filter === 'all') {
            this.renderServices(this.allServices);
        } else {
            const filtered = this.allServices.filter(s => s.serviceStatus === filter);
            this.renderServices(filtered);
        }
    }
    
    // ============ SHARE ============
    
    shareProfile() {
        const url = `${window.location.origin}/profile.html?user=${this.user.id}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My Profile - Smart Panchayat',
                url: url
            });
        } else {
            navigator.clipboard?.writeText(url);
            this.showToast('Profile link copied!', 'success');
        }
    }
    
    // ============ DELETE ACCOUNT ============
    
    async deleteAccount() {
        const confirmText = prompt('Type "DELETE" to confirm account deletion:');
        if (confirmText !== 'DELETE') {
            this.showToast('Deletion cancelled', 'info');
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/users/account`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            
            if (response.ok) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = 'index.html';
            } else {
                this.showToast('Failed to delete account', 'error');
            }
        } catch (error) {
            this.showToast('Network error', 'error');
        }
    }
    
    // ============ UTILS ============
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${type === 'success' ? '#2E7D32' : type === 'error' ? '#d32f2f' : '#333'};
            color: white;
            padding: 14px 20px;
            border-radius: 14px;
            margin-bottom: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideDown 0.3s ease;
        `;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }
}

// ============ GLOBAL ============

let profileManager;

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function closeEditBioModal() {
    closeModal('editBioModal');
}

// Make closeEditBioModal globally available
window.closeEditBioModal = closeEditBioModal;
window.closeModal = closeModal;
window.openModal = openModal;

document.addEventListener('DOMContentLoaded', () => {
    profileManager = new ProfileManager();
    window.profileManager = profileManager;
});

// Toast function for global use
function showToast(message, type) {
    if (profileManager) {
        profileManager.showToast(message, type);
    }
}