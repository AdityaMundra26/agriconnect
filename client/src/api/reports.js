import apiClient from './client.js';

export const listReports = () => apiClient.get('/reports').then((res) => res.data.reports);
export const getReport = (id) => apiClient.get(`/reports/${id}`).then((res) => res.data);
export const createReport = (data) => apiClient.post('/reports', data).then((res) => res.data.report);
export const updateReportStatus = (id, status) =>
  apiClient.put(`/reports/${id}/status`, { status }).then((res) => res.data.report);
