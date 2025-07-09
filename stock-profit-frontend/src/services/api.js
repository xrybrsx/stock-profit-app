import axios from 'axios';

// Point to your NestJS backend
export default axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});
