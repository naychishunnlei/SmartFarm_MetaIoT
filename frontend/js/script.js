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

// Handle Login Form Submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Validate inputs
    if (!email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    // Here you would typically send data to backend
    console.log('Login attempt:', { email, password });
    
    // Simulate successful login
    alert('Login successful! Redirecting...');
    
    // Store user session (in real app, this would be handled by backend)
    localStorage.setItem('userEmail', email);
    localStorage.setItem('isLoggedIn', 'true');
    
    // Redirect to map page to select farm location
    window.location.href = 'map.html';
    
    // Reset form
    loginForm.reset();
});

// Handle Register Form Submission
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    const agreeTerms = document.querySelector('.checkbox input[type="checkbox"]').checked;
    
    // Validate inputs
    if (!name || !email || !password || !confirmPassword) {
        alert('Please fill in all fields');
        return;
    }
    
    // Validate password match
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    // Validate password strength
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }
    
    // Validate terms agreement
    if (!agreeTerms) {
        alert('Please agree to the Terms of Service and Privacy Policy');
        return;
    }
    
    // Here you would typically send data to backend
    console.log('Registration attempt:', { name, email, password });
    
    // Simulate successful registration
    alert('Account created successfully! Please log in.');
    
    // Store user data (in real app, this would be handled by backend)
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', name);
    
    // Reset form and open login modal
    registerForm.reset();
    openLoginModal();
});

// Smooth scroll for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Skip if href is just "#" or empty
        if (href === '#' || href === '') {
            return;
        }
        
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
        
        const inputs = contactForm.querySelectorAll('input, textarea');
        const formData = {};
        
        inputs.forEach(input => {
            if (input.name) {
                formData[input.name] = input.value;
            }
        });
        
        // Simulate form submission
        console.log('Contact form submitted:', formData);
        alert('Thank you for your message! We will get back to you soon.');
        
        // Reset form
        contactForm.reset();
    });
}

// Check if user is logged in on page load
window.addEventListener('load', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userName = localStorage.getItem('userName');
    
    if (isLoggedIn === 'true' && userName) {
        console.log('User is logged in:', userName);
        // You could update the UI here if needed
    }
});

// Logout function (can be used from other pages)
function logout() {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'index.html';
}

// Export logout function
window.logout = logout;
