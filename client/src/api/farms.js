import apiClient from './client.js';

export const getMyFarm = () => apiClient.get('/farms/me').then((res) => res.data.farm);
export const createFarm = (data) => apiClient.post('/farms', data).then((res) => res.data.farm);
export const updateFarm = (id, data) => apiClient.put(`/farms/${id}`, data).then((res) => res.data.farm);
