# Stock Profit Calculator

## Live Demo
**Azure Website:** https://stock-profit-app-a3abcnb0erhdgyev.westeurope-01.azurewebsites.net/

## Project Overview

A web application that calculates the optimal buy/sell strategy for a given stock price dataset. 

The application includes:
- Backend API built with NestJS and TypeScript
- Frontend built with Vue.js and Highcharts
- API key authentication and rate limiting
- Deployment on Azure App Service and CI/CD with GitHub Actions

## Features

### Core Functionality
- **Profit Calculation**: Finds the best buy/sell points in a given time range using an optimized algorithm
- **Interactive Charts**: Visualizes price data with buy/sell markers using Highcharts

### Technical Features
- **RESTful API**: Endpoints following REST principles
- **Security**: API key authentication, CORS protection
- **Error Handling**: Error handling and validation
- **Performance**: Optimized algorithm with early termination

## Sample Data

The application uses simulated stock price data:
- **Time Range**: 24-hour time window
- **Data Points**: 86,400 price points (one per second)
- **Price Range**: Realistic fluctuations with random walk algorithm

## Development Setup

If you want to run this locally:

```bash
# Clone the repository
git clone https://github.com/xrybrsx/stock-profit-app.git
cd stock-profit-app

# Install dependencies
npm install
cd stock-profit-frontend && npm install && cd ..

# Set environment variables
echo API_KEY=your-own-key > .env
cd stock-profit-frontend
echo VITE_API_KEY=your-own-key > .env
cd..

# Run the app
npm run build
npm start
```

## API Documentation

### Endpoints

#### GET `/api/profit/minmax`
Returns the available date range for calculations.

**Response:**
```json
{
  "min": "2025-01-01T10:00:00.000Z",
  "max": "2025-01-01T11:00:00.000Z"
}
```

#### GET `/api/profit/stats`
Returns performance and data statistics.

**Response:**
```json
{
  "totalPoints": 3600,
  "dateRange": {
    "start": "2025-01-01T10:00:00.000Z",
    "end": "2025-01-01T11:00:00.000Z"
  },
  "priceRange": {
    "min": 99.25,
    "max": 102.45
  }
}
```

#### POST `/api/profit`
Calculates the optimal buy/sell strategy.

**Request:**
```json
{
  "startTime": "2025-01-01T10:00:00.000Z",
  "endTime": "2025-01-01T10:30:00.000Z",
  "funds": 10000
}
```

**Response:**
```json
{
  "buyTime": "2025-01-01T10:05:23.000Z",
  "sellTime": "2025-01-01T10:28:45.000Z",
  "buyPrice": 100.25,
  "sellPrice": 101.75,
  "numShares": 99.75,
  "profit": 149.63,
  "totalCost": 2.50,
  "netProfit": 147.13,
  "chartData": [...]
}
```
