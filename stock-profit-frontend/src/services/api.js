import axios from 'axios';

// Point to your NestJS backend
const api = axios.create({
  baseURL: '/api',
  headers: { 
    'Content-Type': 'application/json',
    'X-API-Key': import.meta.env.VITE_API_KEY  // Add API key
  },
});


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
