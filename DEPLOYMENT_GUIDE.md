# BridgeBreak ERP - Deployment Guide

**Version:** 0.1.0  
**Last Updated:** May 5, 2026  
**Status:** Ready for Production

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Database Setup](#database-setup)
7. [Verification & Testing](#verification--testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- **Node.js:** 16+ (18 LTS recommended)
- **npm:** 8+
- **MongoDB:** 4.4+ (local or cloud)
- **Git:** 2.0+

### Optional (for Docker)
- **Docker:** 20.10+
- **Docker Compose:** 1.29+
- **Kubernetes:** 1.20+ (for K8s deployment)

### Optional (for Production)
- **PM2:** Process manager
- **Nginx:** Reverse proxy
- **SSL Certificate:** Let's Encrypt or corporate CA

---

## Local Development

### 1. Clone Repository
```bash
git clone <repo>
cd systemstellengerp
```

### 2. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

### 3. Configure Environment
```bash
# Create .env file from template
cp .env.example .env.local
cat .env.example > .env

# Edit with your values
nano .env
```

### 4. Database Setup
```bash
# Start MongoDB (if local)
mongod --dbpath /data/db

# Or use Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Seed database
cd backend
npm run seed
cd ..
```

### 5. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Expected: Express server listening on port 4000
```

**Terminal 2 - Frontend:**
```bash
npm run dev
# Expected: Ready in 2.5s, open http://localhost:3000
```

### 6. Verify Setup
```bash
# Test API
curl http://localhost:4000/api/health
# Expected: {"status": "OK"}

# Open frontend
open http://localhost:3000
```

---

## Docker Deployment

### Single Container (Dev/Demo)
```bash
# Build images
docker build -f Dockerfile.frontend -t bridgebreak-frontend:latest .
docker build -f Dockerfile.backend -t bridgebreak-backend:latest ./backend

# Run with docker-compose
docker-compose up

# Services available:
# Frontend: http://localhost:3000
# Backend: http://localhost:4000
# MongoDB: localhost:27017
```

### Multi-Container Stack (Production)
```bash
# Edit docker-compose.yml for production settings
nano docker-compose.yml

# Deploy
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale backend=3
```

### Container Registry (Optional)
```bash
# Tag for registry
docker tag bridgebreak-frontend:latest myregistry/bridgebreak-frontend:v0.1.0
docker tag bridgebreak-backend:latest myregistry/bridgebreak-backend:v0.1.0

# Push
docker push myregistry/bridgebreak-frontend:v0.1.0
docker push myregistry/bridgebreak-backend:v0.1.0
```

---

## Kubernetes Deployment

### Prerequisites
```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Verify
kubectl version --client
```

### Deploy to K8s
```bash
# Create namespace
kubectl create namespace bridgebreak

# Create ConfigMap for environment
kubectl create configmap bridgebreak-config \
  --from-env-file=.env \
  -n bridgebreak

# Create Secret for sensitive data
kubectl create secret generic bridgebreak-secrets \
  --from-literal=JWT_SECRET=<your-secret> \
  --from-literal=MONGODB_URI=<your-mongodb-uri> \
  -n bridgebreak

# Deploy (requires Kubernetes manifests - see k8s/ folder)
kubectl apply -f k8s/
kubectl rollout status deployment/bridgebreak-frontend -n bridgebreak
kubectl rollout status deployment/bridgebreak-backend -n bridgebreak
```

### Verify K8s Deployment
```bash
# Check pods
kubectl get pods -n bridgebreak

# Check services
kubectl get svc -n bridgebreak

# Port forward for testing
kubectl port-forward svc/bridgebreak-frontend 3000:3000 -n bridgebreak
kubectl port-forward svc/bridgebreak-backend 4000:4000 -n bridgebreak
```

---

## Environment Configuration

### Frontend (.env.local)
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

### Backend (.env)
```bash
# Application
PORT=4000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/bridgebreak
MONGODB_DB=bridgebreak

# Authentication
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRY=8h

# CORS
CORS_ORIGIN=http://localhost:3000

# File Uploads
UPLOAD_ROOT=./uploads
MAX_UPLOAD_SIZE_MB=20

# Email (SMTP)
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=erp@yourdomain.com
SMTP_PASS=your-password
SMTP_FROM=erp@yourdomain.com
COMPANY_NAME=BridgeBreak

# External APIs (Optional)
FX_API_URL=https://open.er-api.com/v6/latest/USD
```

### Production Overrides
```bash
# Production .env overrides
NODE_ENV=production
PORT=80  # Or use reverse proxy on 443
JWT_SECRET=<generate-with-strong-random-string>
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/bridgebreak
CORS_ORIGIN=https://yourdomain.com
```

---

## Database Setup

### MongoDB Atlas (Cloud)
```bash
# Create cluster at https://www.mongodb.com/cloud/atlas
# Get connection string: mongodb+srv://user:password@cluster.mongodb.net/bridgebreak

# Update .env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/bridgebreak
```

### Local MongoDB
```bash
# Install MongoDB Community
brew tap mongodb/brew
brew install mongodb-community

# Start service
brew services start mongodb-community

# Verify
mongosh
> db.adminCommand("ping")
```

### Database Seeding
```bash
cd backend

# Seed sample data
npm run seed

# Verify
mongosh
> use bridgebreak
> db.users.count()
> db.settings.count()
```

### Database Backup
```bash
# Backup
mongodump --db bridgebreak --out ./backup

# Restore
mongorestore --db bridgebreak ./backup/bridgebreak
```

---

## Verification & Testing

### Pre-Deployment Checklist
```bash
# 1. Build frontend
npm run build
# Expected: ✓ Compiled successfully

# 2. Run backend tests
cd backend
npm test
# Expected: Test Suites: 3 passed, 3 total

# 3. Run completion verification
cd ..
./verify-completion.sh
# Expected: All checks pass
```

### Post-Deployment Verification
```bash
# 1. Check API health
curl http://your-domain:4000/api/health

# 2. Test authentication
curl -X POST http://your-domain:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!","full_name":"Test User"}'

# 3. Check database connectivity
mongosh --eval "db.adminCommand('ping')"

# 4. Test file uploads
curl -F "file=@test.pdf" http://your-domain:4000/api/uploads
```

---

## Production Deployment

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Deploy using ecosystem.config.js
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# View logs
pm2 logs

# Restart
pm2 restart all
```

### Using Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/bridgebreak
upstream backend {
    server localhost:4000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
brew install certbot

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Configure auto-renewal
sudo certbot renew --dry-run
```

---

## Troubleshooting

### Frontend Build Fails
```bash
# Clear cache and reinstall
rm -rf .next node_modules
npm install
npm run build
```

### Backend Won't Start
```bash
# Check if port is in use
lsof -i :4000

# Kill process
kill -9 <PID>

# Verify MongoDB connection
mongosh --eval "db.adminCommand('ping')"
```

### Tests Fail
```bash
# Verify Jest config
ls -la backend/jest.config.js

# Run specific test
npm test -- auth.test.js

# Run with verbose output
npm test -- --verbose
```

### Database Connection Issues
```bash
# Test connection
mongosh "mongodb://localhost:27017/bridgebreak"

# Check if MongoDB is running
ps aux | grep mongod

# View MongoDB logs
tail -f /usr/local/var/log/mongodb/mongo.log
```

### Environment Variable Not Found
```bash
# Verify .env file exists
cat .env

# Check variable is set
echo $MONGODB_URI

# Reload .env (if using bash)
source .env
```

---

## Support & Monitoring

### Logs
```bash
# Frontend logs
npm run dev 2>&1 | tee frontend.log

# Backend logs
cd backend && npm run dev 2>&1 | tee backend.log

# Docker logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Health Checks
```bash
# API health
curl http://localhost:4000/api/health

# Database
mongosh --eval "db.adminCommand('ping')"

# Frontend
curl http://localhost:3000
```

### Performance Monitoring
```bash
# Load testing
ab -n 1000 -c 10 http://localhost:4000/api/health

# Resource usage
top
free -h
df -h
```

---

## Summary

BridgeBreak ERP can be deployed:
- ✅ **Locally** for development
- ✅ **Docker** for staging/production
- ✅ **Kubernetes** for enterprise scale
- ✅ **PM2** for process management
- ✅ **Nginx** for reverse proxy

For questions, refer to ERP_TESTING_REPORT.md for detailed workflows and testing procedures.

---

**Generated:** May 5, 2026  
**Status:** Ready for Deployment
