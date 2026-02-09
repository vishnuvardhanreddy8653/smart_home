# Smart Home AWS Deployment Guide

## Prerequisites
- AWS Account
- EC2 Instance (Amazon Linux 2023)
- Recommended: t3.medium or larger (for Ollama AI model)
- Security Group configured (see below)

## AWS EC2 Setup

### 1. Launch EC2 Instance

**Recommended Specifications:**
- **AMI**: Amazon Linux 2023
- **Instance Type**: t3.medium (2 vCPU, 4GB RAM minimum)
- **Storage**: 30GB gp3 SSD minimum
- **Key Pair**: Create or use existing SSH key

### 2. Configure Security Group

Create inbound rules:
```
Type            Protocol    Port Range    Source
SSH             TCP         22            Your IP/0.0.0.0/0
HTTP            TCP         80            0.0.0.0/0
Custom TCP      TCP         8000          0.0.0.0/0
```

### 3. Allocate Elastic IP (Optional but Recommended)
- Prevents IP changes on instance restart
- Go to EC2 → Elastic IPs → Allocate → Associate with your instance

## Deployment Steps

### Step 1: Connect to EC2
```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

### Step 2: Upload Deployment Script
From your local machine:
```bash
scp -i your-key.pem deploy_aws.sh ec2-user@YOUR_EC2_PUBLIC_IP:~/
```

### Step 3: Run Deployment Script
On EC2 instance:
```bash
chmod +x deploy_aws.sh
./deploy_aws.sh
```

### Step 4: Upload Your Application
From your local machine:
```bash
# Upload entire smart_home directory
scp -i your-key.pem -r smart_home/ ec2-user@YOUR_EC2_PUBLIC_IP:/opt/
```

Or use Git:
```bash
# On EC2
cd /opt/smart_home
git clone YOUR_REPOSITORY_URL .
```

### Step 5: Start the Application
```bash
cd /opt/smart_home
docker-compose up -d --build
```

### Step 6: Verify Deployment
```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs -f

# Test backend
curl http://localhost:8000

# Test frontend
curl http://localhost
```

## Enable Auto-Start on Boot

```bash
# Copy service file
sudo cp /opt/smart_home/smart-home.service /etc/systemd/system/

# Enable service
sudo systemctl daemon-reload
sudo systemctl enable smart-home.service
sudo systemctl start smart-home.service

# Check status
sudo systemctl status smart-home.service
```

## Access Your Application

- **Frontend**: `http://YOUR_EC2_PUBLIC_IP`
- **Backend API**: `http://YOUR_EC2_PUBLIC_IP:8000`
- **API Documentation**: `http://YOUR_EC2_PUBLIC_IP:8000/docs`

## Monitoring & Maintenance

### View Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend

# System logs
sudo journalctl -u smart-home.service -f
```

### Restart Services
```bash
cd /opt/smart_home
docker-compose restart
```

### Update Application
```bash
cd /opt/smart_home
git pull  # or upload new files
docker-compose down
docker-compose up -d --build
```

### Check Resource Usage
```bash
# CPU and Memory
htop

# Docker stats
docker stats

# Disk usage
df -h
```

## Troubleshooting

### Issue: Ollama not responding
```bash
# Check Ollama service
sudo systemctl status ollama

# Restart Ollama
sudo systemctl restart ollama

# Test Ollama
curl http://localhost:11434/api/tags
```

### Issue: Docker containers not starting
```bash
# Check Docker service
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Check logs
docker-compose logs
```

### Issue: Port 80 already in use
```bash
# Find process using port 80
sudo lsof -i :80

# Kill process or change frontend port in docker-compose.yml
```

### Issue: Out of disk space
```bash
# Clean Docker images
docker system prune -a

# Remove old logs
docker-compose logs --tail=0 -f
```

## Security Best Practices

### 1. Enable Firewall
```bash
sudo yum install -y firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Allow required ports
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

### 2. Set Up SSL/TLS (Recommended for Production)
```bash
# Install Certbot
sudo yum install -y certbot python3-certbot-nginx

# Get certificate (requires domain name)
sudo certbot --nginx -d yourdomain.com
```

### 3. Regular Updates
```bash
# Update system packages
sudo yum update -y

# Update Docker images
cd /opt/smart_home
docker-compose pull
docker-compose up -d
```

### 4. Backup Database
```bash
# Create backup script
cat > /opt/smart_home/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/smart_home/backups"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
cp -r /opt/smart_home/database $BACKUP_DIR/database_$DATE
find $BACKUP_DIR -mtime +7 -delete
EOF

chmod +x /opt/smart_home/backup.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/smart_home/backup.sh") | crontab -
```

## Cost Optimization

### 1. Use Spot Instances
- Save up to 90% on EC2 costs
- Suitable for development/testing

### 2. Stop Instance When Not in Use
```bash
# Stop instance (data persists)
aws ec2 stop-instances --instance-ids YOUR_INSTANCE_ID
```

### 3. Use Reserved Instances
- Save up to 75% for 1-3 year commitments
- Good for production deployments

## ESP32 Configuration for AWS

Update your ESP32 firmware to connect to AWS backend:

```cpp
// In smart_home.ino
const char* SERVER_IP = "YOUR_EC2_PUBLIC_IP";  // Replace with your EC2 IP
const int SERVER_PORT = 8000;
```

## Mobile Access

Your smart home will be accessible from anywhere:
- Frontend: `http://YOUR_EC2_PUBLIC_IP`
- Use the QR code feature to share with family members

## Support & Troubleshooting

For issues:
1. Check logs: `docker-compose logs -f`
2. Verify security groups allow traffic
3. Ensure Ollama is running: `sudo systemctl status ollama`
4. Check disk space: `df -h`
5. Monitor resources: `htop`

## Quick Reference Commands

```bash
# Start application
cd /opt/smart_home && docker-compose up -d

# Stop application
cd /opt/smart_home && docker-compose down

# Restart application
cd /opt/smart_home && docker-compose restart

# View logs
cd /opt/smart_home && docker-compose logs -f

# Update application
cd /opt/smart_home && git pull && docker-compose up -d --build

# Check status
docker-compose ps
sudo systemctl status smart-home.service
```
