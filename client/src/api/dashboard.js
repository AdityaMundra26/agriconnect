import apiClient from './client.js';

export const getDashboardSummary = () => apiClient.get('/dashboard/summary').then((res) => res.data);
export const getAdminUsers = () => apiClient.get('/admin/users').then((res) => res.data.users);
export const getHealth = () => apiClient.get('/health').then((res) => res.data);
export const getAdminAlerts = () => apiClient.get('/admin/alerts').then((res) => res.data);
