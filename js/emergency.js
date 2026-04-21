/**
 * Smart Panchayat System - Emergency Module
 * Clean version - No mock data, ready for real API integration
 */

class EmergencyManager {
    constructor() {
        this.activeEmergency = null;
        this.isTriggeringEmergency = false;
        this.locationWatchId = null;
        this.selectedEmergencyType = null;
        this.API_BASE_URL = 'https://smart-panchayat-backend.onrender.com/api';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupEmergencyShortcuts();
    }
    
    setupEventListeners() {
        // Emergency type selection
        document.querySelectorAll('.emergency-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectEmergencyType(btn.dataset.emergency);
            });
        });
    }
    
    setupEmergencyShortcuts() {
        // Volume button shortcut (5 presses)
        let volumePressCount = 0;
        let volumePressTimer = null;
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'VolumeDown' || e.key === 'VolumeUp') {
                volumePressCount++;
                clearTimeout(volumePressTimer);
                volumePressTimer = setTimeout(() => {
                    volumePressCount = 0;
                }, 2000);
                
                if (volumePressCount >= 5) {
                    this.triggerQuickEmergency();
                    volumePressCount = 0;
                }
            }
        });
        
        // Shake detection
        if (window.DeviceMotionEvent) {
            let lastShake = 0;
            window.addEventListener('devicemotion', (e) => {
                const acceleration = e.accelerationIncludingGravity;
                const magnitude = Math.sqrt(
                    (acceleration.x || 0) ** 2 + 
                    (acceleration.y || 0) ** 2 + 
                    (acceleration.z || 0) ** 2
                );
                
                if (magnitude > 25 && Date.now() - lastShake > 2000) {
                    lastShake = Date.now();
                    this.handleShakeEmergency();
                }
            });
        }
    }
    
    selectEmergencyType(type) {
        this.selectedEmergencyType = type;
        
        document.querySelectorAll('.emergency-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.emergency === type);
        });
    }
    
    async triggerEmergency() {
         console.log('🚨 Emergency triggered! Type:', this.selectedEmergencyType);
        if (this.isTriggeringEmergency) return;
        
        if (!this.selectedEmergencyType) {
            showToast('Please select an emergency type', 'error');
            return;
        }
        
        const details = document.getElementById('emergencyDetails')?.value || '';
        const shareLocation = document.getElementById('shareLiveLocation')?.checked ?? true;
        
        const confirmed = await this.confirmEmergency(this.selectedEmergencyType);
        if (!confirmed) return;
        
        this.isTriggeringEmergency = true;
        
        const triggerBtn = document.getElementById('triggerEmergencyBtn');
        const originalText = triggerBtn.innerHTML;
        triggerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SENDING ALERT...';
        triggerBtn.disabled = true;
        
        try {
            let location = dashboardManager?.currentLocation;
            
            if (shareLocation) {
                try {
                    location = await this.getPreciseLocation();
                    this.startLiveLocationSharing();
                } catch (error) {
                    console.error('Location error:', error);
                    showToast('Using approximate location', 'warning');
                }
            }
            
            const emergencyData = {
                type: this.selectedEmergencyType,
                description: details || this.getDefaultEmergencyMessage(this.selectedEmergencyType),
                location: location,
                shareLiveLocation: shareLocation
            };
            
            const user = getCurrentUser();
            
            const response = await fetch(`${this.API_BASE_URL}/emergencies`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify(emergencyData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.activeEmergency = data.emergency;
                
                showToast('EMERGENCY ALERT SENT! Help is on the way.', 'success', 10000);
                closeEmergencyModal();
                
                this.showActiveEmergencyUI(data.emergency);
                this.trackResponders(data.emergency._id);
                
                if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200, 100, 200]);
                }
            } else {
                throw new Error(data.message || 'Failed to send alert');
            }
            
        } catch (error) {
            console.error('Emergency trigger error:', error);
            showToast('Failed to send emergency alert. Please try again.', 'error');
        } finally {
            this.isTriggeringEmergency = false;
            triggerBtn.innerHTML = originalText;
            triggerBtn.disabled = false;
        }
    }
    
    async confirmEmergency(type) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.display = 'flex';
            overlay.style.zIndex = '10000';
            
            const messages = {
                fire: 'This will alert everyone about a FIRE emergency. Are you sure?',
                medical: 'This will alert everyone about a MEDICAL emergency. Are you sure?',
                theft: 'This will alert everyone about a SECURITY threat. Are you sure?',
                other: 'This will trigger an emergency alert. Are you sure?'
            };
            
            overlay.innerHTML = `
                <div class="modal" style="border: 4px solid var(--error);">
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--error);"></i>
                        <h3 style="color: var(--error);">CONFIRM EMERGENCY</h3>
                        <p class="mb-lg">${messages[type] || messages.other}</p>
                        
                        <div class="alert alert-error mb-md">
                            <i class="fas fa-info-circle"></i>
                            This will notify ALL users in your village!
                        </div>
                        
                        <div class="flex gap-md">
                            <button class="btn btn-outline flex-1" onclick="this.closest('.modal-overlay').remove()">
                                Cancel
                            </button>
                            <button class="btn btn-danger flex-1" id="confirmEmergencyBtn">
                                YES, SEND ALERT
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(overlay);
            
            document.getElementById('confirmEmergencyBtn').addEventListener('click', () => {
                overlay.remove();
                resolve(true);
            });
            
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(false);
                }
            });
        });
    }
    
    async triggerQuickEmergency() {
        showToast('Quick Emergency Activated! Sending alert...', 'warning');
        
        try {
            const location = await this.getPreciseLocation();
            const user = getCurrentUser();
            
            const response = await fetch(`${this.API_BASE_URL}/emergencies/quick`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ location })
            });
            
            if (response.ok) {
                showToast('EMERGENCY ALERT SENT!', 'success');
                
                if (navigator.vibrate) {
                    navigator.vibrate([200, 100, 200]);
                }
            }
        } catch (error) {
            console.error('Quick emergency failed:', error);
            showToast('Quick emergency failed. Please use manual trigger.', 'error');
        }
    }
    
    handleShakeEmergency() {
        showToast('Shake detected! Tap anywhere to cancel...', 'warning', 3000);
        
        let cancelled = false;
        const cancelHandler = () => {
            cancelled = true;
            showToast('Emergency cancelled', 'info');
        };
        
        document.addEventListener('touchstart', cancelHandler, { once: true });
        
        setTimeout(() => {
            if (!cancelled) {
                this.triggerQuickEmergency();
            }
            document.removeEventListener('touchstart', cancelHandler);
        }, 3000);
    }
    
    async getPreciseLocation() {
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
                reject,
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }
    
    startLiveLocationSharing() {
        if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
        }
        
        this.locationWatchId = navigator.geolocation.watchPosition(
            async (position) => {
                if (!this.activeEmergency) return;
                
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                
                try {
                    const user = getCurrentUser();
                    await fetch(`${this.API_BASE_URL}/emergencies/${this.activeEmergency._id}/location`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user.token}`
                        },
                        body: JSON.stringify({ location })
                    });
                } catch (error) {
                    console.error('Failed to update location:', error);
                }
            },
            (error) => {
                console.error('Location watch error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 5000
            }
        );
        
        showToast('Live location sharing active', 'info');
    }
    
    stopLiveLocationSharing() {
        if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
        }
    }
    
    getDefaultEmergencyMessage(type) {
        const messages = {
            fire: 'FIRE EMERGENCY! Immediate assistance required!',
            medical: 'MEDICAL EMERGENCY! Need immediate medical attention!',
            theft: 'SECURITY ALERT! Suspicious activity reported!',
            other: 'EMERGENCY! User needs immediate assistance!'
        };
        return messages[type] || messages.other;
    }
    
    showActiveEmergencyUI(emergency) {
        const existingBanner = document.getElementById('activeEmergencyBanner');
        if (existingBanner) existingBanner.remove();
        
        const banner = document.createElement('div');
        banner.id = 'activeEmergencyBanner';
        banner.className = 'emergency-banner';
        banner.style.position = 'fixed';
        banner.style.top = '80px';
        banner.style.left = '0';
        banner.style.right = '0';
        banner.style.zIndex = '999';
        banner.style.borderRadius = '0';
        banner.style.margin = '0';
        
        banner.innerHTML = `
            <div class="emergency-banner-content">
                <i class="fas fa-ambulance fa-spin"></i>
                <div>
                    <strong>EMERGENCY ACTIVE - Help is on the way!</strong>
                    <p id="responderCount">Searching for nearby responders...</p>
                </div>
            </div>
            <div class="flex gap-sm">
                <button class="btn btn-sm btn-outline" style="color: white; border-color: white;" onclick="emergencyManager.cancelEmergency()">
                    Cancel
                </button>
            </div>
        `;
        
        const navbar = document.querySelector('.navbar');
        navbar.parentNode.insertBefore(banner, navbar.nextSibling);
        
        document.querySelector('.dashboard-layout').style.paddingTop = '60px';
    }
    
    async trackResponders(emergencyId) {
        const user = getCurrentUser();
        let responderCount = 0;
        
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${this.API_BASE_URL}/emergencies/${emergencyId}/responders`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                
                const data = await response.json();
                
                if (data.responders.length > responderCount) {
                    responderCount = data.responders.length;
                    const countElement = document.getElementById('responderCount');
                    if (countElement) {
                        countElement.textContent = `${responderCount} responder${responderCount !== 1 ? 's' : ''} on the way`;
                    }
                }
            } catch (error) {
                console.error('Error tracking responders:', error);
            }
        }, 5000);
        
        this.responderTrackingInterval = interval;
    }
    
    async cancelEmergency() {
        if (!this.activeEmergency) return;
        
        const confirmed = confirm('Are you sure you want to cancel the emergency alert?');
        if (!confirmed) return;
        
        try {
            const user = getCurrentUser();
            
            await fetch(`${this.API_BASE_URL}/emergencies/${this.activeEmergency._id}/cancel`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${user.token}` }
            });
            
            this.stopLiveLocationSharing();
            clearInterval(this.responderTrackingInterval);
            
            document.getElementById('activeEmergencyBanner')?.remove();
            document.querySelector('.dashboard-layout').style.paddingTop = '0';
            
            this.activeEmergency = null;
            
            showToast('Emergency alert cancelled', 'success');
            
        } catch (error) {
            console.error('Failed to cancel emergency:', error);
            showToast('Failed to cancel emergency', 'error');
        }
    }
}

let emergencyManager;

function triggerEmergency() {
    if (emergencyManager) {
        emergencyManager.triggerEmergency();
    }
}

function cancelEmergency() {
    if (emergencyManager) {
        emergencyManager.cancelEmergency();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    emergencyManager = new EmergencyManager();
});