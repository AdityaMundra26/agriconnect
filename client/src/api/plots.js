import apiClient from './client.js';

export const listPlots = () => apiClient.get('/plots').then((res) => res.data.plots);
export const createPlot = (data) => apiClient.post('/plots', data).then((res) => res.data.plot);
export const updatePlot = (id, data) => apiClient.put(`/plots/${id}`, data).then((res) => res.data.plot);
export const deletePlot = (id) => apiClient.delete(`/plots/${id}`);
