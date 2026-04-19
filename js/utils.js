/**
 * Smart Panchayat System - Utility Functions
 * Shared helper functions across the application
 */

// Toast Notification System
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    
    if (!container) {
        console.warn('Toast container not found');
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Format date to relative time
function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 7) {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } else if (days > 0) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}

// Format phone number for display
function formatPhoneNumber(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    return phone;
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll/resize events
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Get current user from storage
function getCurrentUser() {
    const userData = localStorage.getItem('panchayat_user') || sessionStorage.getItem('panchayat_user');
    return userData ? JSON.parse(userData) : null;
}

// Check if user is authenticated
function isAuthenticated() {
    const user = getCurrentUser();
    return user && user.token;
}

// Redirect if not authenticated
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// API request wrapper
async function apiRequest(endpoint, options = {}) {
    const user = getCurrentUser();
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { 'Authorization': `Bearer ${user.token}` })
        },
        ...options
    };
    
    try {
        const response = await fetch(`/api/${endpoint}`, defaultOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Get user's current location
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                reject(error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    });
}


// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Format distance for display
function formatDistance(km) {
    if (km < 1) {
        return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
}

// Image compression before upload
function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(
                    (blob) => {
                        resolve(blob);
                    },
                    'image/jpeg',
                    quality
                );
            };
            
            img.onerror = reject;
        };
        
        reader.onerror = reject;
    });
}

// Generate random avatar color based on name
function getAvatarColor(name) {
    const colors = [
        '#2E7D32', '#1976D2', '#D32F2F', '#FF6F00', 
        '#7B1FA2', '#00796B', '#C2185B', '#0288D1'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
}

// Get initials from name
function getInitials(name) {
    if (!name) return 'U';
    
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }
    
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function createAvatar(user, size = 'md') {
    const sizeClass = `avatar-${size}`;
    
    // Check user object first
    let profilePic = user?.profilePic || user?.avatar || user?.profile_pic;
    
    // If not found, check storage
    if (!profilePic || profilePic === 'null' || profilePic === 'undefined') {
        const stored = JSON.parse(localStorage.getItem('panchayat_user') || sessionStorage.getItem('panchayat_user') || '{}');
        profilePic = stored.profilePic || stored.avatar;
    }
    
    if (profilePic && profilePic !== 'null' && profilePic !== 'undefined') {
        let imageUrl = profilePic;
        
        if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            imageUrl = 'https://smart-panchayat-backend.onrender.com' + imageUrl;
        }
        
        return `<img src="${imageUrl}" class="avatar ${sizeClass}" alt="${user?.name || 'User'}" style="object-fit: cover;" onerror="if(this&&this.style)this.style.display='none';">`;
    }
    
    // Fallback to initials
    const name = user?.name || 'User';
    const color = getAvatarColor(name);
    const initials = getInitials(name);
    
    return `
        <div class="avatar ${sizeClass}" style="background: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
            ${initials}
        </div>
    `;
}
// Copy to clipboard
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    } catch (error) {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied to clipboard!', 'success');
    }
}

// Add CSS animation for slideOutRight
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .password-strength {
        margin-top: var(--space-xs);
    }
    
    .strength-bar {
        height: 4px;
        border-radius: var(--radius-full);
        transition: all var(--transition-fast);
    }
    
    .strength-text {
        font-size: 0.75rem;
        font-weight: 500;
    }
    
    .alert {
        padding: var(--space-md);
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        gap: var(--space-sm);
    }
    
    .alert-info {
        background: rgba(30, 136, 229, 0.1);
        color: var(--info);
        border: 1px solid rgba(30, 136, 229, 0.2);
    }
    
    .ml-md { margin-left: var(--space-md); }
    .ml-sm { margin-left: var(--space-sm); }
`;
document.head.appendChild(style);
// Toggle More Menu
function toggleMoreMenu() {
    const overlay = document.getElementById('moreMenuOverlay');
    const menu = document.getElementById('moreMenu');
    
    if (overlay && menu) {
        overlay.classList.toggle('active');
        menu.classList.toggle('active');
        document.body.style.overflow = menu.classList.contains('active') ? 'hidden' : '';
    }
}

// Close more menu when clicking a link
document.addEventListener('click', function(e) {
    if (e.target.closest('.more-menu-item')) {
        const overlay = document.getElementById('moreMenuOverlay');
        const menu = document.getElementById('moreMenu');
        if (overlay && menu) {
            overlay.classList.remove('active');
            menu.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    // Close on overlay click
    if (e.target.id === 'moreMenuOverlay') {
        const menu = document.getElementById('moreMenu');
        e.target.classList.remove('active');
        menu.classList.remove('active');
        document.body.style.overflow = '';
    }
});
// Reverse Geocoding - Get address from coordinates
async function getAddressFromCoords(lat, lng) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await response.json();
        
        if (data && data.address) {
            return data.address.village || 
                   data.address.town || 
                   data.address.city || 
                   data.address.suburb || 
                   data.address.state_district ||
                   data.address.county ||
                   `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    } catch (error) {
        console.error('Geocoding error:', error);
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}