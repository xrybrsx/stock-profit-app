FROM node:18 AS frontend-build
WORKDIR /app/frontend
COPY stock-profit-frontend/package*.json ./
RUN npm install
COPY stock-profit-frontend ./
RUN npm run build

FROM node:18-alpine AS backend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build:backend   # <-- Only build backend, frontend is built separately
RUN npm run copy:assets      # <-- Copy data assets to dist/data as expected by the service
COPY --from=frontend-build /app/frontend/dist ./stock-profit-frontend/dist

EXPOSE 3000
CMD ["node", "dist/main.js"]