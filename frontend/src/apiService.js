const API_BASE_URL = 'http://localhost:5001/api'; 
// apiService.js - Updated request function
async function request(endpoint, method = 'GET', data = null) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('farmverseToken');

    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    if (token) {
        headers.append('Authorization', `Bearer ${token}`);
    }

    const config = { method, headers };
    if (data) config.body = JSON.stringify(data);

    try {
        const response = await fetch(url, config);

        // Check for 204 No Content first
        if (response.status === 204) return null;

        // Only parse JSON if there is content in the response
        const text = await response.text();
        const responseData = text ? JSON.parse(text) : null;

        if (!response.ok) {
            throw new Error(responseData?.message || 'An unknown error occurred.');
        }

        return responseData;
    } catch (error) {
        console.error(`API Error on ${method} ${endpoint}:`, error);
        throw error;
    }
}

// --- User Endpoints ---
export const registerUser = (userData) => request('/users/register', 'POST', userData)
export const loginUser = (credentials) => request('/users/login', 'POST', credentials)
export const getUserProfile = () => request('/users/profile', 'GET')
export const updateUserAvatar = (avatarConfig) => request('/users/avatar', 'PUT', {avatarConfig})

export const createObject = (farmId, objectData) => request(`/farms/${farmId}/objects`, 'POST', objectData)
export const getObjectsForFarm = (farmId) => request(`/farms/${farmId}/objects`, 'GET')
export const deleteObject = (farmId, objectId) => request(`/farms/${farmId}/objects/${objectId}`, 'DELETE')
export const deleteAllObjects = (farmId) => request(`/farms/${farmId}/objects`, 'DELETE')
export const updateObjectGrowth = (farmId, objectId, growth) => request(`/farms/${farmId}/objects/${objectId}/growth`, 'PUT', { growth })
export const toggleDevice = (farmId, objectId, is_running) => request(`/farms/${farmId}/objects/${objectId}/toggle`, 'PUT', { is_running })
export const updateSensorValue = (farmId, objectId, sensor_value) => request(`/farms/${farmId}/objects/${objectId}/sensor`, 'PUT', { sensor_value })
export const updateObjectPosition = (farmId, objectId, positionData) => request(`/farms/${farmId}/objects/${objectId}/position`, 'PUT', positionData)


export const getFarmsForUser = () => request('/farms', 'GET')
export const getOrCreateFarm = (farmData) => request('/farms', 'POST', farmData)
export const createFarm = (farmData) => request('/farms/create', 'POST', farmData)
export const deleteFarm = (farmId) => request(`/farms/${farmId}`, 'DELETE')


