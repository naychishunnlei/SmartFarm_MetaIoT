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

// Modal Functions
function openLoginModal() {
    loginModal.classList.add('active');
    registerModal.classList.remove('active');
}

function openRegisterModal() {
    registerModal.classList.add('active');
    loginModal.classList.remove('active');
}

function closeAllModals() {
    loginModal.classList.remove('active');
    registerModal.classList.remove('active');
}

// Event Listeners for Opening Modals
loginBtn.addEventListener('click', openLoginModal);
registerBtn.addEventListener('click', openRegisterModal);
getStartedBtn.addEventListener('click', openLoginModal);

// Event Listeners for Closing Modals
loginClose.addEventListener('click', closeAllModals);
registerClose.addEventListener('click', closeAllModals);

// Switch between Login and Register
switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    openRegisterModal();
});

switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    openLoginModal();
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === loginModal) {
        closeAllModals();
    }
    if (event.target === registerModal) {
        closeAllModals();
    }
});

// --- API Integration ---
const API_BASE_URL = 'http://localhost:5001/api'; // Ensure this port matches your backend

// Handle Login Form Submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Login failed.');
        }
        
        // On successful login, save the token and user info
        localStorage.setItem('farmverseToken', result.token);
        localStorage.setItem('farmverseUser', JSON.stringify(result.user));
        
        alert('Login successful! Redirecting...');
        
        // Redirect to the map page
        window.location.href = 'map.html';
        
    } catch (error) {
        // Show the specific error message from the backend
        alert(`Login failed: ${error.message}`);
    }
    
    loginForm.reset();
});

// Handle Register Form Submission
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    const agreeTerms = document.querySelector('.checkbox input[type="checkbox"]').checked;
    
    // --- Client-side validation ---
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
    // --- End of validation ---

    try {
        const response = await fetch(`${API_BASE_URL}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Registration failed.');
        }

        alert('Account created successfully! Please log in.');
        
        // Reset form and switch to the login modal for a smooth user experience
        registerForm.reset();
        openLoginModal();

    } catch (error) {
        // Show the specific error from the backend (e.g., "email already exists")
        alert(`Registration failed: ${error.message}`);
    }
});

// Smooth scroll for navigation links
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

// Contact Form Submission
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log('Contact form submitted.');
        alert('Thank you for your message! We will get back to you soon.');
        contactForm.reset();
    });
}

// Check if user is logged in on page load
window.addEventListener('load', () => {
    const token = localStorage.getItem('farmverseToken');
    if (token) {
        console.log('User is logged in.');
        // You could potentially update the UI here to show a "Logout" button instead of "Login"
    }
});

// Logout function (can be used from other pages)
function logout() {
    // Clear the authentication token and user info
    localStorage.removeItem('farmverseToken');
    localStorage.removeItem('farmverseUser');
    
    // Redirect to the home page
    window.location.href = 'index.html';
}

// Make the logout function globally accessible
window.logout = logout;