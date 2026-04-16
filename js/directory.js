/**
 * Smart Panchayat System - User Directory Module
 */

class DirectoryManager {
    constructor() {
        this.user = null;
        this.users = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.API_BASE_URL = 'https://smart-panchayat-backend.onrender.com/api';
        
        this.init();
    }
    
    async init() {
        if (!requireAuth()) return;
        
        this.user = getCurrentUser();
        console.log('Directory initialized');
        
        this.setupEventListeners();
        await this.loadUsers();
    }
    
    setupEventListeners() {
        // Filter chips
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.currentFilter = chip.dataset.filter;
                this.filterUsers();
            });
        });
        
        // Search input
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.filterUsers();
        });
    }
    
    async loadUsers() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/users/directory`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.users = data.users || [];
                this.updateStats();
                this.renderUsers();
            }
        } catch (error) {
            console.error('Error loading users:', error);
            showToast('Failed to load users', 'error');
        }
    }
    
    updateStats() {
        document.getElementById('totalUsers').textContent = this.users.length;
        document.getElementById('providerCount').textContent = this.users.filter(u => u.isProvider).length;
        document.getElementById('onlineCount').textContent = this.users.filter(u => u.online).length;
    }
    
    filterUsers() {
        let filtered = [...this.users];
        
        // Apply search
        if (this.searchQuery) {
            filtered = filtered.filter(u => 
                u.name?.toLowerCase().includes(this.searchQuery) ||
                u.phone?.includes(this.searchQuery) ||
                u.location?.address?.toLowerCase().includes(this.searchQuery)
            );
        }
        
        // Apply filter
        switch (this.currentFilter) {
            case 'provider':
                filtered = filtered.filter(u => u.isProvider);
                break;
            case 'user':
                filtered = filtered.filter(u => !u.isProvider);
                break;
            case 'verified':
                filtered = filtered.filter(u => u.isVerified);
                break;
            case 'online':
                filtered = filtered.filter(u => u.online);
                break;
        }
        
        this.renderUsers(filtered);
    }
    
    renderUsers(users = null) {
        const container = document.getElementById('usersGrid');
        const displayUsers = users || this.users;
        
        if (displayUsers.length === 0) {
            container.innerHTML = `
                <div class="text-center p-xl" style="grid-column: 1/-1;">
                    <i class="fas fa-users-slash" style="font-size: 3rem; color: var(--gray-400);"></i>
                    <h3>No users found</h3>
                    <p class="text-gray-600">Try adjusting your search or filter</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = displayUsers.map(u => this.renderUserCard(u)).join('');
    }
    
    renderUserCard(user) {
        const getRoleBadge = () => {
            if (user.role === 'admin') return '<span class="user-card-role role-admin">Admin</span>';
            if (user.isProvider) return '<span class="user-card-role role-provider">Provider</span>';
            return '<span class="user-card-role role-user">Member</span>';
        };
        
      const getLocation = () => {
    if (!user.location) return 'Location not set';
    
    // Check if coordinates exist AND are not 0,0
    if (user.location.coordinates) {
        const lat = user.location.coordinates[1];
        const lng = user.location.coordinates[0];
        
        // If coordinates are 0,0 (default), don't try to fetch
        if (lat === 0 && lng === 0) {
            return user.location.address || 'Location not set';
        }
        
        // Create a span with ID for async update
        const spanId = `loc-${user._id}`;
        
        // Fetch address asynchronously
        setTimeout(async () => {
            const span = document.getElementById(spanId);
            if (span) {
                try {
                    const address = await getAddressFromCoords(lat, lng);
                    span.textContent = address || 'Location shared';
                } catch (e) {
                    span.textContent = user.location.address || 'Location shared';
                }
            }
        }, 10);
        
        return `<span id="${spanId}">📍 Loading...</span>`;
    }
    
    // If location is already a string
    if (typeof user.location === 'string') return user.location;
    
    // If location has address field
    if (user.location.address) return user.location.address;
    
    return 'Location not set';
};
        
       const getProviderCategory = () => {
    if (!user.isProvider || !user.providerDetails?.category) return '';
    return `<div class="provider-category">
        <i class="fas fa-tools"></i> ${user.providerDetails.category}
    </div>`;
};
        
        return `
            <div class="user-card">
                <div class="user-card-header">
                    <div class="user-card-avatar">
                        ${createAvatar(user, 'lg')}
                        ${user.online ? '<span class="online-indicator"></span>' : ''}
                    </div>
                    <div class="user-card-info">
                       <div class="user-card-name">
    ${user.name || 'User'}
    ${user.isVerified ? '<i class="fas fa-check-circle verified-badge" title="Verified"></i>' : ''}
</div>
${getRoleBadge()}
${getProviderCategory()}
                    </div>
                </div>
                
                <div class="user-card-detail">
    <i class="fas fa-user-shield"></i>
    <span>Contact hidden for privacy</span>
</div>
                
                <div class="user-card-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${getLocation()}</span>
                </div>
                
                ${user.email ? `
                    <div class="user-card-detail">
                        <i class="fas fa-envelope"></i>
                        <span>${user.email}</span>
                    </div>
                ` : ''}
                
                <div class="user-card-stats">
                    <div class="user-stat">
                        <div class="value">${user.stats?.posts || 0}</div>
                        <div class="label">Posts</div>
                    </div>
                    <div class="user-stat">
                        <div class="value">${user.stats?.helped || 0}</div>
                        <div class="label">Helped</div>
                    </div>
                    <div class="user-stat">
                        <div class="value">${user.providerDetails?.rating?.toFixed(1) || '0.0'}</div>
                        <div class="label">Rating</div>
                    </div>
                </div>
                
                <div class="user-card-actions">
    <button class="btn btn-primary btn-sm" onclick="directoryManager.viewProfile('${user._id}')">
        <i class="fas fa-user"></i> Profile
    </button>

    <button class="btn btn-outline btn-sm" onclick="directoryManager.messageUser('${user._id}')">
        <i class="fas fa-comment"></i> Chat
    </button>

    ${this.user.role === 'admin' ? `
        <button onclick="deleteUser('${user._id}')" 
            style="background:red;color:white;padding:6px 10px;border:none;border-radius:6px;margin-left:5px;">
            🗑 Delete
        </button>
    ` : ''}
</div>
            </div>
        `;
    }
    
    viewProfile(userId) {
        window.location.href = `profile.html?user=${userId}`;
    }
    
    messageUser(userId) {
        window.location.href = `chat.html?user=${userId}`;
    }
    
    refresh() {
        this.loadUsers();
        showToast('Directory refreshed!', 'success');
    }
}

let directoryManager;
async function deleteUser(userId) {
    if (!confirm("Delete this user?")) return;

    try {
       const currentUser = getCurrentUser();
       const token = currentUser.token;

        const res = await fetch(`https://smart-panchayat-backend.onrender.com/api/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await res.json();

        if (data.success) {
            alert('User deleted');
            location.reload();
        } else {
            alert(data.message);
        }

    } catch (err) {
        alert('Error deleting user');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    directoryManager = new DirectoryManager();
    window.directoryManager = directoryManager;
});