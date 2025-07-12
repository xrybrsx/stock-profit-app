# Stock Profit Calculator

## Live Demo
**Azure Website:** [Your Azure URL here]

## Project Overview

This is a full-stack web application that calculates the optimal buy/sell strategy for a given stock price dataset. I built this to demonstrate my skills in modern web development, security implementation, and cloud deployment.

The application includes:
- Backend API built with NestJS and TypeScript
- Frontend built with Vue.js 3 and Highcharts
- API key authentication and rate limiting
- Deployment on Azure App Service

## Features

### Core Functionality
- **Profit Calculation**: Finds the best buy/sell points in a given time range using an optimized algorithm
- **Interactive Charts**: Visualizes price data with buy/sell markers using Highcharts
- **Real-time Validation**: Input validation with helpful error messages
- **Responsive Design**: Works on desktop and mobile devices

### Technical Features
- **RESTful API**: Clean, documented endpoints following REST principles
- **Security**: API key authentication, rate limiting, CORS protection
- **Error Handling**: Comprehensive error handling and validation
- **Performance**: Optimized O(n) algorithm for profit calculation

## Technology Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Validation**: class-validator, class-transformer
- **Security**: Custom API key authentication, rate limiting

### Frontend
- **Framework**: Vue.js 3 (Composition API)
- **Charts**: Highcharts
- **HTTP Client**: Axios
- **Build Tool**: Vite

### Infrastructure
- **Hosting**: Azure App Service
- **Environment**: Production-ready with environment variables

## Security Implementation

I implemented several security measures to make this production-ready:

1. **API Key Authentication**: All API endpoints require a valid API key
2. **Rate Limiting**: 10 requests per minute per IP address to prevent abuse
3. **Input Validation**: Comprehensive validation for all inputs using class-validator
4. **CORS Protection**: Restricted to authorized origins
5. **Security Headers**: XSS protection, content type validation, and other security headers

## How to Test

### 1. Visit the Live Demo
- Open the Azure website URL
- You'll see the stock profit calculator interface immediately
- No login required - authentication is handled seamlessly in the background

### 2. Test the Calculator
1. **Select Date Range**: Choose start and end times from the available range
2. **Enter Funds**: Input the amount you want to invest
3. **Calculate**: Click "Calculate" to see the optimal strategy
4. **View Results**: See buy/sell points, profit, and interactive chart

### 3. Test Security Features
- **Rate Limiting**: Make more than 10 requests quickly to see rate limiting in action
- **Input Validation**: Try invalid dates or negative amounts to see validation
- **API Protection**: Direct API calls without the frontend will be rejected

## Sample Data

The application uses simulated stock price data:
- **Time Range**: January 1, 2025, 10:00 AM - 11:00 AM
- **Data Points**: 3,600 price points (one per second)
- **Price Range**: Approximately $99-$102 with realistic fluctuations

## Development Setup

If you want to run this locally:

```bash
# Clone the repository
git clone [repository-url]
cd stock-profit-app

# Install dependencies
npm install
cd stock-profit-frontend && npm install && cd ..

# Set environment variables
cp .env.example .env
# Edit .env with your settings

# Run development servers
npm run start:dev
```

## Algorithm

The profit calculation uses a realistic trading algorithm that accounts for real-world constraints:

1. **Sequential Trading**: You can only sell after you buy (no short selling)
2. **Transaction Costs**: Includes realistic fees (0.1% per transaction, $1 minimum)
3. **Optimal Strategy**: Finds the best buy-sell combination that maximizes net profit
4. **Precision**: Uses proper rounding to avoid floating-point errors

The algorithm evaluates all possible buy-sell combinations within the time range and selects the one with the highest net profit after transaction costs.

## UI/UX Features

- **Dark Theme**: Modern dark interface for better readability
- **Interactive Charts**: Zoom, pan, and hover functionality
- **Real-time Validation**: Immediate feedback on input errors
- **Responsive Design**: Works on all screen sizes
- **Loading States**: Smooth user experience during calculations

## Code Quality

- **TypeScript**: Full type safety throughout the application
- **ESLint**: Code quality enforcement
- **Prettier**: Consistent code formatting
- **Error Handling**: Comprehensive error management
- **Documentation**: Well-documented code and API

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

## Deployment

The application is deployed on Azure App Service with:
- **Automatic HTTPS**: SSL certificates managed by Azure
- **Environment Variables**: Secure configuration management
- **CI/CD Ready**: Can be easily integrated with GitHub Actions
- **Scalable**: Can handle increased traffic with Azure scaling

## Contact

For questions about this project or to discuss the implementation, please reach out through the application process.

---

**Note**: This is a demonstration project showcasing full-stack development skills, security implementation, and production-ready deployment practices.