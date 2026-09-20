import apiClient from './client.js';

export const browseListings = (params) =>
  apiClient.get('/listings', { params }).then((res) => res.data.listings);
export const myListings = () => apiClient.get('/listings/mine').then((res) => res.data.listings);
export const adminListings = () => apiClient.get('/listings/admin').then((res) => res.data.listings);
export const createListing = (data) => apiClient.post('/listings', data).then((res) => res.data.listing);
export const updateListing = (id, data) =>
  apiClient.put(`/listings/${id}`, data).then((res) => res.data.listing);
