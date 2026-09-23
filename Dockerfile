# 24/7 Production Dockerfile for AlphaSignals Terminal
FROM node:20-alpine

WORKDIR /app

# Copy root and package files
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies
RUN npm --prefix server install
RUN npm --prefix client install

# Copy source code
COPY server/ ./server/
COPY client/ ./client/

# Build React client into static production bundle
RUN npm --prefix client run build

# Expose port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

# Start Express server & Auto-Exit Engine 24/7
CMD ["node", "server/server.js"]
