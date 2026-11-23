import apiClient from './client.js';

export const listReports = (params) => apiClient.get('/reports', { params }).then((res) => res.data.reports);
export const getReport = (id) => apiClient.get(`/reports/${id}`).then((res) => res.data);
export const createReport = (data) => apiClient.post('/reports', data, { timeout: 60000 }).then((res) => res.data.report);
export const updateReportStatus = (id, status, note) =>
  apiClient.put(`/reports/${id}/status`, { status, note }).then((res) => res.data.report);
