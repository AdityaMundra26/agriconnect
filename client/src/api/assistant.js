import apiClient from './client.js';

export const askAssistant = (question, history = []) =>
  apiClient.post('/assistant/query', { question, history }, { timeout: 90000 }).then((res) => res.data);
