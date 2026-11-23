import apiClient from './client.js';

export const registerUser = (data) => apiClient.post('/auth/register', data).then((res) => res.data);
export const loginUser = (data) => apiClient.post('/auth/login', data).then((res) => res.data);
export const fetchMe = () => apiClient.get('/auth/me').then((res) => res.data);
export const updateMe = (data) => apiClient.put('/auth/me', data).then((res) => res.data.user);
export const sendTestAlert = (channel) => apiClient.post('/auth/me/test-alert', { channel }).then((res) => res.data.alert);
