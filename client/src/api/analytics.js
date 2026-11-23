import apiClient from './client.js';

export const getReportsAnalytics = () => apiClient.get('/analytics/reports').then((res) => res.data);
export const getMarketplaceAnalytics = () => apiClient.get('/analytics/marketplace').then((res) => res.data);
export const getYieldAnalytics = () => apiClient.get('/analytics/yield').then((res) => res.data);
