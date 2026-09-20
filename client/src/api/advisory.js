import apiClient from './client.js';

export const getAdvisory = (plotId) =>
  apiClient.get(`/advisory/${plotId}`).then((res) => res.data.advisory);
