# SSL/TLS Setup Guide for Smart Home

This guide explains how to enable SSL/TLS (HTTPS/WSS) for your Smart Home application.

## Overview

The Smart Home application now supports secure encrypted connections:
- **HTTPS** for web API requests
- **WSS (WebSocket Secure)** for real-time WebSocket connections
- **HTTP to HTTPS redirect** for seamless migration

### Architecture

```
Client (Browser)
    ↓ HTTPS/WSS
Nginx Reverse Proxy (Port 443 with SSL/TLS)
    ↓ HTTP/WS (Internal)
FastAPI Backend (Port 8000)
```

**Recommended Approach:** Use Nginx as a reverse proxy with SSL/TLS termination. The backend communicates over HTTP internally, which is simpler and more efficient.

---

## Setup Options

### Option 1: Self-Signed Certificates (Development/Testing)

#### Step 1: Generate Self-Signed Certificate

```bash
# Navigate to the project root
cd smart_home

# Create certs directory
mkdir -p certs

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -newkey rsa:4096 -nodes -out certs/cert.pem -keyout certs/key.pem -days 365
```

When prompted, enter certificate details:
```
Country Name (2 letter code) [AU]: US
State or Province Name [Some-State]: California
Locality Name []: San Francisco
Organization Name []: Smart Home
Organizational Unit Name []: IoT
Common Name []: localhost
Email Address []: admin@smarthome.local
```

#### Step 2: Start Docker Containers

```bash
docker-compose up --build
```

#### Step 3: Access the Application

Open your browser and navigate to:
```
https://localhost
```

**Note:** Your browser will show a security warning because the certificate is self-signed. Click "Advanced" and proceed to continue.

---

### Option 2: Let's Encrypt Certificates (Production)

For automatic HTTPS with valid certificates from Let's Encrypt:

#### Step 1: Set Up Certbot in Docker

Create a `docker-compose.certbot.yml` file:

```yaml
version: '3.8'

services:
  certbot:
    image: certbot/certbot
    volumes:
      - ./certs:/etc/letsencrypt
      - ./certbot:/var/www/certbot
    entrypoint: /bin/sh -c "certbot certonly --webroot -w /var/www/certbot -d yourdomain.com --agree-tos -m your-email@example.com --non-interactive"
```

#### Step 2: Obtain Certificate

```bash
# First, start only the frontend with certbot challenge support
docker-compose -f docker-compose.certbot.yml run certbot

# This will create certificates in the ./certs directory
```

#### Step 3: Update Nginx Configuration (if needed)

The `frontend/nginx.conf` is already configured for Let's Encrypt. Just ensure:
- Domain name is set correctly in nginx.conf (`server_name yourdomain.com;`)
- `.well-known` directory is accessible for renewal

#### Step 4: Start Full Application

```bash
docker-compose up --build
```

#### Step 5: Auto-Renewal

Set up a cron job to renew certificates automatically:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cd /path/to/smart_home && docker-compose run --rm certbot renew
```

---

### Option 3: Manual SSL Configuration on Backend

If you want to handle SSL directly on the FastAPI backend (without Nginx):

#### Step 1: Generate Certificates

Same as Option 1 - create certificates in `/certs` directory.

#### Step 2: Create .env File

Create a `.env` file in the backend directory:

```env
SSL_CERTFILE=/app/certs/cert.pem
SSL_KEYFILE=/app/certs/key.pem
```

#### Step 3: Update docker-compose.yml

Mount the certs volume in the backend service:

```yaml
backend:
  ...
  volumes:
    - ./database:/app/data
    - ./certs:/app/certs:ro
  env_file:
    - .env
```

#### Step 4: Start Containers

```bash
docker-compose up --build
```

---

## Configuration Files Modified

### 1. **frontend/app.js**
- ✅ WebSocket protocol detection (ws:// → wss://)
- ✅ API endpoints use dynamic protocol (http:// → https://)
- ✅ Automatic port selection based on protocol

### 2. **frontend/nginx.conf**
- ✅ HTTP to HTTPS redirect (port 80 → 443)
- ✅ SSL/TLS configuration with modern ciphers
- ✅ WebSocket reverse proxy with proper headers
- ✅ Security headers (HSTS, CORS, etc.)
- ✅ Let's Encrypt ACME challenge support

### 3. **backend/main.py**
- ✅ Optional SSL/TLS support via environment variables
- ✅ Recommended to use Nginx for SSL termination

### 4. **docker-compose.yml**
- ✅ Added port 443 for HTTPS
- ✅ Volume mounts for SSL certificates
- ✅ Support for Let's Encrypt certbot

---

## Testing SSL/TLS Connection

### Test HTTPS Connection

```bash
# Using curl with self-signed certificate
curl -k https://localhost/health

# Expected output: healthy
```

### Test WSS Connection

Open browser console and run:

```javascript
// Test WebSocket connection
const ws = new WebSocket('wss://localhost/ws/client');

ws.onopen = () => {
    console.log('✅ WSS connection established');
    ws.send('TEST:message');
};

ws.onmessage = (event) => {
    console.log('📨 Received:', event.data);
};

ws.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
};

ws.onclose = () => {
    console.log('⚠️  WebSocket closed');
};
```

---

## Troubleshooting

### Certificate Issues

**Problem:** "Certificate not found" error

**Solution:**
1. Verify certificates exist in `./certs/` directory:
   ```bash
   ls -la certs/
   ```
   Should show `cert.pem` and `key.pem`

2. Check file permissions:
   ```bash
   chmod 644 certs/cert.pem
   chmod 644 certs/key.pem
   ```

### Browser Shows Security Warning

This is normal for self-signed certificates. Solutions:

1. **Development:** Click "Advanced" → "Proceed to localhost"
2. **Testing:** Add certificate to trusted store
3. **Production:** Use Let's Encrypt certificates

### WebSocket Connection Fails

**Problem:** WSS connection shows "error" in console

**Possible causes:**
1. Certificate not properly configured
2. Port 443 not exposed/available
3. Nginx not running

**Solution:**
```bash
# Check logs
docker-compose logs frontend

# Verify ports
netstat -an | grep 443

# Restart services
docker-compose restart
```

### Mixed Content Error

**Problem:** HTTPS page trying to load WS (not WSS)

This should be automatically handled by the app.js update. If still occurring:

1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check that `window.location.protocol` is correctly detected

---

## Security Best Practices

1. ✅ Always use HTTPS in production
2. ✅ Use valid certificates (Let's Encrypt is free)
3. ✅ Enable HSTS header (already configured)
4. ✅ Regularly update certificates before expiration
5. ✅ Use strong ciphers (TLSv1.2+)
6. ✅ Keep certificates private (no version control)
7. ✅ Monitor certificate expiration dates

---

## Production Deployment

### AWS EC2 with Let's Encrypt

```bash
# 1. SSH into EC2 instance
ssh -i key.pem ec2-user@your-instance

# 2. Install Docker & Docker Compose
sudo yum update -y
sudo yum install docker -y
sudo curl -L "https://github.com/docker/compose/releases/download/v2.x.x/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# 3. Clone repository and setup
git clone your-repo smart_home
cd smart_home

# 4. Generate Let's Encrypt certificate
mkdir certbot
docker-compose -f docker-compose.certbot.yml run certbot

# 5. Update nginx.conf with your domain
sed -i 's/yourdomain.com/your-actual-domain.com/g' frontend/nginx.conf

# 6. Start application
docker-compose up -d

# 7. Setup certificate auto-renewal
(crontab -l 2>/dev/null; echo "0 2 * * * cd /home/ec2-user/smart_home && docker-compose run --rm certbot renew") | crontab -
```

---

## Quick Start Checklist

- [ ] Generate SSL certificates (Option 1, 2, or 3)
- [ ] Place certificates in `./certs/` directory
- [ ] Verify `frontend/nginx.conf` has correct certificate paths
- [ ] Check `docker-compose.yml` volume mounts
- [ ] Run `docker-compose up --build`
- [ ] Test HTTPS: `https://localhost`
- [ ] Test WSS: Open browser console and run WebSocket test
- [ ] Check browser console for errors
- [ ] Verify API calls use HTTPS protocol

---

## Additional Resources

- [Nginx SSL Configuration](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [WebSocket Security (RFC 6455)](https://tools.ietf.org/html/rfc6455)
- [OWASP: Secure Coding](https://cheatsheetseries.owasp.org/cheatsheets/Secure_Coding_Cheat_Sheet.html)

---

## Support

If you encounter issues:

1. Check Docker logs: `docker-compose logs`
2. Verify certificate paths in nginx.conf
3. Ensure ports 80 and 443 are not blocked by firewall
4. Check file permissions on certificate files
5. Review browser console for detailed error messages

