/**
 * Smart Panchayat System - Village Chat Module (FIXED)
 */

class ChatManager {
    constructor() {
        this.user = null;
        this.currentChat = 'village';
        this.messages = [];
        this.conversations = [];
        this.API_BASE_URL = 'https://smart-panchayat-backend.onrender.com/api';
        this.pollInterval = null;
        this.isLoading = false;
        this.typingTimeout = null;
        
        this.init();
    }
    
    async init() {
        if (!requireAuth()) return;
        
        this.user = getCurrentUser();
        console.log('💬 Chat initialized for:', this.user.name);
        
        this.setupEventListeners();
        await this.loadVillageMessages();
        await this.loadConversations();
        this.startPolling();
    }
    
    setupEventListeners() {
        // Send message
        document.getElementById('sendMessageBtn')?.addEventListener('click', () => this.sendMessage());
        
        document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // New chat button
        document.getElementById('newChatBtn')?.addEventListener('click', () => this.openNewChatModal());
        
        // Search users
        document.getElementById('userSearchInput')?.addEventListener('input', (e) => this.searchUsers(e.target.value));
        
        // Village chat click
        const villageChat = document.getElementById('villageChatItem');
        if (villageChat) {
            villageChat.addEventListener('click', () => this.switchToVillageChat());
        }
        
        // Close modal
        document.getElementById('newChatModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) closeNewChatModal();
        });
        
        // Search in sidebar
        document.getElementById('searchChatInput')?.addEventListener('input', (e) => {
            this.filterChats(e.target.value);
        });
    }
    
    // ============ POLLING ============
    startPolling() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(() => this.checkForNewMessages(), 5000);
    }
    
    async checkForNewMessages() {
        if (this.isLoading) return;
        try {
            const endpoint = this.currentChat === 'village'
                ? `${this.API_BASE_URL}/chat/village/messages`
                : `${this.API_BASE_URL}/chat/${this.currentChat}/messages`;
            
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            const data = await response.json();
            
            if (data.success && data.messages) {
                if (data.messages.length > this.messages.length) {
                    this.messages = data.messages;
                    this.renderMessages();
                }
            }
        } catch (error) {}
    }
    
    // ============ VILLAGE CHAT ============
    async loadVillageMessages() {
        this.isLoading = true;
        try {
            const response = await fetch(`${this.API_BASE_URL}/chat/village/messages`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            const data = await response.json();
            if (data.success) {
                this.messages = data.messages || [];
                this.renderMessages();
                this.updateVillagePreview();
            }
        } catch (error) {
            this.messages = [];
            this.renderMessages();
        } finally {
            this.isLoading = false;
        }
    }
    
    switchToVillageChat() {
        console.log('🏘️ Switching to Village Chat');
        this.currentChat = 'village';
        
        // Update active states
        document.querySelectorAll('.village-chat, .conversation-item').forEach(c => c.classList.remove('active'));
        document.getElementById('villageChatItem')?.classList.add('active');
        
        // Update header
        document.getElementById('currentChatName').textContent = '🏘️ Village Community';
        document.getElementById('chatSubtitle').textContent = 'Public Chat • Everyone can message';
        document.getElementById('chatAvatar').innerHTML = '<i class="fas fa-users" style="font-size:20px;"></i>';
        
        // Show chat on mobile
        document.getElementById('chatMain')?.classList.add('active');
        
        this.loadVillageMessages();
    }
    
    updateVillagePreview() {
        if (this.messages.length > 0) {
            const last = this.messages[this.messages.length - 1];
            const el = document.getElementById('villageLastMessage');
            const time = document.getElementById('villageLastTime');
            if (el) el.textContent = (last.content || '').substring(0, 40);
            if (time) time.textContent = formatRelativeTime(last.createdAt);
        }
    }
    
    // ============ PERSONAL CHATS ============
    async loadConversations() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/chat/conversations`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            const data = await response.json();
            if (data.success) {
                this.conversations = data.conversations || [];
                this.renderConversations();
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }
    
    renderConversations() {
        const container = document.getElementById('individualChats');
        if (!container) return;
        
        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div style="text-align:center;padding:20px;color:#999;">
                    <p>No conversations yet</p>
                    <p style="font-size:12px;">Click + to start chatting</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.conversations.map(conv => {
            const name = conv.participant?.name || 'User';
            const lastMsg = conv.lastMessage || 'Start a conversation';
            const time = conv.lastMessageTime ? formatRelativeTime(conv.lastMessageTime) : '';
            const unread = conv.unreadCount > 0 ? `<span class="unread-badge">${conv.unreadCount}</span>` : '';
            const online = conv.participant?.online ? '<span class="online-indicator"></span>' : '';
            
            return `
                <div class="conversation-item" data-chat="${conv._id}" onclick="chatManager.openPersonalChat('${conv._id}')">
                    ${createAvatar(conv.participant || {name}, 'md')}
                    <div class="conversation-info">
                        <div class="conversation-name">${name} ${online}</div>
                        <div class="conversation-last-message">${lastMsg}</div>
                    </div>
                    <div class="conversation-time">${time}</div>
                    ${unread}
                </div>
            `;
        }).join('');
    }
    
    openPersonalChat(chatId) {
        console.log('💬 Opening personal chat:', chatId);
        
        // Update active state
        document.querySelectorAll('.village-chat, .conversation-item').forEach(c => c.classList.remove('active'));
        const item = document.querySelector(`.conversation-item[data-chat="${chatId}"]`);
        if (item) item.classList.add('active');
        
        // Update header
        const conv = this.conversations.find(c => c._id === chatId);
        if (conv) {
            document.getElementById('currentChatName').textContent = conv.participant?.name || 'User';
            document.getElementById('chatSubtitle').textContent = 'Private Chat';
            document.getElementById('chatAvatar').innerHTML = createAvatar(conv.participant || {name: 'U'}, 'sm');
        }
        
        // Show chat on mobile
        document.getElementById('chatMain')?.classList.add('active');
        
        // Switch and load messages
        this.currentChat = chatId;
        this.loadPrivateMessages(chatId);
    }
    
    async loadPrivateMessages(chatId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/chat/${chatId}/messages`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            const data = await response.json();
            this.messages = data.messages || [];
            this.renderMessages();
        } catch (error) {
            this.messages = [];
            this.renderMessages();
        }
    }
    
    async startPersonalChat(userId) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/chat/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify({ userId })
            });
            
            const data = await response.json();
            closeNewChatModal();
            
            if (data.success) {
                await this.loadConversations();
                const conv = this.conversations.find(c => c.participant?._id === userId);
                if (conv) {
                    this.openPersonalChat(conv._id);
                }
                showToast('Chat started! 👋', 'success');
            }
        } catch (error) {
            showToast('Failed to start chat', 'error');
        }
    }
    
    // ============ MESSAGING ============
    renderMessages() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        if (!this.messages || this.messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <p>No messages yet</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        let currentDate = '';
        
        this.messages.forEach(msg => {
            const msgDate = new Date(msg.createdAt).toDateString();
            if (msgDate !== currentDate) {
                currentDate = msgDate;
                html += `<div class="message-date-divider"><span>${this.formatDate(msg.createdAt)}</span></div>`;
            }
            
            const senderId = msg.sender?._id || msg.sender;
            const isSent = senderId === this.user.id;
            const name = msg.sender?.name || 'User';
            
            html += `
                <div class="message ${isSent ? 'sent' : 'received'}">
                    <div>
                        ${!isSent ? `<div style="font-size:12px;font-weight:600;color:#2E7D32;margin-bottom:2px;">${name}</div>` : ''}
                        <div class="message-content">${msg.content || ''}</div>
                        <div class="message-time">${formatRelativeTime(msg.createdAt)}</div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }
    
    formatDate(date) {
        const d = new Date(date);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }
    
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        if (!content) return;
        
        input.value = '';
        
        try {
            const endpoint = this.currentChat === 'village'
                ? `${this.API_BASE_URL}/chat/village/send`
                : `${this.API_BASE_URL}/chat/${this.currentChat}/send`;
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.user.token}`
                },
                body: JSON.stringify({ content, chatId: this.currentChat })
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (this.currentChat === 'village') {
                    await this.loadVillageMessages();
                } else {
                    await this.loadPrivateMessages(this.currentChat);
                }
                await this.loadConversations();
            }
        } catch (error) {
            showToast('Failed to send', 'error');
        }
    }
    
    // ============ SEARCH ============
    filterChats(query) {
        if (!query) {
            this.renderConversations();
            return;
        }
        const filtered = this.conversations.filter(c => 
            c.participant?.name?.toLowerCase().includes(query.toLowerCase())
        );
        const container = document.getElementById('individualChats');
        if (!container) return;
        
        container.innerHTML = filtered.map(conv => {
            const name = conv.participant?.name || 'User';
            return `
                <div class="conversation-item" data-chat="${conv._id}" onclick="chatManager.openPersonalChat('${conv._id}')">
                    ${createAvatar(conv.participant || {name}, 'md')}
                    <div class="conversation-info">
                        <div class="conversation-name">${name}</div>
                        <div class="conversation-last-message">${conv.lastMessage || 'Start a conversation'}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    openNewChatModal() {
        document.getElementById('newChatModal').style.display = 'flex';
        document.getElementById('userSearchInput').focus();
    }
    
    async searchUsers(query) {
        if (query.length < 2) {
            document.getElementById('userSearchResults').innerHTML = '';
            return;
        }
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/users/search?q=${query}`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            const data = await response.json();
            
            const container = document.getElementById('userSearchResults');
            if (data.users?.length > 0) {
                container.innerHTML = data.users.map(user => `
                    <div onclick="chatManager.startPersonalChat('${user._id}')" style="padding:12px;display:flex;align-items:center;gap:12px;cursor:pointer;border-radius:12px;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='transparent'">
                        ${createAvatar(user, 'md')}
                        <div style="flex:1;font-weight:500;">${user.name}</div>
                        <i class="fas fa-chevron-right" style="color:#ccc;"></i>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p style="text-align:center;padding:20px;color:#999;">No users found</p>';
            }
        } catch (error) {}
    }
}

// ============ GLOBAL ============
let chatManager;

function closeNewChatModal() {
    document.getElementById('newChatModal').style.display = 'none';
    document.getElementById('userSearchInput').value = '';
    document.getElementById('userSearchResults').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
    chatManager = new ChatManager();
    window.chatManager = chatManager;
});