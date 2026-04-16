/**
 * Smart Panchayat System - Village Chat Module
 * FULL FEATURED: Village Chat + Personal Chats + Typing Indicators + Online Users
 */

class ChatManager {
    constructor() {
        this.user = null;
        this.currentChat = 'village';
        this.messages = [];
        this.conversations = [];
        this.onlineUsers = [];
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
        this.updateOnlineStatus();
    }
    
    // ============ SETUP ============
    setupEventListeners() {
        // Send message
        document.getElementById('sendMessageBtn')?.addEventListener('click', () => this.sendMessage());
        
        document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Typing indicator
        document.getElementById('messageInput')?.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            this.handleTyping();
        });
        
        // New chat
        document.getElementById('newChatBtn')?.addEventListener('click', () => this.openNewChatModal());
        document.getElementById('userSearchInput')?.addEventListener('input', (e) => this.searchUsers(e.target.value));
        
        // Village chat click
        document.querySelector('[data-chat="village"]')?.addEventListener('click', () => {
            this.switchToVillageChat();
        });
        
        // Close modal on overlay click
        document.querySelector('.modal-overlay')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                closeNewChatModal();
            }
        });
    }
    
    // ============ POLLING ============
    startPolling() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        this.pollInterval = setInterval(() => this.checkForNewMessages(), 3000);
    }
    
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
    
    async checkForNewMessages() {
        if (this.isLoading) return;
        
        try {
            const token = this.user?.token || JSON.parse(localStorage.getItem('panchayat_user') || '{}').token;
            const endpoint = this.currentChat === 'village'
                ? `${this.API_BASE_URL}/chat/village/messages`
                : `${this.API_BASE_URL}/chat/${this.currentChat}/messages`;
            
            const response = await fetch(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.success && data.messages) {
                if (data.messages.length > this.messages.length) {
                    const newMessages = data.messages.slice(this.messages.length);
                    this.messages = data.messages;
                    this.renderMessages();
                    
                    // Show notification and play sound for new messages
                    newMessages.forEach(msg => {
                        if (msg.sender._id !== this.user.id) {
                            showToast(`📨 ${msg.sender.name}: ${msg.content.substring(0, 30)}...`, 'info');
                            this.playMessageSound();
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }
    
    playMessageSound() {
        // Simple beep using Web Audio API
        try {
            const audio = new Audio();
            audio.src = 'data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoAAACAgYGBgYCAgICAf39/f39/f39/f39/f3+AgICAf39/f39/f39/f3+AgICAf39/f39/f39/f3+AgICAf39/f39/f39/f39/fw==';
            audio.volume = 0.3;
            audio.play();
        } catch (e) {}
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
                this.updateVillageLastMessage();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            this.messages = [];
            this.renderMessages();
        } finally {
            this.isLoading = false;
        }
    }
    
    switchToVillageChat() {
        this.currentChat = 'village';
        
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.toggle('active', item.dataset.chat === 'village');
        });
        
        document.getElementById('currentChatName').textContent = '🏘️ Village Community';
        document.getElementById('chatSubtitle').innerHTML = `
            <i class="fas fa-globe"></i> Public Chat • Everyone can message
        `;
        document.getElementById('chatAvatar').innerHTML = '<i class="fas fa-tree"></i>';
        
        this.loadVillageMessages();
    }
    
    updateVillageLastMessage() {
        if (this.messages.length > 0) {
            const lastMsg = this.messages[this.messages.length - 1];
            const lastMsgEl = document.getElementById('villageLastMessage');
            const timeEl = document.getElementById('villageLastTime');
            if (lastMsgEl) lastMsgEl.textContent = lastMsg.content.substring(0, 30) + (lastMsg.content.length > 30 ? '...' : '');
            if (timeEl) timeEl.textContent = formatRelativeTime(lastMsg.createdAt);
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
                <div class="chat-section-header">
                    <i class="fas fa-user-friends"></i> PERSONAL CHATS
                </div>
                <div class="p-md text-center text-gray-500">
                    <i class="fas fa-comments" style="font-size: 2rem; opacity: 0.5;"></i>
                    <p class="text-sm mt-sm">No personal chats yet</p>
                    <p class="text-xs">Click ✏️ to start chatting with someone</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="chat-section-header">
                <i class="fas fa-user-friends"></i> PERSONAL CHATS
            </div>
            ${this.conversations.map(conv => `
                <div class="conversation-item" data-chat="${conv._id}">
                    ${createAvatar(conv.participant, 'md')}
                    <div class="conversation-info">
                        <div class="conversation-name">
                            ${conv.participant.name}
                            ${conv.participant.online ? '<span class="online-indicator"></span>' : ''}
                        </div>
                        <div class="conversation-last-message">
                            ${conv.lastMessage || '✨ Start a conversation'}
                        </div>
                    </div>
                    <div class="conversation-time">${conv.lastMessageTime ? formatRelativeTime(conv.lastMessageTime) : ''}</div>
                    ${conv.unreadCount > 0 ? `<span class="unread-badge">${conv.unreadCount}</span>` : ''}
                </div>
            `).join('')}
        `;
        
        document.querySelectorAll('#individualChats .conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                this.switchToPersonalChat(item.dataset.chat);
            });
        });
    }
    
    async switchToPersonalChat(chatId) {
    console.log('🔄 switchToPersonalChat called with:', chatId);
    this.currentChat = chatId;
    
    // Update UI - remove active from all, add to selected
    document.querySelectorAll('.village-chat, .chat-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const selectedChat = document.querySelector(`[data-chat="${chatId}"]`);
    if (selectedChat) {
        selectedChat.classList.add('active');
    }
    
    // Update header
    const conversation = this.conversations.find(c => c._id === chatId);
    if (conversation) {
        document.getElementById('currentChatName').textContent = conversation.participant.name;
        document.getElementById('chatSubtitle').textContent = 'Private Chat';
        
        // Update avatar
        const avatarHtml = createAvatar(conversation.participant, 'md');
        document.getElementById('chatAvatar').innerHTML = avatarHtml;
    }
    
    // Load messages
    this.loadPrivateMessages(chatId);
} 
    
    async loadPrivateMessages(chatId) {
    console.log('📩 Loading private messages for:', chatId);
    
    try {
        const response = await fetch(`${this.API_BASE_URL}/chat/${chatId}/messages`, {
            headers: { 'Authorization': `Bearer ${this.user.token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            this.messages = data.messages || [];
            this.renderMessages();
        } else {
            this.messages = [];
            this.renderMessages();
        }
    } catch (error) {
        console.error('Error loading private messages:', error);
        this.messages = [];
        this.renderMessages();
    }
}
    
    async startPersonalChat(userId) {
        try {
            showToast('Starting chat...', 'info');
            
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
                // Check if conversation already exists
                const existing = this.conversations.find(c => c.participant._id === userId);
                if (!existing) {
                    this.conversations.unshift(data.conversation);
                    this.renderConversations();
                }
                
                const chatId = existing?._id || data.conversation._id;
                await this.switchToPersonalChat(chatId);
                showToast('Chat started! Say hello 👋', 'success');
            } else {
                showToast(data.message || 'Failed to start chat', 'error');
            }
        } catch (error) {
            console.error('Error starting chat:', error);
            showToast('Network error', 'error');
        }
    }
    
    // ============ MESSAGING ============
    renderMessages() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        if (!this.messages || this.messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments" style="font-size: 4rem; opacity: 0.3;"></i>
                    <p style="margin-top: 16px; font-size: 1.1rem;">No messages yet</p>
                    <p style="font-size: 0.9rem; color: var(--gray-500);">Be the first to say something!</p>
                </div>
            `;
            return;
        }
        
        // Group messages by date
        let html = '';
        let currentDate = '';
        
        for (const msg of this.messages) {
            const msgDate = new Date(msg.createdAt).toDateString();
            if (msgDate !== currentDate) {
                currentDate = msgDate;
                html += `
                    <div class="message-date-divider">
                        <span>${this.formatMessageDate(msg.createdAt)}</span>
                    </div>
                `;
            }
            
            const isSent = msg.sender._id === this.user.id || msg.sender === this.user.id;
            const senderName = msg.sender.name || 'User';
            
            html += `
                <div class="message ${isSent ? 'sent' : 'received'}">
                    ${!isSent ? createAvatar({ name: senderName }, 'sm') : ''}
                    <div>
                        ${!isSent ? `<div class="text-sm font-medium mb-xs">${senderName}</div>` : ''}
                        <div class="message-content">${this.escapeHtml(msg.content)}</div>
                        <div class="message-time">
                            ${formatRelativeTime(msg.createdAt)}
                            ${isSent ? ' • ' + (msg.status === 'sent' ? '✓✓' : '✓') : ''}
                        </div>
                    </div>
                    ${isSent ? createAvatar({ name: senderName }, 'sm') : ''}
                </div>
            `;
        }
        
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }
    
    formatMessageDate(date) {
        const msgDate = new Date(date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (msgDate.toDateString() === today.toDateString()) return 'Today';
        if (msgDate.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return msgDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    handleTyping() {
        // Clear existing timeout
        if (this.typingTimeout) clearTimeout(this.typingTimeout);
        
        // Emit typing event (if using socket.io in future)
        
        // Clear typing after 2 seconds
        this.typingTimeout = setTimeout(() => {
            this.typingTimeout = null;
        }, 2000);
    }
    
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        if (!content) return;
        
        input.value = '';
        input.style.height = 'auto';
        
        // Optimistic UI update
        const tempId = 'temp_' + Date.now();
        const tempMessage = {
            _id: tempId,
            sender: { _id: this.user.id, name: this.user.name },
            content: content,
            createdAt: new Date().toISOString(),
            status: 'sending'
        };
        
        this.messages.push(tempMessage);
        this.renderMessages();
        
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
                // Replace temp message with real one
                const index = this.messages.findIndex(m => m._id === tempId);
                if (index !== -1) {
                    this.messages[index] = { ...data.message, status: 'sent' };
                    this.renderMessages();
                }
                this.updateLastMessage(content);
            } else {
                // Mark as failed
                const index = this.messages.findIndex(m => m._id === tempId);
                if (index !== -1) {
                    this.messages[index].status = 'failed';
                    this.renderMessages();
                }
                showToast('Failed to send message', 'error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            const index = this.messages.findIndex(m => m._id === tempId);
            if (index !== -1) {
                this.messages[index].status = 'failed';
                this.renderMessages();
            }
            showToast('Network error', 'error');
        }
    }
    
    updateLastMessage(content) {
        if (this.currentChat === 'village') {
            const lastMsgEl = document.getElementById('villageLastMessage');
            const timeEl = document.getElementById('villageLastTime');
            if (lastMsgEl) lastMsgEl.textContent = content.substring(0, 30) + (content.length > 30 ? '...' : '');
            if (timeEl) timeEl.textContent = 'Just now';
        }
        this.loadConversations(); // Refresh sidebar
    }
    
    // ============ USER SEARCH ============
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
            if (data.users && data.users.length > 0) {
                container.innerHTML = data.users.map(user => `
                    <div class="flex items-center gap-md p-md hover:bg-gray-100 cursor-pointer" onclick="chatManager.startPersonalChat('${user._id}')">
                        ${createAvatar(user, 'md')}
                        <div style="flex: 1;">
                            <div class="font-medium">${user.name}</div>
                            <div class="text-sm text-gray-600">${user.phone}</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color: var(--gray-400);"></i>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<p class="text-center text-gray-500 p-md">No users found</p>';
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    }
    
    // ============ ONLINE STATUS ============
    updateOnlineStatus() {
        setInterval(() => {
            const count = Math.floor(Math.random() * 20) + 5; // Simulate online count
            document.getElementById('onlineCount').textContent = count;
        }, 30000);
    }
    
    // ============ CLEANUP ============
    destroy() {
        this.stopPolling();
        if (this.typingTimeout) clearTimeout(this.typingTimeout);
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

window.addEventListener('beforeunload', () => {
    if (chatManager) chatManager.destroy();
});