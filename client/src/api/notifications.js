import apiClient from './client.js';

export const listNotifications = () => apiClient.get('/notifications').then((res) => res.data);
export const markNotificationRead = (id) => apiClient.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => apiClient.put('/notifications/read-all');
