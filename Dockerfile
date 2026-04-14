# Multi-stage build for Next.js frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy frontend package files
COPY package*.json ./
RUN npm ci --only=production

# Copy frontend source
COPY . .

# Build Next.js app
RUN npm run build

# Backend stage
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

# Final production stage
FROM node:18-alpine

WORKDIR /app

# Install PM2 for process management
RUN npm install -g pm2

# Copy built frontend
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/package*.json ./
COPY --from=frontend-builder /app/node_modules ./node_modules

# Copy backend
COPY --from=backend-builder /app/backend ./backend

# Create uploads directory
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Expose ports
EXPOSE 3000 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start both frontend and backend with PM2
COPY ecosystem.config.js ./
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
