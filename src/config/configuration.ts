export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  security: {
    apiKey: process.env.API_KEY || 'demo-api-key-2024',
  },
  
  cors: {
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://yourdomain.com']
      : ['http://localhost:5173', 'http://localhost:3000'],
  },
  
  throttler: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '10', 10),
  },
  
  validation: {
    maxFunds: parseInt(process.env.MAX_FUNDS || '1000000', 10),
    maxDateRangeDays: parseInt(process.env.MAX_DATE_RANGE_DAYS || '30', 10),
  },
}); 