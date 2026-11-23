import apiClient from './client.js';

export const getDemoStatus = () => apiClient.get('/demo').then((res) => res.data);
export const enableDemo = () => apiClient.post('/demo/enable', null, { timeout: 120000 }).then((res) => res.data);
export const disableDemo = () => apiClient.post('/demo/disable', null, { timeout: 120000 }).then((res) => res.data);
