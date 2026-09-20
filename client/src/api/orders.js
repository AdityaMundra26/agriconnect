import apiClient from './client.js';

export const listOrders = () => apiClient.get('/orders').then((res) => res.data.orders);
export const createOrder = (data) => apiClient.post('/orders', data).then((res) => res.data.order);
export const updateOrderStatus = (id, status) =>
  apiClient.put(`/orders/${id}/status`, { status }).then((res) => res.data.order);
