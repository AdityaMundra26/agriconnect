import apiClient from './client.js';

export const askAssistant = (question) =>
  apiClient.post('/assistant/query', { question }).then((res) => res.data);
