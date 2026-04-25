import axios from 'axios';

const host = window.location.hostname;
const api = axios.create({ baseURL: `http://${host}:5000/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
