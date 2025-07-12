import axios from 'axios';

// Point to your NestJS backend
const api = axios.create({
  baseURL: '/api',
  headers: { 
    'Content-Type': 'application/json'
  },
});

// Add request interceptor for error handling
api.interceptors.request.use(
  (config) => {
    // Add any common headers here if needed
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
    // Handle rate limiting
    if (error.response?.status === 429) {
      console.error('Rate limit exceeded. Please wait before making more requests.');
    }
    
    // Handle validation errors
    if (error.response?.status === 400) {
      console.error('Validation error:', error.response.data);
    }
    
    // Handle server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

export default api;
