const API_BASE_URL = 'http://localhost:5001/api'; 

async function request(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('farmverseToken');

    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    }

    const config = {
        method,
        headers,
    };

    if (data) {
        config.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, config);
        const responseData = await response.json();

        if (!response.ok) {
            // If the server returns an error (e.g., 400, 401), throw it
            throw new Error(responseData.message || 'An unknown error occurred.');
        }

        return responseData;
    } catch (error) {
        console.error(`API Error on ${method} ${endpoint}:`, error);
        throw error; // Re-throw the error to be caught by the calling function
    }
}

// --- User Endpoints ---
export const registerUser = (userData) => request('/users/register', 'POST', userData);
export const loginUser = (credentials) => request('/users/login', 'POST', credentials);
export const getUserProfile = () => request('/users/profile', 'GET');

export const createObject = (farmId, objectData) => request(`/farms/${farmId}/objects`, 'POST', objectData);
export const getObjectsForFarm = (farmId) => request(`/farms/${farmId}/objects`, 'GET')
export const deleteObject = (farmId, objectId) => request(`/farms/${farmId}/objects/${objectId}`, 'DELETE')


export const getFarmsForUser = () => request('/farms', 'GET');
export const getOrCreateFarm = (farmData) => request('/farms', 'POST', farmData);
export const createFarm = (farmData) => request('/farms/create', 'POST', farmData);
export const deleteFarm = (farmId) => request(`/farms/${farmId}`, 'DELETE');


