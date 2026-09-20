import apiClient from './client.js';

export const registerUser = (data) => apiClient.post('/auth/register', data).then((res) => res.data);
export const loginUser = (data) => apiClient.post('/auth/login', data).then((res) => res.data);
export const fetchMe = () => apiClient.get('/auth/me').then((res) => res.data);
