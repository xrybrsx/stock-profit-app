# Stock Profit Calculator

## Live Demo
**Azure Website:** [https://stock-profit-app-a3abcnb0erhdgyev.westeurope-01.azurewebsites.net/](https://stock-profit-app-a3abcnb0erhdgyev.westeurope-01.azurewebsites.net/)

## Project Overview

A web application that calculates the optimal buy/sell strategy for a given stock price dataset. 

The application includes:
- Backend API built with NestJS and TypeScript
- Frontend built with Vue.js and Highcharts
- Script to generate mock data
- Conainerized solution 
- Deployment on Azure App Service 

## Features

### Core Functionality
- **Profit Calculation**: Finds the best buy/sell points in a given time range using an optimized algorithm
- **Chooses Best Result**: If there is more than one best solution with equal profit, application returns the one that is earliest and shortest
- **Interactive Charts**: Visualizes price data with buy/sell markers using Highcharts

## Sample Data

The application uses a script to generate simulated stock price data:
- **Time Range**: 3-month window (2025-01-01 to 2025-04-01)
- **Data Format**: NDJSON stream (`3mo-prices.ndjson`), suitable for large datasets
- **Data Volume**: ~ 7,800,000 data points
- **Price Range**: Realistic fluctuations with a random walk algorithm

# Security

- **API Key Guard (optional)**: If `API_KEY` is set on the server, cross-origin callers must send `X-API-Key`. Same-origin browser requests do not need a key. If `API_KEY` is not set, no key is required and protection relies on strict CORS and rate limiting.
- **CORS**: In production, only the origin in `FRONTEND_URL` is allowed. If `FRONTEND_URL` is not set, cross-origin requests are blocked (same-origin only). In development, `http://localhost:5173` is allowed.
- **Rate limiting**: Global rate limiting is enabled (10 requests per 60 seconds per IP).
- **Security Middleware**: Sends strict headers including a conservative Content-Security-Policy (compatible with Highcharts), HSTS, X-Frame-Options, and Referrer-Policy.

# Testing

- **Unit Tests**: Backend service and controller logic are verified with very simple Jest tests
- **DTO & Validation**: Uses NestJS DTO classes and the ValidationPipe to ensure invalid data is rejected.
- **E2E Tests** : Test API endpoints

## Development Setup

## Run with Docker

### Option 1: Prebuilt image

```bash
# Pull the image 
docker pull rayabakarska/stock-profit-app:latest
# Run container
docker run -d --name stock-profit-app -p 3000:3000 -e NODE_ENV=production rayabakarska/stock-profit-app:latest
```

Image is published on Docker Hub: [rayabakarska/stock-profit-app](https://hub.docker.com/r/rayabakarska/stock-profit-app)

Note: Ensure you publish to port 3000.

### Option 2: Docker Compose (local build)

Follow the 'Generate local data (3-month NDJSON)' instructions

```bash
# From the project root
docker compose up --build -d
```

- App will be available at `http://localhost:3000`
- Health check: `http://localhost:3000/health`
- The compose file maps port 3000 and can mount a local data file into `dist/data/3mo-prices.ndjson`.

## If you want to run this locally:

```bash
# Clone the repository
git clone https://github.com/xrybrsx/stock-profit-app.git
cd stock-profit-app

# Install dependencies
npm install
cd stock-profit-frontend && npm install && cd ..

# Generate data before building
# Run the app
npm run build
npm start

```

### Generate local data (3-month NDJSON)

You can generate a fresh 3-month dataset locally before building:

```bash
# From the project root
npm run generate:data

# Or build and generate in one step
npm run build:with-data
```

The generated file will be placed under `dist/data/3mo-prices.ndjson` and used by the backend.

## Environment Variables

- `API_KEY`: Optional. When set, cross-origin clients must include `X-API-Key`. Same-origin browser requests never require it.
- `FRONTEND_URL`: Optional in production. When set, only this origin is allowed via CORS. If unset, cross-origin is blocked.

## API Documentation

### Endpoints
#### GET `/health`
Simple liveness/readiness endpoint.

Response:
```json
{
  "status": "ok",
  "uptimeSeconds": 123,
  "statsReady": true
}
```


#### GET `/api/profit/minmax`
Returns the available date range for calculations.

**Response:**
```json
{
  "min": "2025-01-01T00:00:00.000Z",
  "max": "2025-04-01T00:00:00.000Z"
}
```

#### POST `/api/profit`
Calculates the optimal buy/sell strategy.

**Request:**
```json
{
  "startTime": "2025-01-15T10:00:00.000Z",
  "endTime": "2025-02-15T10:30:00.000Z",
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
