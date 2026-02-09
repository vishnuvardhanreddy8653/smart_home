# Smart Home Frontend - Docker Deployment Guide

## Overview
Production-ready frontend deployment using Nginx with security hardening, performance optimizations, and health checks.

## Features
- ✅ **Security**: Non-root user, security headers, hidden file protection
- ✅ **Performance**: Gzip compression, static asset caching, optimized worker processes
- ✅ **Monitoring**: Health check endpoint, structured logging
- ✅ **Production-Ready**: Auto-restart, log rotation, CORS support

## Quick Start

### Build Image
```bash
cd frontend
docker build -t smart_home_frontend:latest .
```

### Run Container
```bash
docker run -d \
    --name smart_home_frontend \
    --restart always \
    -p 80:80 \
    smart_home_frontend:latest
```

### Verify Deployment
```bash
# Check container status
docker ps | grep smart_home_frontend

# Check health
curl http://localhost/health

# View logs
docker logs -f smart_home_frontend
```

## AWS Deployment

### Method 1: Using Docker Compose (Recommended)
```bash
cd /opt/smart_home
docker-compose up -d frontend
```

### Method 2: Standalone Deployment
```bash
cd /opt/smart_home/frontend
chmod +x deploy_frontend.sh
./deploy_frontend.sh
```

## Configuration

### Nginx Configuration
Located at `nginx.conf`, includes:
- **Worker Processes**: Auto-scaled based on CPU cores
- **Gzip Compression**: Enabled for text/js/css files
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **CORS**: Configured for WebSocket and API access
- **Caching**: 1-year cache for static assets, no-cache for HTML

### Environment Variables
```bash
# Custom port (default: 80)
docker run -p 8080:80 smart_home_frontend:latest
```

## Health Checks

### Docker Health Check
Built-in health check runs every 30 seconds:
```bash
docker inspect --format='{{.State.Health.Status}}' smart_home_frontend
```

### Manual Health Check
```bash
curl http://localhost/health
# Expected response: "healthy"
```

## Logging

### View Logs
```bash
# Real-time logs
docker logs -f smart_home_frontend

# Last 100 lines
docker logs --tail 100 smart_home_frontend

# Logs with timestamps
docker logs -t smart_home_frontend
```

### Log Configuration
- **Driver**: json-file
- **Max Size**: 10MB per file
- **Max Files**: 3 files (30MB total)
- **Location**: `/var/log/nginx/` inside container

## Performance Optimization

### Static Asset Caching
- **JS/CSS/Images**: 1-year cache with immutable flag
- **HTML**: No cache (always fresh)
- **Compression**: Gzip enabled for 6x compression ratio

### Worker Configuration
- **Worker Processes**: Auto (matches CPU cores)
- **Worker Connections**: 1024 per worker
- **Keepalive Timeout**: 65 seconds

## Security Features

### Non-Root User
Container runs as user `appuser` (UID 1000) for security.

### Security Headers
```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: no-referrer-when-downgrade
```

### Hidden Files Protection
All files starting with `.` are denied access.

## Troubleshooting

### Issue: Container won't start
```bash
# Check logs
docker logs smart_home_frontend

# Verify port availability
sudo lsof -i :80

# Check Nginx config
docker run --rm smart_home_frontend nginx -t
```

### Issue: Permission denied
```bash
# Rebuild with proper permissions
docker build --no-cache -t smart_home_frontend:latest .
```

### Issue: Health check failing
```bash
# Check Nginx status inside container
docker exec smart_home_frontend ps aux | grep nginx

# Test health endpoint
docker exec smart_home_frontend curl -f http://localhost/health
```

### Issue: Static files not loading
```bash
# Verify files are copied
docker exec smart_home_frontend ls -la /usr/share/nginx/html/

# Check Nginx error logs
docker exec smart_home_frontend cat /var/log/nginx/error.log
```

## Updating Frontend

### Method 1: Using deployment script
```bash
cd /opt/smart_home/frontend
./deploy_frontend.sh
```

### Method 2: Manual update
```bash
# Rebuild image
docker build -t smart_home_frontend:latest .

# Stop old container
docker stop smart_home_frontend
docker rm smart_home_frontend

# Start new container
docker run -d --name smart_home_frontend --restart always -p 80:80 smart_home_frontend:latest
```

### Method 3: Using docker-compose
```bash
cd /opt/smart_home
docker-compose up -d --build frontend
```

## Production Checklist

- [ ] SSL/TLS certificate configured (use Certbot)
- [ ] Security groups allow HTTP/HTTPS traffic
- [ ] Health checks passing
- [ ] Logs rotating properly
- [ ] Static assets caching correctly
- [ ] CORS headers configured for your domain
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured

## SSL/TLS Setup (Production)

### Using Let's Encrypt
```bash
# Install Certbot
sudo yum install -y certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update nginx.conf to use SSL
# Add to server block:
listen 443 ssl http2;
ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
```

## Monitoring

### Container Stats
```bash
docker stats smart_home_frontend
```

### Resource Usage
```bash
# CPU and Memory
docker exec smart_home_frontend top -bn1

# Disk usage
docker exec smart_home_frontend df -h
```

### Access Logs
```bash
# Real-time access logs
docker exec smart_home_frontend tail -f /var/log/nginx/access.log

# Error logs
docker exec smart_home_frontend tail -f /var/log/nginx/error.log
```

## Advanced Configuration

### Custom Nginx Config
1. Edit `nginx.conf`
2. Rebuild image: `docker build -t smart_home_frontend:latest .`
3. Restart container: `docker restart smart_home_frontend`

### Multi-Stage Build (Future Enhancement)
For Node.js build process:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

## Support

For issues or questions:
1. Check logs: `docker logs smart_home_frontend`
2. Verify health: `curl http://localhost/health`
3. Test Nginx config: `docker exec smart_home_frontend nginx -t`
4. Review AWS security groups
5. Check disk space: `df -h`
