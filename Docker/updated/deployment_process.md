# Updated AWS Deployment Process

This guide explains how to deploy the Smart Home application on AWS EC2 using separate containers for the Frontend and Backend, configured for your custom domain `https://gunukulavishnuvardhanreddy.in`.

## 🏗️ Deployment Architecture

- **Frontend:** Nginx serving static files (Port 80)
- **Backend:** FastAPI (Port 8000)
- **HTTPS:** Managed by AWS ALB or a Reverse Proxy on the EC2 instance

## 📂 New Folder Structure
Everything you need for this deployment is located in:
`smart_home/Docker/updated/`

## 🚀 Step-by-Step Deployment

### 1. Upload the New Files to EC2
Copy the folder to your instance:
```powershell
scp -i your-key.pem -r c:\Users\vishnu\Desktop\electrocoders\smart_home\Docker\updated ec2-user@your-ec2-ip:~/smart_home/Docker/
```

### 2. Configure Backend (Python API)
The backend now supports proxy headers, which is critical for HTTPS.

**To build and run the backend separately:**
```bash
cd ~/smart_home/Docker/updated/backend
# Copy backend files into this folder for build context
cp -r ~/smart_home/backend/* .
# Build
docker build -t smart-home-backend .
# Run
docker run -d --name backend --restart always -p 8000:8000 smart-home-backend
```

### 3. Configure Frontend (Nginx)
The frontend is configured to serve your files from your custom domain.

**To build and run the frontend separately:**
```bash
cd ~/smart_home/Docker/updated/frontend
# Copy frontend files into this folder for build context
cp -r ~/smart_home/frontend/index.html .
cp -r ~/smart_home/frontend/app.js .
# Build
docker build -t smart-home-frontend .
# Run
docker run -d --name frontend --restart always -p 80:80 smart-home-frontend
```

## 🔒 Handling HTTPS (Domain Name)

Since you are using `https://gunukulavishnuvardhanreddy.in`, you likely have one of the following setups:

### Option A: AWS Application Load Balancer (Recommended)
1. Create an ALB.
2. Add an HTTPS Listener with your certificate.
3. Forward traffic to your EC2 instance on Port 80 (Frontend) and Port 8000 (Backend).
4. Update the `app.js` to point to your domain.

### Option B: Certbot (LetsEncrypt) on EC2
1. Install Certbot on the host machine.
2. Run `sudo certbot --nginx`.
3. Certbot will automatically detect your domain and update the Nginx configuration to point to Port 443 with SSL.

## 🛠️ Verification Checklist

- [ ] **Backend Test:** `curl http://localhost:8000/device` should return `idle`.
- [ ] **Frontend Test:** Visiting your domain should show the UI.
- [ ] **HTTPS Test:** Ensure your browser doesn't show "Mixed Content" warnings.
- [ ] **ESP32 Test:** ESP32 should now be able to connect to `https://gunukulavishnuvardhanreddy.in/device`.

## 📋 Useful Commands

```bash
# View logs for both
docker logs -f backend
docker logs -f frontend

# Stop and remove for redeployment
docker stop backend frontend
docker rm backend frontend
```

---
**Note:** This deployment assumes you have Docker already installed on your AWS instance. If not, refer to the original `AWS_QUICK_DEPLOY.md`.
