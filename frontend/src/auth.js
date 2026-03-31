import { registerUser, loginUser } from './apiService.js';

/**
 * Handles the user registration form submission.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} The server response.
 */
export async function handleRegister(name, email, password) {
    try {
        const response = await registerUser({ name, email, password });
        // On successful registration, you might want to automatically log them in
        // or just show a success message and ask them to log in.
        alert('Registration successful! Please log in.');
        return response;
    } catch (error) {
        // The error from apiService is caught here
        alert(`Registration failed: ${error.message}`);
        throw error;
    }
}

/**
 * Handles the user login form submission.
 * @param {string} email
 * @param {string} password
 */
export async function handleLogin(email, password) {
    try {
        const response = await loginUser({ email, password });

        // IMPORTANT: Save the token and user info to localStorage
        localStorage.setItem('farmverseToken', response.token);
        localStorage.setItem('farmverseUser', JSON.stringify(response.user));

        alert('Login successful!');
        
        // Redirect to the main application page (e.g., the map)
        window.location.href = '/map.html'; // Or whatever your main page is

    } catch (error) {
        alert(`Login failed: ${error.message}`);
        throw error;
    }
}

/**
 * Logs the user out by clearing localStorage and redirecting.
 */
export function handleLogout() {
    localStorage.removeItem('farmverseToken');
    localStorage.removeItem('farmverseUser');
    alert('You have been logged out.');
    window.location.href = '/index.html'; // Redirect to the home/login page
}