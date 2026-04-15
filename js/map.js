/**
 * Smart Panchayat System - Map Module
 */

class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.allPosts = [];
        this.currentFilter = 'all';
        this.selectedLocation = null;
        this.isSelectingLocation = false;
        this.userMarker = null;
        this.API_BASE_URL = 'https://smart-panchayat-backend.onrender.com/api';
        this.user = null;
        
        this.init();
    }
    
    async init() {
        if (!requireAuth()) return;
        
        this.user = getCurrentUser();
        
        this.initMap();
        this.setupEventListeners();
        await this.loadPosts();
        await this.locateUser();
    }
    
    initMap() {
        // Default center (India)
        const defaultCenter = [28.6139, 77.2090];
        
        this.map = L.map('villageMap').setView(defaultCenter, 13);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);
        
        // Update status
        document.getElementById('mapStatus').innerHTML = `
            <i class="fas fa-circle" style="color: var(--success); font-size: 8px;"></i>
            Map loaded
        `;
        
        // Add click handler for location selection
        this.map.on('click', (e) => {
            if (this.isSelectingLocation) {
                this.setSelectedLocation(e.latlng);
            }
        });
    }
    
    setupEventListeners() {
        // Post type selector in modal
        document.querySelectorAll('#mapPostModal .service-category').forEach(cat => {
            cat.addEventListener('click', () => {
                document.querySelectorAll('#mapPostModal .service-category').forEach(c => {
                    c.classList.remove('active');
                });
                cat.classList.add('active');
            });
        });
        
        // Map post form
        document.getElementById('mapPostForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createPostFromMap();
        });
    }
    
    async loadPosts() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/posts?limit=100`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.allPosts = data.posts || [];
                this.renderMarkers();
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            showToast('Failed to load posts', 'error');
        }
    }
    
    renderMarkers() {
        // Clear existing markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
        
        // Filter posts
        let postsToShow = this.allPosts;
        if (this.currentFilter !== 'all') {
            postsToShow = this.allPosts.filter(p => p.type === this.currentFilter);
        }
        
        // Create markers
        postsToShow.forEach(post => {
            if (post.location?.coordinates) {
                const marker = this.createMarker(post);
                this.markers.push(marker);
                marker.addTo(this.map);
            }
        });
        
        // Fit bounds if there are markers
        if (this.markers.length > 0) {
            const group = new L.featureGroup(this.markers);
            this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
    }
    
    createMarker(post) {
        const lat = post.location.coordinates[1];
        const lng = post.location.coordinates[0];
        
        // Choose icon based on post type
        const iconColors = {
            issue: '#FF6F00',
            service: '#1976D2',
            emergency: '#D32F2F',
            general: '#2E7D32'
        };
        
        const color = iconColors[post.type] || '#2E7D32';
        
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="background: ${color}; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                <i class="fas ${this.getIconForType(post.type)}"></i>
            </div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -18]
        });
        
        const marker = L.marker([lat, lng], { icon });
        
        // Create popup content
        const popupContent = `
            <div class="map-popup">
                <div class="popup-title">${post.title || 'Untitled'}</div>
                <div class="popup-desc">${post.description.substring(0, 100)}${post.description.length > 100 ? '...' : ''}</div>
                <div style="display: flex; gap: 5px; margin-bottom: 10px;">
                    <span class="badge" style="background: ${color}; color: white;">${post.type}</span>
                    ${post.type === 'issue' ? `<span class="badge badge-warning">${post.priority || 'medium'}</span>` : ''}
                </div>
                <div class="popup-actions">
                    <button class="btn btn-primary btn-sm" onclick="mapManager.viewPost('${post._id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="mapManager.getDirections(${lat}, ${lng})">
                        <i class="fas fa-directions"></i> Directions
                    </button>
                </div>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        
        return marker;
    }
    
    getIconForType(type) {
        const icons = {
            issue: 'fa-exclamation-triangle',
            service: 'fa-tools',
            emergency: 'fa-ambulance',
            general: 'fa-newspaper'
        };
        return icons[type] || 'fa-map-pin';
    }
    
    async locateUser() {
        try {
            const position = await getUserLocation();
            const { latitude, longitude } = position;
            
            // Center map on user
            this.map.setView([latitude, longitude], 15);
            
            // Add user marker
            if (this.userMarker) {
                this.map.removeLayer(this.userMarker);
            }
            
            const userIcon = L.divIcon({
                className: 'user-marker',
                html: `<div style="background: #2196F3; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 0 4px rgba(33, 150, 243, 0.3);"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            this.userMarker = L.marker([latitude, longitude], { icon: userIcon })
                .bindPopup('<strong>Your Location</strong>')
                .addTo(this.map);
            
            document.getElementById('mapStatus').innerHTML = `
                <i class="fas fa-circle" style="color: var(--success); font-size: 8px;"></i>
                Location found
            `;
            
        } catch (error) {
            console.error('Location error:', error);
            document.getElementById('mapStatus').innerHTML = `
                <i class="fas fa-circle" style="color: var(--error); font-size: 8px;"></i>
                Location unavailable
            `;
        }
    }
    
    filterMarkers(filter) {
        this.currentFilter = filter;
        
        // Update UI
        document.querySelectorAll('.map-filter-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.filter === filter);
        });
        
        this.renderMarkers();
    }
    
    refreshMap() {
        this.loadPosts();
        showToast('Map refreshed!', 'success');
    }
    
    toggleFullscreen() {
        const mapContainer = document.querySelector('.map-container');
        
        if (!document.fullscreenElement) {
            mapContainer.requestFullscreen();
            document.querySelector('.fa-expand').classList.remove('fa-expand');
            document.querySelector('.fa-expand').classList.add('fa-compress');
        } else {
            document.exitFullscreen();
            document.querySelector('.fa-compress').classList.remove('fa-compress');
            document.querySelector('.fa-compress').classList.add('fa-expand');
        }
    }
    
    startLocationSelect() {
        this.isSelectingLocation = true;
        document.getElementById('locationSelector').classList.add('active');
        showToast('Click on the map to select a location', 'info');
    }
    
    setSelectedLocation(latlng) {
        this.selectedLocation = latlng;
        document.getElementById('selectedCoords').textContent = 
            `📍 ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
        
        // Show create post modal with location
        this.openMapPostModal(latlng);
    }
    
    confirmLocation() {
        if (this.selectedLocation) {
            this.isSelectingLocation = false;
            document.getElementById('locationSelector').classList.remove('active');
            this.openMapPostModal(this.selectedLocation);
        }
    }
    
    cancelLocationSelect() {
        this.isSelectingLocation = false;
        this.selectedLocation = null;
        document.getElementById('locationSelector').classList.remove('active');
        document.getElementById('selectedCoords').textContent = 'Select a location';
    }
    
    openMapPostModal(latlng) {
        document.getElementById('mapSelectedLocation').innerHTML = 
            `📍 ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
        document.getElementById('mapPostModal').style.display = 'flex';
    }
    
    async createPostFromMap() {
        const type = document.querySelector('#mapPostModal .service-category.active')?.dataset.type || 'general';
        const title = document.getElementById('mapPostTitle').value.trim();
        const description = document.getElementById('mapPostDescription').value.trim();
        
        if (!description) {
            showToast('Please enter a description', 'error');
            return;
        }
        
        if (!this.selectedLocation) {
            showToast('Please select a location', 'error');
            return;
        }
        
        try {
            const postData = {
                type,
                title: title || undefined,
                description,
                lat: this.selectedLocation.lat,
                lng: this.selectedLocation.lng,
                address: `Selected location (${this.selectedLocation.lat.toFixed(4)}, ${this.selectedLocation.lng.toFixed(4)})`,
                isAnonymous: false
            };
            
            const response = await fetch(`${this.API_BASE_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify(postData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Post created successfully!', 'success');
                closeMapPostModal();
                
                // Add new post to map
                this.allPosts.unshift(data.post);
                this.renderMarkers();
            } else {
                showToast(data.message || 'Failed to create post', 'error');
            }
        } catch (error) {
            console.error('Error creating post:', error);
            showToast('Network error', 'error');
        }
    }
    
    viewPost(postId) {
        window.location.href = `dashboard.html?post=${postId}`;
    }
    
    getDirections(lat, lng) {
        const url = `https://www.openstreetmap.org/directions?engine=graphhopper_foot&route=%3B${lat}%2C${lng}`;
        window.open(url, '_blank');
    }
}

let mapManager;

function closeMapPostModal() {
    document.getElementById('mapPostModal').style.display = 'none';
    document.getElementById('mapPostForm').reset();
}

document.addEventListener('DOMContentLoaded', () => {
    mapManager = new MapManager();
});

// Expose to global for onclick handlers
window.mapManager = mapManager;