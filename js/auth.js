/**
 * Smart Panchayat System - Authentication Module
 * Complete Fixed Version - Works with Real Backend
 */

class AuthManager {
    constructor() {
        this.currentTab = 'login';
        this.otpVerified = false;
        this.otpTimer = null;
        this.otpTimeLeft = 120;
        this.resendDelay = 30;
       this.API_BASE_URL = 'https://smart-panchayat-backend.onrender.com/api';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupOTPInputs();
        this.checkExistingSession();
    }
    
    setupEventListeners() {
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        document.getElementById('signupBtn')?.addEventListener('click', () => {
            this.handleSignup();
        });
        
        document.getElementById('verifyOtpBtn')?.addEventListener('click', () => {
            this.verifyOTP();
        });
        
        document.getElementById('resendOtpBtn')?.addEventListener('click', () => {
            this.resendOTP();
        });
        
        document.getElementById('signupPassword')?.addEventListener('input', (e) => {
            this.checkPasswordStrength(e.target.value);
        });
        
        document.getElementById('signupConfirmPassword')?.addEventListener('input', () => {
            this.validatePasswordMatch();
        });
        
        document.getElementById('signupPhone')?.addEventListener('input', (e) => {
            this.validatePhoneNumber(e.target);
        });
        
        document.getElementById('loginPhone')?.addEventListener('input', (e) => {
            this.validatePhoneNumber(e.target);
        });
        
        document.getElementById('signupPhoto')?.addEventListener('change', (e) => {
            this.previewProfilePhoto(e.target);
        });
    }
    
    setupOTPInputs() {
        const otpInputs = document.querySelectorAll('.otp-input');
        
        otpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                    otpInputs[index + 1].focus();
                }
                
                const allFilled = Array.from(otpInputs).every(inp => inp.value.length === 1);
                if (allFilled) {
                    this.verifyOTP();
                }
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !e.target.value && index > 0) {
                    otpInputs[index - 1].focus();
                }
            });
            
            input.addEventListener('beforeinput', (e) => {
                if (e.data && !/^\d+$/.test(e.data)) {
                    e.preventDefault();
                }
            });
        });
    }
    
    switchTab(tab) {
        this.currentTab = tab;
        
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        
        document.getElementById('loginForm').classList.toggle('active', tab === 'login');
        document.getElementById('signupForm').classList.toggle('active', tab === 'signup');
        
        if (tab === 'login') {
            this.resetOTPSection();
        }
    }
    
    async handleLogin() {
        const phone = document.getElementById('loginPhone').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;
        
        if (!this.validatePhoneNumber(document.getElementById('loginPhone'))) {
            showToast('Please enter a valid 10-digit phone number', 'error');
            return;
        }
        
        if (!password) {
            showToast('Please enter your password', 'error');
            return;
        }
        
        const submitBtn = document.querySelector('#loginForm button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Store user data
                const userData = {
                    id: data.user?.id || data.user?._id || ('user_' + Date.now()),
                    name: data.user?.name || 'User',
                    phone: phone,
                    role: data.user?.role || 'user',
                    token: data.token,
                    verified: data.user?.isVerified || data.user?.verified || true
                    
                };
                
               // Always save to localStorage
localStorage.setItem('panchayat_user', JSON.stringify(userData));
                
                showToast('Login successful! Redirecting...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                showToast(data.message || 'Invalid credentials', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('Cannot connect to server. Is backend running?', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
    
   async handleSignup() {
    const name = document.getElementById('signupName').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    const occupation = document.getElementById('signupOccupation').value;
    const termsAccepted = document.getElementById('termsCheck').checked;
    
    if (!name || name.length < 3) {
        showToast('Please enter your full name (minimum 3 characters)', 'error');
        return;
    }
    
    if (!this.validatePhoneNumber(document.getElementById('signupPhone'))) {
        showToast('Please enter a valid 10-digit phone number', 'error');
        return;
    }
    
    if (!this.validatePasswordStrength(password)) {
        showToast('Password must be at least 6 characters with letters and numbers', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (!occupation) {
        showToast('Please select your occupation', 'error');
        return;
    }
    
    if (!termsAccepted) {
        showToast('Please accept the Terms of Service', 'error');
        return;
    }
    
    const submitBtn = document.querySelector('#signupForm button[type="submit"]') || document.getElementById('signupBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${this.API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, password, occupation })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const userData = {
                id: data.user.id,
                name: data.user.name,
                phone: data.user.phone,
                role: data.user.role,
                token: data.token,
                verified: true,
                isProvider: data.user.isProvider
            };
            
            sessionStorage.setItem('panchayat_user', JSON.stringify(userData));
            
            showToast('Account created! Redirecting...', 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showToast(data.message || 'Failed to create account', 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}
    
    async completeSignup(tempData) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: tempData.name,
                    phone: tempData.phone,
                    password: tempData.password,
                    occupation: tempData.occupation
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('Account created! Redirecting...', 'success');
                sessionStorage.removeItem('temp_signup_data');
                
                const userData = {
                    id: data.user.id || data.user._id,
                    name: data.user.name,
                    phone: data.user.phone,
                    role: data.user.role,
                    token: data.token,
                    verified: true
                };
                
                sessionStorage.setItem('panchayat_user', JSON.stringify(userData));
                
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else {
                showToast(data.message || 'Failed to create account', 'error');
                this.resetOTPSection();
            }
        } catch (error) {
            console.error('Signup error:', error);
            showToast('Network error. Please try again.', 'error');
            this.resetOTPSection();
        }
    }
    
    startOTPTimer() {
        this.otpTimeLeft = 120;
        const timerElement = document.getElementById('timer');
        const resendBtn = document.getElementById('resendOtpBtn');
        
        this.updateTimerDisplay(timerElement);
        resendBtn.disabled = true;
        
        this.otpTimer = setInterval(() => {
            this.otpTimeLeft--;
            this.updateTimerDisplay(timerElement);
            
            if (this.otpTimeLeft <= 90) {
                resendBtn.disabled = false;
            }
            
            if (this.otpTimeLeft <= 0) {
                clearInterval(this.otpTimer);
                timerElement.textContent = '00:00';
                showToast('Verification code expired. Please request a new one.', 'warning');
                
                setTimeout(() => {
                    if (!this.otpVerified) {
                        this.resetOTPSection();
                    }
                }, 5000);
            }
        }, 1000);
    }
    
    updateTimerDisplay(element) {
        const minutes = Math.floor(this.otpTimeLeft / 60);
        const seconds = this.otpTimeLeft % 60;
        element.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    async resendOTP() {
        const tempData = JSON.parse(sessionStorage.getItem('temp_signup_data'));
        
        if (!tempData) {
            showToast('Session expired. Please sign up again.', 'error');
            this.resetOTPSection();
            return;
        }
        
        const resendBtn = document.getElementById('resendOtpBtn');
        resendBtn.disabled = true;
        resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/send-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: tempData.phone })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('New verification code sent!', 'success');
                resendBtn.innerHTML = 'Resend Code';
                
                clearInterval(this.otpTimer);
                this.otpTimeLeft = 120;
                this.startOTPTimer();
                
                document.querySelectorAll('.otp-input').forEach(input => input.value = '');
            } else {
                showToast(data.message || 'Failed to resend code', 'error');
                resendBtn.disabled = false;
                resendBtn.innerHTML = 'Resend Code';
            }
        } catch (error) {
            console.error('Resend error:', error);
            showToast('Network error. Please try again.', 'error');
            resendBtn.disabled = false;
            resendBtn.innerHTML = 'Resend Code';
        }
    }
    
    resetOTPSection() {
        clearInterval(this.otpTimer);
        this.otpVerified = false;
        
        document.getElementById('otpSection').classList.remove('active');
        document.getElementById('signupBtn').style.display = 'block';
        document.getElementById('verifyOtpBtn').style.display = 'none';
        
        document.querySelectorAll('.otp-input').forEach(input => input.value = '');
    }
    
    validatePhoneNumber(input) {
        const phone = input.value.trim();
        const isValid = /^[0-9]{10}$/.test(phone);
        
        if (!isValid && input.value) {
            input.classList.add('error');
            
            let errorEl = input.parentElement.parentElement.querySelector('.form-error');
            if (!errorEl) {
                errorEl = document.createElement('div');
                errorEl.className = 'form-error';
                input.parentElement.parentElement.appendChild(errorEl);
            }
            errorEl.textContent = 'Please enter a valid 10-digit phone number';
        } else {
            input.classList.remove('error');
            input.classList.add('success');
            
            const errorEl = input.parentElement.parentElement.querySelector('.form-error');
            if (errorEl) errorEl.remove();
        }
        
        return isValid;
    }
    
    checkPasswordStrength(password) {
        const strengthChecks = {
            length: password.length >= 6,
            hasNumber: /\d/.test(password),
            hasLetter: /[a-zA-Z]/.test(password),
            hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };
        
        const strength = Object.values(strengthChecks).filter(Boolean).length;
        
        let indicator = document.getElementById('passwordStrength');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'passwordStrength';
            indicator.className = 'password-strength mt-xs';
            document.getElementById('signupPassword').parentElement.parentElement.appendChild(indicator);
        }
        
        const strengthText = ['Weak', 'Fair', 'Good', 'Strong'][strength - 1] || '';
        const strengthColor = ['#D32F2F', '#FFA000', '#4CAF50', '#2E7D32'][strength - 1] || '';
        
        indicator.innerHTML = `
            <div class="strength-bar" style="width: ${strength * 25}%; background: ${strengthColor};"></div>
            <span class="strength-text" style="color: ${strengthColor};">${strengthText}</span>
        `;
        
        return strength >= 2;
    }
    
    validatePasswordStrength(password) {
        return password.length >= 6 && /\d/.test(password) && /[a-zA-Z]/.test(password);
    }
    
    validatePasswordMatch() {
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupConfirmPassword').value;
        const confirmInput = document.getElementById('signupConfirmPassword');
        
        if (confirmPassword && password !== confirmPassword) {
            confirmInput.classList.add('error');
            
            let errorEl = confirmInput.parentElement.parentElement.querySelector('.form-error');
            if (!errorEl) {
                errorEl = document.createElement('div');
                errorEl.className = 'form-error';
                confirmInput.parentElement.parentElement.appendChild(errorEl);
            }
            errorEl.textContent = 'Passwords do not match';
            
            return false;
        } else {
            confirmInput.classList.remove('error');
            confirmInput.classList.add('success');
            
            const errorEl = confirmInput.parentElement.parentElement.querySelector('.form-error');
            if (errorEl) errorEl.remove();
            
            return true;
        }
    }
    
    previewProfilePhoto(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                let preview = document.getElementById('photoPreview');
                if (!preview) {
                    preview = document.createElement('div');
                    preview.id = 'photoPreview';
                    preview.className = 'flex items-center gap-md mt-sm';
                    input.parentElement.appendChild(preview);
                }
                
                preview.innerHTML = `
                    <img src="${e.target.result}" class="avatar avatar-lg" alt="Profile preview">
                    <span class="text-sm text-gray-600">${input.files[0].name}</span>
                    <button type="button" class="btn btn-sm btn-outline" onclick="document.getElementById('signupPhoto').value = ''; document.getElementById('photoPreview').remove();">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            };
            
            reader.readAsDataURL(input.files[0]);
        }
    }
    
    checkExistingSession() {
        const userData = localStorage.getItem('panchayat_user') || sessionStorage.getItem('panchayat_user');
        
        if (userData) {
            const user = JSON.parse(userData);
            
            if (user.token) {
                const authCard = document.querySelector('.auth-card');
                if (authCard) {
                    const continueBanner = document.createElement('div');
                    continueBanner.className = 'alert alert-info mb-md';
                    continueBanner.innerHTML = `
                        <i class="fas fa-user-check"></i>
                        Continue as <strong>${user.name}</strong>
                        <a href="dashboard.html" class="btn btn-sm btn-primary ml-md">Go to Dashboard</a>
                        <button class="btn btn-sm btn-outline ml-sm" onclick="authManager.logout()">Logout</button>
                    `;
                    authCard.insertBefore(continueBanner, authCard.firstChild);
                }
            }
        }
    }
    
    logout() {
        localStorage.removeItem('panchayat_user');
        sessionStorage.removeItem('panchayat_user');
        window.location.reload();
    }
}

let authManager;
document.addEventListener('DOMContentLoaded', () => {
    authManager = new AuthManager();
});