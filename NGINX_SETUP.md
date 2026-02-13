# Nginx Configuration Guide - Smart Home System

## Overview

You have two nginx configurations:
1. **frontend/nginx.conf** - Local/Docker development
2. **nginx_aws.conf** - AWS production with SSL/HTTPS

This guide explains both and how to use them.

---

## 🚀 Quick Start

### For Local Development
```bash
cd smart_home/frontend
docker build -t smart-home-frontend .
docker run -p 80:80 smart-home-frontend
```

Visit: http://localhost

### For AWS Production
```bash
sudo cp nginx_aws.conf /etc/nginx/conf.d/smart_home.conf
sudo nginx -t
sudo systemctl restart nginx
```

---

## 📋 Configuration 1: Local Development (frontend/nginx.conf)

### Purpose
Production-grade nginx for local development and Docker deployment.

### Key Features
✅ HTTP on port 80  
✅ Security headers (X-Frame-Options, CSP)  
✅ CORS enabled  
✅ Gzip compression  
✅ Static asset caching  
✅ Health check endpoint  

### Location Blocks Explained

#### Main Application
```nginx
location / {
    try_files $uri $uri/ /index.html;  # SPA routing
    add_header Access-Control-Allow-Origin * always;  # CORS
}
```
- Serves HTML/JS/CSS files
- Handles single-page app routing
- Returns index.html for unknown routes

#### Static Assets
```nginx
location ~* \.(js|css|png|jpg|...)$ {
    expires 1y;  # Cache for 1 year
    add_header Cache-Control "public, immutable";
}
```
- Highly cached (1 year) 
- Immutable files (has hash in name)
- Good for performance

#### HTML Files
```nginx
location ~* \.html$ {
    expires -1;  # Disable caching
    add_header Cache-Control "no-store, no-cache, must-revalidate";
}
```
- Never cached
- Always fetched from server
- Ensures users get latest version

#### Health Check
```nginx
location /health {
    return 200 "healthy\n";
}
```
- Load balancers use this to verify server is alive
- Zero logging (reduces log spam)

### Performance Settings
```nginx
sendfile on;          # Use kernel's sendfile() instead of copying
tcp_nopush on;        # Wait for full TCP packet before sending
tcp_nodelay on;       # Send small packets immediately
keepalive_timeout 65; # Connection timeout
```

### Compression
```nginx
gzip on;
gzip_comp_level 6;    # Level 1-9, higher = slower but smaller
gzip_types text/plain text/css application/json ...
```
- Reduces bandwidth by 60-80%
- Automatic for modern browsers

### Security Headers
```nginx
X-Frame-Options: SAMEORIGIN           # Prevent clickjacking
X-Content-Type-Options: nosniff       # Prevent MIME sniffing
X-XSS-Protection: 1; mode=block       # IE XSS protection
Referrer-Policy: no-referrer-when-downgrade  # Privacy
```

---

## 📋 Configuration 2: AWS Production (nginx_aws.conf)

### Purpose
Reverse proxy for AWS EC2 with SSL/HTTPS and backend routing.

### Key Features
✅ HTTPS with SSL certificate (Let's Encrypt)  
✅ HTTP → HTTPS redirect  
✅ Reverse proxy to backend  
✅ WebSocket support  
✅ Custom domain support  

### How It Works

#### 1. HTTP Redirect (Port 80)
```nginx
server {
    listen 80;
    server_name gunukulavishnuvardhanreddy.in;
    return 301 https://$host$request_uri;  # Redirect to HTTPS
}
```
- All HTTP traffic redirected to HTTPS
- Ensures encryption

#### 2. HTTPS Frontend (Port 443)
```nginx
server {
    listen 443 ssl;
    server_name gunukulavishnuvardhanreddy.in;
    
    ssl_certificate /etc/letsencrypt/live/.../fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/.../privkey.pem;
    
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;  # SPA routing
    }
}
```

#### 3. Reverse Proxy Locations

**Device Endpoint** (ESP32 polling)
```nginx
location /device {
    proxy_pass http://127.0.0.1:8000/device;
    proxy_buffering off;  # Real-time response
}
```

**Voice Commands**
```nginx
location /command {
    proxy_pass http://127.0.0.1:8000/command;
}
```

**WebSocket** (Real-time client sync)
```nginx
location /ws/client {
    proxy_pass http://127.0.0.1:8000/ws/client;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;  # WebSocket header
    proxy_set_header Connection "Upgrade";
}
```

### Understanding Reverse Proxy

```
Browser → nginx (443) → Backend (localhost:8000)
```

- Nginx receives request on HTTPS port 443
- Nginx forwards to backend on port 8000 (localhost)
- Backend never exposed directly (security)
- SSL termination at nginx level

---

## 🔧 Setup Instructions

### Local Development Setup

#### Option 1: Using Docker (Recommended)
```bash
# Navigate to frontend directory
cd smart_home/frontend

# Build Docker image
docker build -t smart-home-frontend .

# Run container
docker run -d \
  --name smart-home-web \
  -p 80:80 \
  smart-home-frontend

# Check if running
curl http://localhost/health
```

#### Option 2: Using Nginx Directly (Linux/Mac)
```bash
# Install nginx
brew install nginx          # macOS
sudo apt-get install nginx  # Ubuntu/Debian

# Copy configuration
sudo cp smart_home/frontend/nginx.conf /etc/nginx/sites-available/smart-home
sudo ln -s /etc/nginx/sites-available/smart-home /etc/nginx/sites-enabled/

# Copy frontend files to web root
sudo cp -r smart_home/frontend/* /var/www/html/

# Test configuration
sudo nginx -t

# Start nginx
sudo systemctl start nginx
```

#### Option 3: Using Python (Simplest, for testing only)
```bash
# Navigate to frontend
cd smart_home/frontend

# Start simple HTTP server
python3 -m http.server 8000

# Visit: http://localhost:8000
```

**⚠️ Note**: Python server doesn't have SPA routing, caching, or compression. Use Docker or Nginx for production.

---

### AWS Production Setup

#### Step 1: Launch EC2 Instance
```bash
# Connect to your EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Update system
sudo yum update -y

# Install nginx
sudo yum install -y nginx

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx  # Auto-start on reboot
```

#### Step 2: Install SSL Certificate (Let's Encrypt)
```bash
# Install certbot
sudo yum install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone \
  -d gunukulavishnuvardhanreddy.in \
  --email your-email@example.com \
  --agree-tos

# Verify certificate location
ls -la /etc/letsencrypt/live/gunukulavishnuvardhanreddy.in/
```

#### Step 3: Configure Nginx
```bash
# Backup default config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Copy our config
sudo cp smart_home/nginx_aws.conf /etc/nginx/conf.d/smart_home.conf

# IMPORTANT: Update domain name in config
sudo nano /etc/nginx/conf.d/smart_home.conf
# Change: gunukulavishnuvardhanreddy.in → your-domain.com

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

#### Step 4: Deploy Frontend
```bash
# Copy frontend files
sudo mkdir -p /var/www/html
sudo cp smart_home/frontend/* /var/www/html/

# Fix permissions
sudo chown -R nginx:nginx /var/www/html
sudo chmod -R 755 /var/www/html
```

#### Step 5: Deploy Backend
```bash
# Install Node.js
curl -fsSL https://rpm.nodesource.com/setup_16.x | sudo bash
sudo yum install -y nodejs

# Copy backend
cd /opt
sudo git clone https://github.com/your-repo/smart_home.git
cd smart_home/backend

# Install dependencies
npm install

# Start with PM2 (process manager)
sudo npm install -g pm2
pm2 start server.js --name smart-home-backend
pm2 startup
pm2 save
```

#### Step 6: Verify Setup
```bash
# Check nginx is running
sudo systemctl status nginx

# Check backend is running
pm2 logs smart-home-backend

# Test endpoints
curl https://your-domain.com/health
curl https://your-domain.com/api/devices
```

---

## 🔍 Common Issues & Solutions

### Issue 1: "Connection refused" to backend
**Problem**: nginx can't reach backend on localhost:8000

**Solution**:
```bash
# Check backend is running
ps aux | grep node

# Check port 8000 is listening
sudo netstat -tlnp | grep 8000

# If backend crashed, restart it
pm2 restart smart-home-backend
```

### Issue 2: SSL Certificate Errors
**Problem**: "Untrusted Certificate" or expired cert

**Solution**:
```bash
# Check cert expiration
sudo certbot renew --dry-run

# Auto-renew
sudo systemctl enable certbot-renew.timer
```

### Issue 3: CORS Errors in Browser
**Problem**: "Access-Control-Allow-Origin" error

**Solution**:
```nginx
# Add to location block in nginx.conf
add_header Access-Control-Allow-Origin * always;
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
```

### Issue 4: WebSocket Connection Failed
**Problem**: Real-time updates not working

**Solution**:
```nginx
# Ensure location block has:
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# Also check backend is listening on /ws/client
```

### Issue 5: 502 Bad Gateway
**Problem**: nginx receives error from backend

**Cause**: Backend is down or not responding

**Solution**:
```bash
# 1. Check backend status
pm2 status

# 2. Check logs
pm2 logs smart-home-backend
tail -f /var/log/nginx/error.log

# 3. Restart backend
pm2 restart smart-home-backend
```

---

## 📊 Performance Optimization

### Enable Caching Headers
```nginx
location ~* \.(js|css|jpg|png|gif|ico)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Enable Compression
```nginx
gzip on;
gzip_types text/plain text/css application/json text/javascript;
gzip_min_length 1000;
```

### Connection Optimization
```nginx
keepalive_timeout 65;
tcp_nopush on;
tcp_nodelay on;
```

### Backend Connection Pooling
```nginx
upstream backend {
    server 127.0.0.1:8000;
    keepalive 32;
}
```

---

## 🔐 Security Best Practices

### 1. Update SSL Configuration (AWS)
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers HIGH:!aNULL:!MD5;
ssl_prefer_server_ciphers on;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

### 2. Hide Version Information
```nginx
server_tokens off;
```

### 3. Rate Limiting
```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
location /api {
    limit_req zone=api_limit burst=20 nodelay;
}
```

### 4. Prevent Directory Browsing
```nginx
autoindex off;
```

### 5. Deny Access to Hidden Files
```nginx
location ~ /\. {
    deny all;
    access_log off;
}
```

---

## 📜 Testing Nginx Configuration

### Before Applying Changes
```bash
# Test configuration syntax
sudo nginx -t

# Expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### After Deployment
```bash
# Check HTTP redirects to HTTPS
curl -I http://your-domain.com
# Should return: 301 Moved Permanently

# Check HTTPS works
curl -I https://your-domain.com
# Should return: 200 OK

# Check frontend files load
curl https://your-domain.com/index.html

# Check health endpoint
curl https://your-domain.com/health
```

---

## 📈 Monitoring

### Check Nginx Status
```bash
# System status
sudo systemctl status nginx

# Active connections
netstat -an | grep :80
netstat -an | grep :443

# Nginx processes
ps aux | grep nginx
```

### View Logs
```bash
# Real-time access logs
sudo tail -f /var/log/nginx/access.log

# Real-time error logs
sudo tail -f /var/log/nginx/error.log

# Specific domain
sudo tail -f /var/log/nginx/gunukulavishnuvardhanreddy.in_access.log
```

### Check Open Ports
```bash
sudo firewall-cmd --list-ports
# Should show: 80/tcp 443/tcp
```

---

## 🔄 Reloading Configuration

### While Service Running (Zero Downtime)
```bash
# Reload nginx (keeps existing connections)
sudo systemctl reload nginx

# Or
sudo nginx -s reload
```

### After Major Changes
```bash
# Stop and restart
sudo systemctl restart nginx

# Or
sudo nginx -s stop
sudo systemctl start nginx
```

---

## 📝 Configuration Checklist

For Local Development:
- [ ] nginx.conf copied to correct location
- [ ] Frontend files in /usr/share/nginx/html or Docker mount point
- [ ] Port 80 accessible
- [ ] SPA routing working (reload returns index.html)
- [ ] Static assets cached
- [ ] CORS headers present

For AWS Production:
- [ ] Domain name updated in config
- [ ] SSL certificate issued and in correct path
- [ ] HTTP redirects to HTTPS
- [ ] Backend running on port 8000
- [ ] WebSocket location configured
- [ ] CORS headers set correctly
- [ ] Firewall allows 80 and 443
- [ ] Auto-renewal configured for SSL cert

---

## 🚀 Deployment Checklist

```bash
# 1. Test local first
docker build -t smart-home-frontend .
docker run -p 80:80 smart-home-frontend

# 2. Deploy to AWS
ssh -i key.pem ec2-user@your-ip
cd ~/smart_home
git pull origin main

# 3. Update configuration
sudo cp nginx_aws.conf /etc/nginx/conf.d/smart_home.conf
sudo sed -i 's/gunukulavishnuvardhanreddy.in/your-domain.com/g' \
  /etc/nginx/conf.d/smart_home.conf

# 4. Test config
sudo nginx -t

# 5. Reload nginx
sudo systemctl reload nginx

# 6. Verify
curl -I https://your-domain.com/health
```

---

## 🎯 Next Steps

1. **Choose deployment method**: Local (Docker/Python) or AWS (Production)
2. **Follow setup instructions** for your choice
3. **Update configuration** with your domain/settings
4. **Test the setup** using provided curl commands
5. **Monitor** using provided commands
6. **Optimize** based on performance needs

---

**Last Updated**: February 13, 2026  
**Version**: 2.0  
**Status**: Production Ready
