/**
 * Smart Panchayat System - Village Events Module
 * REAL BACKEND - No Mock Data
 */

class EventsManager {
    constructor() {
        this.user = null;
        this.events = [];
        this.currentTab = 'all';
       this.API_BASE_URL = 'https://smart-panchayat-backend.onrender.com/api';
        
        this.init();
    }
    
    async init() {
        if (!requireAuth()) return;
        
        this.user = getCurrentUser();
        console.log('Events initialized for:', this.user.name);
        
        this.setupEventListeners();
        await this.loadEvents();
    }
    
    setupEventListeners() {
        document.querySelectorAll('.event-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.event-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTab = tab.dataset.tab;
                this.filterEvents();
            });
        });
        
        document.getElementById('createEventForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createEvent();
        });
        
        document.getElementById('createEventBtn')?.addEventListener('click', () => {
            this.showCreateEventModal();
        });
    }
    
    async loadEvents() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/events`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.events = data.events || [];
                this.renderEvents();
                this.loadUpcomingEvents();
            } else {
                showToast('Failed to load events', 'error');
                this.events = [];
                this.renderEvents();
            }
        } catch (error) {
            console.error('Error loading events:', error);
            showToast('Network error. Is backend running?', 'error');
            this.events = [];
            this.renderEvents();
        }
    }
    
    filterEvents() {
        let filtered = [...this.events];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        
        switch (this.currentTab) {
            case 'upcoming':
                filtered = filtered.filter(e => e.date >= todayStr);
                break;
            case 'meetings':
                filtered = filtered.filter(e => e.type === 'meeting');
                break;
            case 'festivals':
                filtered = filtered.filter(e => e.type === 'festival');
                break;
            case 'past':
                filtered = filtered.filter(e => e.date < todayStr);
                break;
        }
        
        this.renderEvents(filtered);
    }
    
    renderEvents(events = null) {
        const container = document.getElementById('eventsList');
        const displayEvents = events || this.events;
        
        if (!displayEvents || displayEvents.length === 0) {
            container.innerHTML = `
                <div class="text-center p-xl">
                    <i class="fas fa-calendar-times" style="font-size: 3rem; color: var(--gray-400);"></i>
                    <h3>No events found</h3>
                    <p class="text-gray-600">Check back later for upcoming events!</p>
                    <button class="btn btn-primary mt-md" onclick="eventsManager.showCreateEventModal()">
                        <i class="fas fa-plus"></i> Create Event
                    </button>
                </div>
            `;
            return;
        }
        
        // Sort by date
        displayEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        container.innerHTML = displayEvents.map(event => this.renderEventCard(event)).join('');
    }
    
    renderEventCard(event) {
        const eventDate = new Date(event.date);
        const day = eventDate.getDate();
        const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
        const year = eventDate.getFullYear();
        
        const typeBadges = {
            meeting: '<span class="event-badge badge-meeting"><i class="fas fa-users"></i> Meeting</span>',
            festival: '<span class="event-badge badge-festival"><i class="fas fa-star"></i> Festival</span>',
            health: '<span class="event-badge badge-health"><i class="fas fa-heartbeat"></i> Health Camp</span>',
            announcement: '<span class="event-badge badge-announcement"><i class="fas fa-bullhorn"></i> Announcement</span>',
            emergency: '<span class="event-badge badge-emergency"><i class="fas fa-exclamation-triangle"></i> Emergency</span>',
            other: '<span class="event-badge" style="background:var(--gray-200);">📌 Other</span>'
        };
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPast = new Date(event.date) < today;
        
        return `
            <div class="event-card ${event.urgent ? 'urgent' : ''} ${!isPast ? 'featured' : ''}">
                <div class="event-header">
                    <div class="event-date" style="${isPast ? 'background: var(--gray-500);' : ''}">
                        <div class="day">${day}</div>
                        <div class="month">${month}</div>
                        <div class="year">${year}</div>
                    </div>
                    <div class="event-content">
                        <div class="event-title">
                            ${event.title}
                            ${typeBadges[event.type] || typeBadges.other}
                            ${event.urgent ? '<span class="event-badge badge-emergency">⚠️ Urgent</span>' : ''}
                            ${isPast ? '<span class="event-badge" style="background:var(--gray-200);">✅ Past</span>' : ''}
                        </div>
                        <p class="event-description">${event.description || 'No description provided.'}</p>
                        <div class="event-meta">
                            <div class="event-meta-item">
                                <i class="fas fa-clock"></i>
                                <span>${event.time}</span>
                            </div>
                            <div class="event-meta-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${event.location}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="event-footer">
                    <div class="event-organizer">
                        <i class="fas fa-user-circle"></i>
                        <span>${event.organizer || 'Panchayat Office'}</span>
                    </div>
                    <div class="event-actions">
                        ${!isPast ? `
                            <button class="btn btn-outline btn-sm" onclick="eventsManager.setReminder('${event._id}')">
                                <i class="far fa-bell"></i> Remind Me
                            </button>
                        ` : ''}
                        <button class="btn btn-outline btn-sm" onclick="eventsManager.shareEvent('${event._id}')">
                            <i class="fas fa-share"></i> Share
                        </button>
                        ${event.createdBy?._id === this.user?.id || this.user?.role === 'admin' ? `
                            <button class="btn btn-outline btn-sm" onclick="eventsManager.deleteEvent('${event._id}')" style="color: var(--error);">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    loadUpcomingEvents() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        
        const upcoming = this.events
            .filter(e => e.date >= todayStr)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 3);
        
        const container = document.getElementById('upcomingEventsList');
        
        if (upcoming.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center p-md">No upcoming events</p>';
            document.querySelector('.reminder-badge span').textContent = '0 events this week';
            return;
        }
        
        container.innerHTML = upcoming.map(event => {
            const d = new Date(event.date);
            return `
                <div class="mini-event-item">
                    <div class="mini-event-date">
                        <div class="day">${d.getDate()}</div>
                        <div class="month">${d.toLocaleString('default', { month: 'short' }).toUpperCase()}</div>
                    </div>
                    <div class="mini-event-info">
                        <div class="mini-event-title">${event.title}</div>
                        <div class="mini-event-time">${event.time} - ${event.location}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        const weekEvents = this.events.filter(e => {
            const eventDate = new Date(e.date);
            const weekLater = new Date(today);
            weekLater.setDate(weekLater.getDate() + 7);
            return eventDate >= today && eventDate <= weekLater;
        }).length;
        
        document.querySelector('.reminder-badge span').textContent = `${weekEvents} event${weekEvents !== 1 ? 's' : ''} this week`;
    }
    
    showCreateEventModal() {
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('eventDate').value = today;
        document.getElementById('createEventModal').style.display = 'flex';
    }
    
    async createEvent() {
        const title = document.getElementById('eventTitle')?.value.trim();
        const type = document.getElementById('eventType')?.value;
        const description = document.getElementById('eventDescription')?.value.trim();
        const date = document.getElementById('eventDate')?.value;
        const time = document.getElementById('eventTime')?.value;
        const location = document.getElementById('eventLocation')?.value.trim();
        const organizer = document.getElementById('eventOrganizer')?.value.trim();
        
        if (!title || !type || !date || !time || !location) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        
        const submitBtn = document.querySelector('#createEventForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify({
                    title,
                    type,
                    description: description || '',
                    date,
                    time,
                    location,
                    organizer: organizer || 'Panchayat Office',
                    urgent: type === 'emergency'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Event created successfully!', 'success');
                closeCreateEventModal();
                await this.loadEvents();
            } else {
                showToast(data.message || 'Failed to create event', 'error');
            }
        } catch (error) {
            console.error('Create event error:', error);
            showToast('Network error. Is backend running?', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
    async setReminder(eventId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/events/${eventId}/reminder`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                const event = this.events.find(e => e._id === eventId);
                showToast(`🔔 Reminder set for "${event?.title}"`, 'success');
            } else {
                showToast(data.message || 'Failed to set reminder', 'error');
            }
        } catch (error) {
            showToast('Network error', 'error');
        }
    }
    
    async deleteEvent(eventId) {
        if (!confirm('Are you sure you want to delete this event?')) return;
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/events/${eventId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Event deleted', 'success');
                await this.loadEvents();
            } else {
                showToast(data.message || 'Failed to delete event', 'error');
            }
        } catch (error) {
            showToast('Network error', 'error');
        }
    }
    
    shareEvent(eventId) {
        const event = this.events.find(e => e._id === eventId);
        if (!event) return;
        
        const text = `📅 ${event.title}\n📌 ${event.date} at ${event.time}\n📍 ${event.location}\n\n${event.description || ''}`;
        navigator.clipboard?.writeText(text);
        showToast('Event details copied to clipboard!', 'success');
    }
}

let eventsManager;

function closeCreateEventModal() {
    document.getElementById('createEventModal').style.display = 'none';
    document.getElementById('createEventForm')?.reset();
}

document.addEventListener('DOMContentLoaded', () => {
    eventsManager = new EventsManager();
    window.eventsManager = eventsManager;
});