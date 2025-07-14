import axios from 'axios';

// Point to your NestJS backend
const api = axios.create({
  baseURL: '/api',
  headers: { 
    'Content-Type': 'application/json',
    'X-API-Key': process.env.API_KEY // Add API key
  },
});

// Add request interceptor for error handling
api.interceptors.request.use(
  (config) => {
    // Add API key to all requests
    config.headers['X-API-Key'] = import.meta.env.VITE_API_KEY; ;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Authentication failed. Please check your API key.');
    }
    return Promise.reject(error);
  }
);

export default api;
