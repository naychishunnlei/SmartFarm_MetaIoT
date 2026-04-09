import { loginUser, registerUser } from '../src/apiService.js';

document.addEventListener('DOMContentLoaded', () => {
    // Get all modal and button elements
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const getStartedBtn = document.getElementById('get-started-btn');
    const loginModal = document.getElementById('login-modal');
    const registerModal = document.getElementById('register-modal');
    const loginClose = document.getElementById('login-close');
    const registerClose = document.getElementById('register-close');
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // --- Modal Functions ---
    function openLoginModal() {
        console.log('Login modal opened');
        if (loginModal) loginModal.classList.add('active');
        if (registerModal) registerModal.classList.remove('active');
    }

    function openRegisterModal() {
        if (registerModal) registerModal.classList.add('active');
        if (loginModal) loginModal.classList.remove('active');
    }

    function closeAllModals() {
        if (loginModal) loginModal.classList.remove('active');
        if (registerModal) registerModal.classList.remove('active');
    }

    // Event Listeners for Opening Modals
    if (loginBtn) loginBtn.addEventListener('click', openLoginModal);
    if (registerBtn) registerBtn.addEventListener('click', openRegisterModal);
    if (getStartedBtn) getStartedBtn.addEventListener('click', openLoginModal);

    // Event Listeners for Closing Modals
    if (loginClose) loginClose.addEventListener('click', closeAllModals);
    if (registerClose) registerClose.addEventListener('click', closeAllModals);

    // Switch between Login and Register
    if (switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            openRegisterModal();
        });
    }

    if (switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            openLoginModal();
        });
    }

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target === loginModal || event.target === registerModal) {
            closeAllModals();
        }
    });

    // --- Handle Login Form Submission ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                alert('Please fill in all fields');
                return;
            }
            
            try {
                // Change button text to show it's working
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;
                submitBtn.textContent = 'Logging in...';
                submitBtn.disabled = true;

                const result = await loginUser({ email, password });
                
                console.log("BACKEND SENT THIS: ", result);
                
                // Save token and user data
                localStorage.setItem('farmverseToken', result.token);
                localStorage.setItem('farmverseUser', JSON.stringify(result.user));
                
                // 🌟 THE FIX: Route based on database 'has_avatar' flag
                if (result.user && result.user.has_avatar && result.user.has_avatar !== 'false') {
                    // Avatar exists -> Go straight to the Map
                    window.location.href = 'map.html';
                } else {
                    // No avatar -> Go to customization
                    alert("Login successful! Let's customize your avatar...");
                    window.location.href = 'avatar.html';
                }
                
            } catch (error) {
                alert(`Login failed: ${error.message}`);
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Login';
                submitBtn.disabled = false;
            }
            
            loginForm.reset();
        });
    }

    // --- Handle Register Form Submission ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm').value;
            
            const agreeTermsInput = document.querySelector('.checkbox input[type="checkbox"]');
            const agreeTerms = agreeTermsInput ? agreeTermsInput.checked : false;
            
            if (!name || !email || !password || !confirmPassword) {
                alert('Please fill in all fields');
                return;
            }
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            if (password.length < 6) {
                alert('Password must be at least 6 characters long');
                return;
            }
            if (!agreeTerms) {
                alert('Please agree to the Terms of Service and Privacy Policy');
                return;
            }

            try {
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Creating account...';
                submitBtn.disabled = true;

                await registerUser({ name, email, password });
                alert('Registration successful! Please log in.');
                registerForm.reset();
                openLoginModal();

                submitBtn.textContent = 'Create Account';
                submitBtn.disabled = false;
            } catch (error) {
                alert(`Registration failed: ${error.message}`);
                const submitBtn = registerForm.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Create Account';
                submitBtn.disabled = false;
            }
        });
    }

    // --- Smooth scroll for navigation links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // --- Contact Form Submission ---
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Contact form submitted.');
            alert('Thank you for your message! We will get back to you soon.');
            contactForm.reset();
        });
    }

});

// --- Global Logout Function ---
window.logout = function() {
    localStorage.removeItem('farmverseToken');
    localStorage.removeItem('farmverseUser');
    window.location.href = 'index.html';
};