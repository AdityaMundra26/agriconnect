import apiClient from './client.js';

export const listCropCycles = (plotId) =>
  apiClient.get('/crop-cycles', { params: plotId ? { plotId } : {} }).then((res) => res.data.cycles);
export const createCropCycle = (data) => apiClient.post('/crop-cycles', data).then((res) => res.data.cycle);
export const updateCropCycle = (id, data) => apiClient.put(`/crop-cycles/${id}`, data).then((res) => res.data.cycle);
export const deleteCropCycle = (id) => apiClient.delete(`/crop-cycles/${id}`);
