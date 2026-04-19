/**
 * Smart Panchayat System - Dashboard Module
 * ULTRA ENHANCED: Notifications, Ratings, Comments, Profile View, Status
 */

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.currentLocation = null;
        this.posts = [];
        this.currentFilter = 'all';
        this.page = 1;
        this.hasMore = false;
        this.isLoading = false;
        this.selectedPostType = 'general';
        this.selectedImages = [];
        this.API_BASE_URL = 'https://smart-panchayat-backend.onrender.com/api';
        this.unreadCount = 0;
        
        this.init();
    }
    
    async init() {
        if (!requireAuth()) return;
        
        this.currentUser = getCurrentUser();
        await this.refreshUserData();
        
        console.log('Dashboard initialized for user:', this.currentUser.name, 'isProvider:', this.currentUser.isProvider);
        
        this.initUI();
        this.setupEventListeners();
        
        await this.getUserLocation();
        await this.loadFeed();
        await this.loadNearbyServices();
        await this.loadUserStats();
        await this.loadNotificationCount();
        
        // Poll notifications every 30 seconds
        setInterval(() => this.loadNotificationCount(), 30000);
    }
    
   async refreshUserData() {
    try {
        const response = await fetch(`${this.API_BASE_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
        });
        const data = await response.json();
        
        if (data.success && data.user) {
            this.currentUser.isProvider = data.user.isProvider || false;
            this.currentUser.role = data.user.role || 'user';
            this.currentUser.providerDetails = data.user.providerDetails || null;
            this.currentUser.isVerified = data.user.isVerified || false;
            
            // ✅ ADD THIS: Get profile picture from API
            if (data.user.profilePic || data.user.avatar) {
                this.currentUser.profilePic = data.user.profilePic || data.user.avatar;
            }
            
            const storedUser = JSON.parse(localStorage.getItem('panchayat_user') || sessionStorage.getItem('panchayat_user') || '{}');
            storedUser.isProvider = data.user.isProvider;
            storedUser.role = data.user.role;
            storedUser.providerDetails = data.user.providerDetails;
            storedUser.isVerified = data.user.isVerified;
            
            // ✅ ADD THIS: Save profilePic to storage too
            if (data.user.profilePic || data.user.avatar) {
                storedUser.profilePic = data.user.profilePic || data.user.avatar;
            }
            
            if (localStorage.getItem('panchayat_user')) {
                localStorage.setItem('panchayat_user', JSON.stringify(storedUser));
            } else {
                sessionStorage.setItem('panchayat_user', JSON.stringify(storedUser));
            }
        }
    } catch (error) {
        console.warn('Could not refresh user data:', error);
    }
}
    
    initUI() {
    document.getElementById('userNameDisplay').textContent = this.currentUser.name || 'User';
    
    // Force load profile picture from localStorage
    const storedUser = JSON.parse(localStorage.getItem('panchayat_user') || sessionStorage.getItem('panchayat_user') || '{}');
    
    if (storedUser.profilePic) {
        this.currentUser.profilePic = storedUser.profilePic;
    }
    
    // Only add backend URL if it's a relative path (not http, not data:)
    if (this.currentUser.profilePic && 
        !this.currentUser.profilePic.startsWith('http') && 
        !this.currentUser.profilePic.startsWith('data:')) {
        this.currentUser.profilePic = 'https://smart-panchayat-backend.onrender.com' + this.currentUser.profilePic;
    }
    
    // Add cache buster only for non-base64 images
    if (this.currentUser.profilePic && !this.currentUser.profilePic.startsWith('data:')) {
        this.currentUser.profilePic = this.currentUser.profilePic.split('?')[0] + '?t=' + Date.now();
    }
    
    console.log('Avatar URL:', this.currentUser.profilePic);
    
    const avatarHtml = createAvatar(this.currentUser, 'lg');
    document.getElementById('userAvatarLarge').innerHTML = avatarHtml;
    document.getElementById('userAvatarSmall').innerHTML = createAvatar(this.currentUser, 'sm');
    document.getElementById('createPostAvatar').innerHTML = createAvatar(this.currentUser, 'md');
}

    setupEventListeners() {
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchFilter(e.target.dataset.filter));
        });
        
        document.getElementById('loadMoreBtn')?.addEventListener('click', () => this.loadMore());
        document.getElementById('refreshFeedBtn')?.addEventListener('click', () => this.refreshFeed());
        
        document.getElementById('createPostForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createPost();
        });
        
        document.querySelectorAll('#postTypeSelector .service-category').forEach(cat => {
            cat.addEventListener('click', () => this.selectPostType(cat.dataset.type));
        });
        
        document.getElementById('postDescription')?.addEventListener('input', (e) => this.updateCharCount(e.target));
        document.getElementById('postImages')?.addEventListener('change', (e) => this.previewImages(e.target.files));
        document.getElementById('useCurrentLocationBtn')?.addEventListener('click', () => this.useCurrentLocation());
        
        document.getElementById('userMenuBtn')?.addEventListener('click', () => this.toggleUserDropdown());
        document.getElementById('logoutBtn')?.addEventListener('click', (e) => { e.preventDefault(); this.logout(); });
        document.getElementById('logoutSidebarBtn')?.addEventListener('click', (e) => { e.preventDefault(); this.logout(); });
        
        document.getElementById('notificationBell')?.addEventListener('click', () => this.showNotifications());
        
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.style.display = 'none';
            });
        });
        // Sidebar navigation
document.querySelectorAll('.sidebar-nav-link[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        
        if (page === 'issues') {
            this.switchFilter('issues');
        } else if (page === 'services') {
            this.switchFilter('services');
        } else if (page === 'feed') {
            this.switchFilter('all');
        }
    });
});
        
        // Close notification dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('notificationDropdown');
            const bell = document.getElementById('notificationBell');
            if (dropdown && bell && !bell.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }
    
   async getUserLocation() {
    try {
        this.currentLocation = await getUserLocation();
        
        // Get actual address from coordinates
        const address = await getAddressFromCoords(
            this.currentLocation.latitude, 
            this.currentLocation.longitude
        );
        
        document.getElementById('locationText').textContent = address || 'Location detected';
        document.getElementById('locationDisplay').textContent = address || 'Current location';
        
        console.log('Location acquired:', address);
    } catch (error) {
        console.warn('Location error, using default:', error);
        document.getElementById('locationText').textContent = 'Location unavailable';
        document.getElementById('locationDisplay').textContent = 'Using default location';
        this.currentLocation = { latitude: 28.6139, longitude: 77.2090 };
    }
}
    
    // ============ NOTIFICATIONS ============
    
    toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    if (!dropdown) return;
    
    if (dropdown.style.display === 'block') {
        dropdown.style.display = 'none';
    } else {
        this.showNotifications();
    }
}

async markAllRead() {
    try {
        await fetch(`${this.API_BASE_URL}/notifications/read-all`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
        });
        this.unreadCount = 0;
        const badge = document.getElementById('notificationBadge');
        if (badge) badge.style.display = 'none';
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) dropdown.style.display = 'none';
        showToast('All notifications marked as read', 'success');
    } catch (error) {
        console.error('Error marking all read:', error);
    }
}
    async loadNotificationCount() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/notifications/unread`, {
                headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.unreadCount = data.count || 0;
                const badge = document.getElementById('notificationBadge');
                if (badge) {
                    if (this.unreadCount > 0) {
                        badge.textContent = this.unreadCount > 9 ? '9+' : this.unreadCount;
                        badge.style.display = 'flex';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            }
        } catch (error) {
            console.error('Error loading notification count:', error);
        }
    }
    
    async showNotifications() {
        const dropdown = document.getElementById('notificationDropdown');
        if (!dropdown) return;
        
        if (dropdown.style.display === 'block') {
            dropdown.style.display = 'none';
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/notifications`, {
                headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.renderNotifications(data.notifications);
                dropdown.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    renderNotifications(notifications) {
        const container = document.getElementById('notificationList');
        if (!container) return;
        
        if (!notifications || notifications.length === 0) {
            container.innerHTML = '<p class="text-center p-md text-gray-500">No notifications</p>';
            return;
        }
        
        container.innerHTML = notifications.map(n => `
            <div class="notification-item ${n.read ? '' : 'unread'}" onclick="dashboardManager.handleNotificationClick('${n._id}', '${n.type}', '${n.data?.postId || ''}', '${n.data?.userId || ''}')">
                <div class="notification-icon">${this.getNotificationIcon(n.type)}</div>
                <div class="notification-content">
                    <div class="notification-title">${n.title}</div>
                    <div class="notification-message">${n.message}</div>
                    <div class="notification-time">${formatRelativeTime(n.createdAt)}</div>
                </div>
                ${!n.read ? '<span class="unread-dot"></span>' : ''}
            </div>
        `).join('');
    }
    
    getNotificationIcon(type) {
        const icons = {
            'offer_received': '📬',
            'offer_accepted': '🎉',
            'offer_rejected': '❌',
            'service_completed': '✅',
            'new_rating': '⭐',
            'badge_unlocked': '🏆',
            'comment_added': '💬',
            'emergency_alert': '🚨'
        };
        return icons[type] || '🔔';
    }
    
    async handleNotificationClick(notificationId, type, postId, userId) {
        // Mark as read
        try {
            await fetch(`${this.API_BASE_URL}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
            });
        } catch (error) {}
        
        document.getElementById('notificationDropdown').style.display = 'none';
        this.loadNotificationCount();
        
        // Navigate based on type
        if (postId) {
            this.scrollToPost(postId);
        } else if (userId) {
            window.location.href = `profile.html?user=${userId}`;
        } else if (type === 'badge_unlocked') {
            window.location.href = 'profile.html#badges';
        }
    }
    
    scrollToPost(postId) {
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            postElement.style.boxShadow = '0 0 0 4px var(--primary-green)';
            setTimeout(() => postElement.style.boxShadow = '', 2000);
        }
    }
    
   async loadFeed(append = false) {
    if (this.isLoading) return;
    this.isLoading = true;
    
    if (!append) this.showSkeletonLoaders();
    
    try {
        // Build URL based on filter
        let url;
        if (this.currentFilter === 'issues') {
            url = `${this.API_BASE_URL}/posts?type=issue&author=${this.currentUser.id}&page=${this.page}`;
        } else if (this.currentFilter === 'services') {
            url = `${this.API_BASE_URL}/posts?type=service&author=${this.currentUser.id}&page=${this.page}`;
        } else if (this.currentFilter === 'nearby') {
            url = `${this.API_BASE_URL}/posts?filter=nearby&lat=${this.currentLocation?.latitude}&lng=${this.currentLocation?.longitude}&page=${this.page}`;
        } else if (this.currentFilter === 'emergency') {
            url = `${this.API_BASE_URL}/posts?filter=emergency&page=${this.page}`;
        } else {
            url = `${this.API_BASE_URL}/posts?filter=${this.currentFilter}&page=${this.page}`;
        }
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const posts = data.posts || [];
            
            if (append) {
                this.posts = [...this.posts, ...posts];
            } else {
                this.posts = posts;
            }
            
            this.hasMore = data.hasMore || false;
            this.renderFeed();
        } else {
            this.showEmptyFeed();
        }
    } catch (error) {
        console.error('Network error loading feed:', error);
        this.showEmptyFeed();
    } finally {
        this.isLoading = false;
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) loadMoreBtn.disabled = !this.hasMore;
    }
}
    
    showSkeletonLoaders() {
        document.getElementById('feedContainer').innerHTML = `
            <div class="post-skeleton">
                <div class="flex items-center gap-md mb-md">
                    <div class="skeleton skeleton-avatar"></div>
                    <div style="flex: 1;">
                        <div class="skeleton skeleton-text" style="width: 150px;"></div>
                        <div class="skeleton skeleton-text" style="width: 100px;"></div>
                    </div>
                </div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text"></div>
            </div>
        `;
    }
    
    showEmptyFeed() {
        document.getElementById('feedContainer').innerHTML = `
            <div class="text-center p-xl">
                <i class="fas fa-newspaper" style="font-size: 3rem; color: var(--gray-400);"></i>
                <h3>No posts yet</h3>
                <p class="text-gray-600">Be the first to share something with your village!</p>
                <button class="btn btn-primary mt-md" onclick="openCreatePostModal()">
                    <i class="fas fa-plus"></i> Create Post
                </button>
            </div>
        `;
    }
    
    renderFeed() {
        const container = document.getElementById('feedContainer');
        if (!this.posts || this.posts.length === 0) {
            this.showEmptyFeed();
            return;
        }
        container.innerHTML = this.posts.map(post => this.renderPostCard(post)).join('');
    }
    
    renderPostCard(post) {
        const getAuthorName = () => {
            if (post.isAnonymous) return 'Anonymous User';
            if (post.author?.name) return post.author.name;
            return 'Community Member';
        };
        
        const getAuthorAvatar = () => {
            if (post.isAnonymous) {
                return `<div class="avatar" style="background: var(--gray-500);"><i class="fas fa-user-secret"></i></div>`;
            }
            if (post.author) return createAvatar(post.author, 'md');
            return `<div class="avatar" style="background: var(--primary-green);"><i class="fas fa-user"></i></div>`;
        };
        
        const getTitle = () => {
            if (post.title) return post.title;
            if (post.type === 'issue') return 'Issue Report';
            if (post.type === 'service') return 'Service Request';
            if (post.type === 'emergency') return '🚨 Emergency Alert';
            return 'Community Post';
        };
        
        const getDescription = () => post.description || 'No description provided';
        
        const getPriorityBadge = () => {
            const priority = post.priority || 'medium';
            const badges = {
                'high': '<span class="badge badge-error"><i class="fas fa-exclamation-circle"></i> High</span>',
                'medium': '<span class="badge badge-warning"><i class="fas fa-flag"></i> Medium</span>',
                'low': '<span class="badge badge-info"><i class="fas fa-clock"></i> Low</span>'
            };
            return badges[priority] || '';
        };
        
        const getTypeBadge = () => {
            const type = post.type || 'general';
            const badges = {
                'issue': '<span class="badge badge-warning"><i class="fas fa-exclamation-triangle"></i> Issue</span>',
                'service': '<span class="badge badge-info"><i class="fas fa-tools"></i> Service</span>',
                'emergency': '<span class="badge badge-error"><i class="fas fa-ambulance"></i> Emergency</span>',
                'general': '<span class="badge badge-success"><i class="fas fa-newspaper"></i> General</span>'
            };
            return badges[type] || '<span class="badge badge-success">Post</span>';
        };
        
        const getStatusBadge = () => {
            if (post.type === 'issue') {
                const status = post.issueStatus || 'reported';
                const badges = {
                    'reported': '<span class="badge badge-warning">📋 Reported</span>',
                    'in_progress': '<span class="badge badge-info">🔧 In Progress</span>',
                    'resolved': '<span class="badge badge-success">✅ Resolved</span>'
                };
                return badges[status] || '';
            }
            if (post.type === 'service') {
                const status = post.serviceStatus || 'open';
                const badges = {
                    'open': '<span class="badge badge-warning">📬 Open</span>',
                    'assigned': '<span class="badge badge-info">👤 Assigned</span>',
                    'completed': '<span class="badge badge-success">✅ Completed</span>'
                };
                return badges[status] || '';
            }
            return '';
        };
        
        const getCategoryDisplay = () => {
            const category = post.issueCategory || 'other';
            const categories = {
                'water': '💧 Water', 'electricity': '⚡ Electricity', 'road': '🛣️ Road',
                'sanitation': '🚮 Sanitation', 'fire': '🔥 Fire', 'medical': '🏥 Medical', 'other': '📌 Other'
            };
            return categories[category] || category;
        };
        
        const getTimeDisplay = () => post.createdAt ? formatRelativeTime(post.createdAt) : 'Recently';
        const getLikeCount = () => Array.isArray(post.likes) ? post.likes.length : 0;
        const getCommentCount = () => Array.isArray(post.comments) ? post.comments.length : 0;
        
        const isAuthor = post.author?._id === this.currentUser.id || post.author === this.currentUser.id;
        const authorId = post.author?._id || post.author;
        
        // Calculate distance
        let distanceText = '';
        if (this.currentLocation && post.location?.coordinates) {
            const dist = calculateDistance(
                this.currentLocation.latitude, this.currentLocation.longitude,
                post.location.coordinates[1], post.location.coordinates[0]
            );
            if (dist < 1) {
                distanceText = `${Math.round(dist * 1000)}m away`;
            } else {
                distanceText = `${dist.toFixed(1)}km away`;
            }
        }
        
        return `
            <div class="post-card" data-post-id="${post._id}">
                ${post.type === 'emergency' ? `
                    <div class="emergency-banner">
                        <div class="emergency-banner-content">
                            <i class="fas fa-exclamation-triangle"></i>
                            <span>🚨 EMERGENCY ALERT - RESPOND IMMEDIATELY</span>
                        </div>
                    </div>
                ` : ''}
                
                <div class="post-header">
                    <div onclick="dashboardManager.viewProfile('${authorId}')" style="cursor: pointer;">
                        ${getAuthorAvatar()}
                    </div>
                    <div class="post-author-info">
                        <div class="post-author-name">
                            <span onclick="dashboardManager.viewProfile('${authorId}')" style="cursor: pointer; hover:underline;">
                                ${getAuthorName()}
                            </span>
                            ${!post.isAnonymous && post.author?.isVerified ? '<i class="fas fa-check-circle" style="color: var(--primary-green);"></i>' : ''}
                            ${getTypeBadge()}
                            ${post.type === 'issue' ? getPriorityBadge() : ''}
                            ${getStatusBadge()}
                        </div>
                        <div class="post-time">
                            <i class="far fa-clock"></i> ${getTimeDisplay()}
                            ${distanceText ? ` • <i class="fas fa-map-marker-alt"></i> ${distanceText}` : ''}
                        </div>
                    </div>
                   <button class="btn btn-icon" onclick="dashboardManager.showPostOptions('${post._id}', event)">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
                
                <div class="post-content">
                  ${post.isPinned ? '<span class="badge badge-warning">📌 Pinned</span>' : ''}
<h3 class="post-title">${getTitle()}</h3>
                    
                    ${post.type === 'issue' && post.issueCategory ? `
                        <div class="flex gap-sm mb-sm">
                            <span class="badge" style="background: var(--gray-200); color: var(--gray-700);">
                                <i class="fas fa-tag"></i> ${getCategoryDisplay()}
                            </span>
                        </div>
                    ` : ''}
                    
                    <p class="post-description">${getDescription()}</p>
                    
                    ${post.images && post.images.length > 0 ? `
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px;">
                            ${post.images.map(img => `
                                <img src="${img}" alt="Post image" onclick="dashboardManager.viewImage('${img}')"
                                     style="width: 100%; border-radius: 8px; cursor: pointer; max-height: 200px; object-fit: cover;">
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${post.type === 'service' && post.budget ? `
                        <div style="margin-top: 12px;">
                            <span class="badge badge-success">
                                <i class="fas fa-rupee-sign"></i> Budget: ₹${post.budget}
                            </span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="post-actions">
                    <button class="post-action-btn ${post.userLiked ? 'active' : ''}" onclick="dashboardManager.toggleLike('${post._id}')">
    <i class="${post.userLiked ? 'fas' : 'far'} fa-heart"></i>
    <span onclick="event.stopPropagation(); dashboardManager.showLikedUsers('${post._id}')" 
          style="cursor: pointer; text-decoration: underline dotted; margin-left: 4px;">
        ${getLikeCount()}
    </span>
</button>
                    
                    <button class="post-action-btn" onclick="dashboardManager.showComments('${post._id}')">
                        <i class="far fa-comment"></i>
                        <span>${getCommentCount()}</span>
                    </button>
                    
                    <button class="post-action-btn ${post.userSaved ? 'active' : ''}" onclick="dashboardManager.toggleSave('${post._id}')">
                        <i class="${post.userSaved ? 'fas' : 'far'} fa-bookmark"></i>
                    </button>
                    
                    <button class="post-action-btn" onclick="dashboardManager.sharePost('${post._id}')">
                        <i class="far fa-share-square"></i>
                    </button>
                </div>
                
                <!-- VIEW OFFERS BUTTON FOR POST AUTHOR -->
                ${post.type === 'service' && isAuthor ? `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--gray-200);">
                        <button class="btn btn-outline btn-block" onclick="dashboardManager.viewOffers('${post._id}')">
                            <i class="fas fa-gavel"></i> View Offers
                        </button>
                    </div>
                ` : ''}
                
                <!-- MARK COMPLETE FOR ACCEPTED SERVICE -->
                ${post.type === 'service' && isAuthor && post.serviceStatus === 'assigned' ? `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--gray-200);">
                        <button class="btn btn-success btn-block" onclick="dashboardManager.completeService('${post._id}')">
                            <i class="fas fa-check-double"></i> Mark as Completed
                        </button>
                    </div>
                ` : ''}
                
               <!-- OFFER HELP SECTION FOR SERVICE POSTS (NON-AUTHOR) -->
${post.type === 'service' && post.author?._id !== this.currentUser.id ? `
    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--gray-200);">
        <div style="display: flex; gap: 10px;">
            <button class="btn btn-primary" onclick="dashboardManager.offerHelp('${post._id}')" style="flex: 1;">
                <i class="fas fa-hand-holding-heart"></i> Offer Help
            </button>
            <button class="btn btn-outline" onclick="dashboardManager.contactAuthor('${post._id}')">
                <i class="fas fa-comment"></i> Contact
            </button>
        </div>
    </div>
` : ''}
                
                <!-- RESPOND SECTION FOR EMERGENCY POSTS -->
                ${post.type === 'emergency' && post.emergencyStatus === 'active' ? `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--error);">
                        <button class="btn btn-danger" onclick="dashboardManager.respondToEmergency('${post._id}')" style="width: 100%;">
                            <i class="fas fa-ambulance"></i> I Can Help - Respond Now
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // ============ PROFILE VIEW ============
    
    viewProfile(userId) {
        if (!userId || userId === 'undefined') return;
        window.location.href = `profile.html?user=${userId}`;
    }
    
    // ============ COMMENTS ============
    
    async showComments(postId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/posts/${postId}/comments`, {
                headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.showCommentsModal(postId, data.comments || []);
            }
        } catch (error) {
            showToast('Failed to load comments', 'error');
        }
    }
    
    showCommentsModal(postId, comments) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-comments"></i> Comments (${comments.length})</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div style="max-height: 300px; overflow-y: auto; padding: 15px;">
                    ${comments.length === 0 ? '<p class="text-center text-gray-500">No comments yet</p>' : 
                        comments.map(c => `
                            <div style="display: flex; gap: 12px; margin-bottom: 15px;">
                                ${createAvatar(c.user, 'sm')}
                                <div style="flex: 1;">
                                    <div class="font-medium">${c.user?.name || 'User'}</div>
                                    <p class="text-sm">${c.text}</p>
                                    <div class="text-xs text-gray-500">${formatRelativeTime(c.createdAt)}</div>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
                <div style="padding: 15px; border-top: 1px solid var(--gray-200);">
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="commentInput" class="form-input" placeholder="Write a comment..." style="flex: 1;">
                        <button class="btn btn-primary" onclick="dashboardManager.addComment('${postId}')">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    }
    
    async addComment(postId) {
        const input = document.getElementById('commentInput');
        const text = input.value.trim();
        if (!text) return;
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.currentUser.token}`
                },
                body: JSON.stringify({ text })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Comment added!', 'success');
                document.querySelector('.modal-overlay')?.remove();
                this.refreshFeed();
            } else {
                showToast(data.message || 'Failed to add comment', 'error');
            }
        } catch (error) {
            showToast('Network error', 'error');
        }
    }
    
    // ============ SERVICE COMPLETION & RATING ============
    
    async completeService(postId) {
        const post = this.posts.find(p => p._id === postId);
        if (!post) return;
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/services/${postId}/complete`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Service marked as completed!', 'success');
                this.showRatingModal(postId, post.assignedProvider);
                this.refreshFeed();
            } else {
                showToast(data.message || 'Failed to complete service', 'error');
            }
        } catch (error) {
            showToast('Network error', 'error');
        }
    }
    
    showRatingModal(postId, providerId) {
        if (!providerId) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3 class="modal-title">⭐ Rate Your Experience</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <div class="rating-stars" style="font-size: 2rem; margin-bottom: 20px;">
                        ${[1,2,3,4,5].map(r => `
                            <i class="far fa-star rating-star" data-rating="${r}" style="cursor: pointer; margin: 0 5px;"></i>
                        `).join('')}
                    </div>
                    <textarea id="ratingReview" class="form-input" placeholder="Write a review (optional)" rows="3"></textarea>
                    <button class="btn btn-primary btn-block mt-md" onclick="dashboardManager.submitRating('${postId}', '${providerId}')">
                        Submit Rating
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);

// ✅ ADD THIS: Make stars clickable and save selection
this.selectedRating = 5; // Default 5 stars

overlay.querySelectorAll('.rating-star').forEach((star, i) => {
    star.addEventListener('click', () => {
        this.selectedRating = i + 1;
        overlay.querySelectorAll('.rating-star').forEach((s, j) => {
            s.className = j < this.selectedRating ? 'fas fa-star' : 'far fa-star';
            s.style.color = '#FFB300';
        });
    });
    
    star.addEventListener('mouseenter', () => {
        overlay.querySelectorAll('.rating-star').forEach((s, j) => {
            s.className = j <= i ? 'fas fa-star' : 'far fa-star';
            s.style.color = '#FFB300';
        });
    });
});

// Set default 5 stars visually
overlay.querySelectorAll('.rating-star').forEach((s, j) => {
    s.className = j < 5 ? 'fas fa-star' : 'far fa-star';
    s.style.color = '#FFB300';
});

overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
    
    async submitRating(postId, providerId) {
    const rating = this.selectedRating || 5;
    const review = document.getElementById('ratingReview')?.value || '';
    
    try {
        // Find the accepted bid for this service
        const response = await fetch(`${this.API_BASE_URL}/bids/post/${postId}`, {
            headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
        });
        const data = await response.json();
        
        if (!data.success) {
            showToast('Could not find service record', 'error');
            document.querySelector('.modal-overlay')?.remove();
            return;
        }
        
        const bid = data.bids.find(b => 
            b.providerId._id === providerId && b.status === 'accepted'
        );
        
        if (!bid) {
            showToast('Could not find accepted offer', 'error');
            document.querySelector('.modal-overlay')?.remove();
            return;
        }
        
        const rateResponse = await fetch(`${this.API_BASE_URL}/bids/${bid._id}/rate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.currentUser.token}`
            },
            body: JSON.stringify({ rating, review })
        });
        
        const rateData = await rateResponse.json();
        
        if (rateData.success) {
            showToast('⭐ Rating submitted! Thank you!', 'success');
            document.querySelector('.modal-overlay')?.remove();
            this.loadUserStats();
        } else {
            showToast(rateData.message || 'Failed to submit rating', 'error');
        }
    } catch (error) {
        console.error('Submit rating error:', error);
        showToast('Network error', 'error');
    }
}
    
    // ============ OFFER HELP FEATURES ============
    
    offerHelp(postId) {
        const post = this.posts.find(p => p._id === postId);
        if (!post) return;
        
        if (!this.currentUser.isProvider) {
            const becomeProvider = confirm('You are not registered as a service provider. Would you like to register now?');
            if (becomeProvider) window.location.href = 'profile.html';
            return;
        }
        
        this.showOfferModal(postId, post);
    }
    
    showOfferModal(postId, post) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="modal" style="max-width: 450px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-hand-holding-heart" style="color: var(--primary-green);"></i> Offer Your Services</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div style="margin-bottom: 20px;">
                    <p><strong>Request:</strong> ${post.description}</p>
                    ${post.budget ? `<p><strong>Budget:</strong> ₹${post.budget}</p>` : ''}
                </div>
                <form id="offerForm">
                    <div class="form-group">
                        <label class="form-label">Your Offer Price (₹)</label>
                        <input type="number" class="form-input" id="offerAmount" value="${post.budget || ''}" min="0" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Message (Optional)</label>
                        <textarea class="form-input" id="offerMessage" rows="3" placeholder="Introduce yourself..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Available</label>
                        <select class="form-input" id="offerTimeline">
                            <option value="immediate">Immediate (within hours)</option>
                            <option value="today">Today</option>
                            <option value="tomorrow">Tomorrow</option>
                            <option value="this_week">This Week</option>
                        </select>
                    </div>
                    <div class="flex gap-md" style="margin-top: 20px;">
                        <button type="button" class="btn btn-outline flex-1" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                        <button type="submit" class="btn btn-primary flex-1"><i class="fas fa-paper-plane"></i> Send Offer</button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        document.getElementById('offerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitOffer(postId, post, overlay);
        });
        
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    }
    
    async submitOffer(postId, post, overlay) {
        const amount = document.getElementById('offerAmount').value;
        const message = document.getElementById('offerMessage').value.trim();
        const timeline = document.getElementById('offerTimeline').value;
        
        if (!amount || amount <= 0) { showToast('Please enter a valid amount', 'error'); return; }
        
        const submitBtn = overlay.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/bids`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.currentUser.token}` },
                body: JSON.stringify({ postId, amount: parseFloat(amount), message, timeline })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Offer sent to post creator!', 'success');
                overlay.remove();
            } else {
                showToast(data.message || 'Failed to send offer', 'error');
            }
        } catch (error) {
            showToast('Network error', 'error');
        } finally {
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Offer';
            submitBtn.disabled = false;
        }
    }
    
    async viewOffers(postId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/bids/post/${postId}`, {
                headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
            });
            const data = await response.json();
            if (data.success) this.showOffersModal(postId, data.bids);
        } catch (error) { showToast('Network error', 'error'); }
    }
    
    showOffersModal(postId, bids) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '10000';
        
        overlay.innerHTML = `
            <div class="modal" style="max-width: 550px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-gavel"></i> Offers Received (${bids.length})</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                ${bids.length === 0 ? '<p class="text-center p-lg">No offers yet</p>' : `
                    <div style="max-height: 450px; overflow-y: auto;">
                        ${bids.map(bid => `
                            <div style="padding: 16px; border-bottom: 1px solid var(--gray-200);">
                                <div style="display: flex; gap: 12px; margin-bottom: 10px;">
                                    ${createAvatar(bid.providerId, 'md')}
                                    <div style="flex: 1;">
                                        <div class="font-medium">${bid.providerId?.name}</div>
                                        <div class="text-sm">${bid.providerId?.phone}</div>
                                    </div>
                                    <div class="text-xl font-bold" style="color: var(--primary-green);">₹${bid.amount}</div>
                                </div>
                                ${bid.message ? `<p class="text-sm mb-sm">"${bid.message}"</p>` : ''}
                                <div class="flex gap-sm">
                                    <span class="badge badge-info">${bid.timeline}</span>
                                    <span class="badge badge-${bid.status === 'pending' ? 'warning' : 'success'}">${bid.status}</span>
                                </div>
                                ${bid.status === 'pending' ? `
                                    <button class="btn btn-primary btn-sm btn-block mt-sm" onclick="dashboardManager.acceptOffer('${postId}', '${bid._id}')">
                                        Accept Offer
                                    </button>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    }
    
   async acceptOffer(postId, bidId) {
    try {
        const response = await fetch(`${this.API_BASE_URL}/bids/${bidId}/accept`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            showToast('Offer accepted!', 'success');
            
            // ✅ UPDATE THE LOCAL POST with assigned provider
            const post = this.posts.find(p => p._id === postId);
            if (post && data.bid) {
                post.assignedProvider = data.bid.providerId;
                post.serviceStatus = 'assigned';
            }
            
            document.querySelector('.modal-overlay')?.remove();
            this.refreshFeed();
        }
    } catch (error) { 
        showToast('Network error', 'error'); 
    }
}
    
    contactAuthor(postId) {
        const post = this.posts.find(p => p._id === postId);
        if (!post?.author) return;
        window.location.href = `chat.html?user=${post.author._id || post.author}`;
    }
    
    async respondToEmergency(postId) {
        if (!confirm('Respond to this emergency?')) return;
        showToast('Thank you for responding!', 'success');
    }
    
    // ============ EXISTING METHODS ============
    
    async loadMore() { if (this.hasMore && !this.isLoading) { this.page++; await this.loadFeed(true); } }
    async refreshFeed() { this.page = 1; await this.loadFeed(false); showToast('Feed refreshed!', 'success'); }
    
   switchFilter(filter) {
    this.currentFilter = filter;
    
    // Update filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.filter === filter);
    });
    
    // Update sidebar active state
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        const page = link.dataset.page;
        link.classList.toggle('active', page === filter);
    });
    
    // Update title
    const titles = {
        all: 'Community Feed',
        issues: 'My Issues',
        services: 'My Services',
        nearby: 'Nearby Posts',
        emergency: 'Emergency Alerts'
    };
    document.getElementById('feedTitle').textContent = titles[filter] || 'Community Feed';
    
    this.page = 1;
    this.loadFeed(false);
}
    
    async createPost() {
        const description = document.getElementById('postDescription')?.value.trim();
        if (!description) { showToast('Please enter a description', 'error'); return; }
        
        const submitBtn = document.getElementById('submitPostBtn');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
        submitBtn.disabled = true;
        
        try {
            const postData = {
                type: this.selectedPostType, description,
                title: document.getElementById('postTitle')?.value.trim() || undefined,
                lat: this.currentLocation?.latitude || 28.6139,
                lng: this.currentLocation?.longitude || 77.2090,
                address: 'User Location',
                isAnonymous: document.getElementById('postAnonymous')?.checked || false
            };
            
            if (this.selectedPostType === 'issue') {
                postData.issueCategory = document.getElementById('issueCategory')?.value || 'other';
                postData.priority = document.getElementById('issuePriority')?.value || 'medium';
            } else if (this.selectedPostType === 'service') {
                postData.serviceType = document.getElementById('serviceType')?.value || 'other';
                postData.budget = document.getElementById('serviceBudget')?.value || null;
            }
            
            const response = await fetch(`${this.API_BASE_URL}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.currentUser.token}` },
                body: JSON.stringify(postData)
            });
            
            const data = await response.json();
            if (data.success) {
                showToast('Post created!', 'success');
                closeCreatePostModal();
                this.posts.unshift(data.post);
                this.renderFeed();
                await this.loadUserStats();
            } else { showToast(data.message || 'Failed', 'error'); }
        } catch (error) { showToast('Network error', 'error'); }
        finally { submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Post'; submitBtn.disabled = false; }
    }
    
    selectPostType(type) {
        this.selectedPostType = type;
        document.querySelectorAll('#postTypeSelector .service-category').forEach(cat => cat.classList.toggle('active', cat.dataset.type === type));
        document.getElementById('issueFields').style.display = type === 'issue' ? 'block' : 'none';
        document.getElementById('serviceFields').style.display = type === 'service' ? 'block' : 'none';
        document.getElementById('postModalTitle').textContent = { general: 'Create Post', issue: 'Report Issue', service: 'Request Service' }[type] || 'Create Post';
    }
    
    updateCharCount(t) { document.getElementById('charCount').textContent = `${t.value.length}/500`; }
    
    previewImages(files) {
        const c = document.getElementById('imagePreviewContainer'); if (!c) return; c.innerHTML = '';
        for (const f of files) { const r = new FileReader(); r.onload = e => { const p = document.createElement('div'); p.className = 'image-preview-item'; p.innerHTML = `<img src="${e.target.result}"><button class="image-preview-remove" onclick="this.parentElement.remove()">×</button>`; c.appendChild(p); }; r.readAsDataURL(f); }
    }
    
    useCurrentLocation() { document.getElementById('useCurrentLocationBtn')?.classList.add('active'); }
    
    async toggleLike(postId) {
    const post = this.posts.find(p => p._id === postId);
    if (!post) return;
    
    const wasLiked = post.userLiked;
    post.userLiked = !wasLiked;
    if (!post.likes) post.likes = [];
    
    // Add/remove current user from likes array for display
    if (!wasLiked) {
        post.likes.push(this.currentUser.id);
    } else {
        post.likes = post.likes.filter(id => id !== this.currentUser.id);
    }
    
    this.renderFeed();
    
    try {
        const response = await fetch(`${this.API_BASE_URL}/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
        });
        const data = await response.json();
        
        // Update with real likes from server
        if (data.success) {
            post.likes = data.likes || [];
        }
    } catch (error) {
        post.userLiked = wasLiked;
        this.renderFeed();
    }
}
async showLikedUsers(postId) {
    try {
        const response = await fetch(`${this.API_BASE_URL}/posts/${postId}/likes`, {
            headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
        });
        const data = await response.json();
        
        if (data.success) {
            this.showLikedUsersModal(data.users || []);
        }
    } catch (error) {
        showToast('Failed to load likes', 'error');
    }
}

showLikedUsersModal(users) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.style.zIndex = '10000';
    
    overlay.innerHTML = `
        <div class="modal" style="max-width: 400px;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-heart" style="color: var(--error);"></i> Liked by</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
                ${users.length === 0 ? '<p class="text-center p-md text-gray-500">No likes yet</p>' : 
                    users.map(user => `
                        <div class="flex items-center gap-md p-md hover:bg-gray-100 cursor-pointer" onclick="dashboardManager.viewProfile('${user._id}')">
                            ${createAvatar(user, 'md')}
                            <div style="flex: 1;">
                                <div class="font-medium">${user.name}</div>
                            </div>
                            ${user.isVerified ? '<i class="fas fa-check-circle" style="color: var(--primary-green);"></i>' : ''}
                        </div>
                    `).join('')
                }
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}
    
    async toggleSave(postId) {
        const post = this.posts.find(p => p._id === postId); if (!post) return;
        post.userSaved = !post.userSaved; this.renderFeed();
        showToast(post.userSaved ? 'Saved!' : 'Removed', 'success');
    }
    
  showPostOptions(postId, event) {
    const post = this.posts.find(p => p._id === postId);
    if (!post) return;
    
    const isAuthor = post.author?._id === this.currentUser.id || post.author === this.currentUser.id;
    
    const overlay = document.createElement('div');
    overlay.className = 'post-options-overlay';
   overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
});
    
    const menu = document.createElement('div');
    menu.className = 'post-options-menu';
    
    let optionsHtml = '';

// ✅ DELETE (author OR admin)
if (isAuthor || this.currentUser.role === 'admin') {
    optionsHtml += `
        <div class="post-option-item danger" onclick="dashboardManager.deletePost('${postId}')">
            <i class="fas fa-trash"></i> Delete Post
        </div>
    `;
}

// 👑 ADMIN ONLY → PIN
if (this.currentUser.role === 'admin') {
    optionsHtml += `
        <div class="post-option-item" onclick="dashboardManager.togglePin('${postId}')">
            <i class="fas fa-thumbtack"></i> Pin / Unpin Post
        </div>
    `;
}

// 👤 Normal users (not owner)
if (!isAuthor) {
    optionsHtml += `
        <div class="post-option-item" onclick="dashboardManager.reportPost('${postId}')">
            <i class="fas fa-flag"></i> Report Post
        </div>
        <div class="post-option-item" onclick="dashboardManager.hidePost('${postId}')">
            <i class="fas fa-eye-slash"></i> Hide Post
        </div>
    `;
}

optionsHtml += `
    <div class="post-option-item" onclick="dashboardManager.copyPostLink('${postId}')">
        <i class="fas fa-link"></i> Copy Link
    </div>
`;
    
    menu.innerHTML = optionsHtml;
    overlay.appendChild(menu);
    document.body.appendChild(overlay);
    
    const btn = event.target.closest('.btn-icon');
    if (btn) {
        const rect = btn.getBoundingClientRect();
        menu.style.top = rect.bottom + 5 + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
    }
}
    
    viewImage(src) {
        const lb = document.createElement('div'); lb.className = 'modal-overlay'; lb.style.display = 'flex'; lb.style.zIndex = '9999';
        lb.innerHTML = `<div style="max-width:90vw"><img src="${src}" style="max-width:100%;max-height:90vh;border-radius:12px"><button onclick="this.closest('.modal-overlay').remove()" style="position:absolute;top:20px;right:20px;background:rgba(0,0,0,0.5);color:white;border:none;padding:12px 16px;border-radius:50px">×</button></div>`;
        lb.addEventListener('click', e => { if (e.target === lb) lb.remove(); }); document.body.appendChild(lb);
    }
    
    sharePost(id) { navigator.clipboard?.writeText(`${location.origin}/post/${id}`); showToast('Link copied!', 'success'); }
    editPost(postId) {
    showToast('Edit post coming soon!', 'info');
    document.querySelector('.post-options-overlay')?.remove();
}

deletePost(postId) {
    
    if (!confirm('Are you sure you want to delete this post?')) return;
    
    fetch(`${this.API_BASE_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${this.currentUser.token}` }
    })
    .then(res => res.json())
   .then(data => {
    if (data.success) {
        this.posts = this.posts.filter(p => p._id !== postId);
        this.renderFeed();
        showToast('Post deleted', 'success');
    } else {
        showToast(data.message || 'Delete failed', 'error');
    }
})
    .catch(() => showToast('Failed to delete post', 'error'))
    .finally(() => document.querySelector('.post-options-overlay')?.remove());
}
togglePin(postId) {
    fetch(`${this.API_BASE_URL}/posts/${postId}/pin`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${this.currentUser.token}`
        }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.isPinned ? 'Post pinned 📌' : 'Post unpinned', 'success');
            this.refreshFeed();
        } else {
            showToast(data.message || 'Failed', 'error');
        }
    })
    .catch(() => showToast('Error pinning post', 'error'))
    .finally(() => document.querySelector('.post-options-overlay')?.remove());
}

reportPost(postId) {
    showToast('Post reported. Thank you!', 'success');
    document.querySelector('.post-options-overlay')?.remove();
}

hidePost(postId) {
    this.posts = this.posts.filter(p => p._id !== postId);
    this.renderFeed();
    showToast('Post hidden from your feed', 'success');
    document.querySelector('.post-options-overlay')?.remove();
}

copyPostLink(postId) {
    const url = `${window.location.origin}/dashboard.html?post=${postId}`;
    navigator.clipboard?.writeText(url);
    showToast('Link copied!', 'success');
    document.querySelector('.post-options-overlay')?.remove();
}
    
    async loadNearbyServices() {
        try {
            const r = await fetch(`${this.API_BASE_URL}/services/nearby?lat=${this.currentLocation?.latitude||0}&lng=${this.currentLocation?.longitude||0}`, { headers: { 'Authorization': `Bearer ${this.currentUser.token}` } });
            const d = await r.json();
            if (d.success && d.services?.length) {
                document.getElementById('nearbyServicesList').innerHTML = d.services.map(s => `<div class="service-provider-item">${createAvatar(s.provider,'md')}<div class="provider-info"><div class="provider-name">${s.provider?.name||'Provider'}</div><div class="provider-distance"><i class="fas fa-tools"></i> ${s.type}</div></div></div>`).join('');
            } else { document.getElementById('nearbyServicesList').innerHTML = '<p class="text-sm text-gray-600">No services nearby</p>'; }
        } catch (e) {}
    }
    
   async loadUserStats() {
    try {
        const response = await fetch(`${this.API_BASE_URL}/users/stats`, { 
            headers: { 'Authorization': `Bearer ${this.currentUser.token}` } 
        });
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('postCount').textContent = data.posts || 0;
            document.getElementById('helpedCount').textContent = data.helped || 0;
            document.getElementById('ratingValue').textContent = (data.rating || 0).toFixed(1);
            
            const reviewCount = document.getElementById('reviewCount');
            if (reviewCount) {
                reviewCount.textContent = `${data.reviews || 0} reviews`;
            }
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}
    
    toggleUserDropdown() { const d = document.getElementById('userDropdownMenu'); d.style.display = d.style.display === 'none' ? 'block' : 'none'; }
    
    logout() { localStorage.removeItem('panchayat_user'); sessionStorage.removeItem('panchayat_user'); location.href = 'index.html'; }
}

// Global
let dashboardManager;
function openCreatePostModal(t='general') { const m=document.getElementById('createPostModal'); if(m){m.style.display='flex'; dashboardManager?.selectPostType(t);} }
function closeCreatePostModal() { document.getElementById('createPostModal').style.display='none'; document.getElementById('createPostForm')?.reset(); document.getElementById('imagePreviewContainer').innerHTML=''; document.getElementById('issueFields').style.display='none'; document.getElementById('serviceFields').style.display='none'; }
function openEmergencyModal() { document.getElementById('emergencyModal').style.display='flex'; }
function closeEmergencyModal() { document.getElementById('emergencyModal').style.display='none'; }
function closeEmergencyBanner() { document.getElementById('emergencyBanner').style.display='none'; }
function selectEmergencyType(t) { document.querySelectorAll('.emergency-type-btn').forEach(b=>b.classList.toggle('active',b.dataset.emergency===t)); }
document.addEventListener('DOMContentLoaded',()=>{ dashboardManager=new DashboardManager(); window.dashboardManager=dashboardManager; });