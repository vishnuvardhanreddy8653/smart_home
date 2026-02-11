# 🚀 Smart Home AWS Deployment Checklist

Follow these steps to ensure a flawless deployment with HTTPS and ESP32 connectivity.

## 1. AWS Security Group
- [ ] **Port 80 (HTTP)**: Open to globally (0.0.0.0/0) - Required for Certbot.
- [ ] **Port 443 (HTTPS)**: Open to globally (0.0.0.0/0) - Required for Voice/Browser.
- [ ] **Port 8000**: Should **NOT** be open globally. Keep it open only for your internal tests or localhost.

## 2. Nginx Setup
- [ ] Install Nginx: `sudo dnf install nginx` (Amazon Linux 2023).
- [ ] Copy `nginx_aws.conf` to `/etc/nginx/conf.d/smart_home.conf`.
- [ ] Test config: `sudo nginx -t`.
- [ ] Restart Nginx: `sudo systemctl restart nginx`.

## 3. SSL (Let's Encrypt)
- [ ] Install Certbot: `sudo dnf install certbot python3-certbot-nginx`.
- [ ] Run Certbot: `sudo certbot --nginx -d gunukulavishnuvardhanreddy.in`.
- [ ] Verify paths in Nginx config match the Certbot generated files.

## 4. FastAPI Startup
- [ ] Run FastAPI internally on 127.0.0.1:
  ```bash
  uvicorn main:app --host 127.0.0.1 --port 8000 --reload
  ```
- [ ] Check logs: `tail -f uvicorn.log` to see real-time ESP32 polling.

## 5. ESP32 Verification
- [ ] Open Serial Monitor (115200 baud).
- [ ] Confirm "🌐 HTTP Status Code: 200" appears.
- [ ] Verify payload is NOT HTML (`📩 Received command: idle`).

## ⚠️ Common Pitfalls
- **HTML Response on /device**: Usually means Nginx is serving the root index.html instead of proxying. Ensure `location /device` is defined *before* any catch-all `location /`.
- **SSL Handshake Failed**: Ensure the Root CA in Arduino code is correct and your domain is not expired.
