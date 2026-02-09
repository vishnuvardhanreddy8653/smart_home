# AWS Amazon Linux Deployment Guide

Quick guide to deploy your Smart Home application on AWS EC2 with Amazon Linux 2023.

## Prerequisites

- AWS EC2 instance running Amazon Linux 2023
- SSH access to your instance
- Security group allowing ports: 80 (HTTP), 8000 (Backend API)

## Quick Start

### 1. Connect to Your EC2 Instance

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
```

### 2. Upload Your Code

**Option A: Using SCP (from your Windows machine)**
```powershell
scp -i your-key.pem -r c:\Users\vishnu\Desktop\electrocoders\smart_home ec2-user@your-ec2-ip:~/
```

**Option B: Using Git (on EC2)**
```bash
git clone https://github.com/your-username/smart_home.git
cd smart_home
```

### 3. Run the Setup Script

```bash
cd smart_home
chmod +x deploy_aws_setup.sh
./deploy_aws_setup.sh
```

This script installs:
- ✅ Docker Engine
- ✅ Docker Compose
- ✅ Git
- ✅ Ollama (optional, for AI features)

### 4. Log Out and Back In

```bash
exit
ssh -i your-key.pem ec2-user@your-ec2-ip
```

This is required for Docker group permissions to take effect.

### 5. Build and Deploy

```bash
cd smart_home

# Build the containers
docker-compose build

# Start the application
docker-compose up -d

# Check status
docker-compose ps
```

### 6. Access Your Application

```
http://your-ec2-public-ip/
```

## Manual Installation (Alternative)

If you prefer to install dependencies manually:

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo yum install -y git

# Optional: Install Ollama
curl -fsSL https://ollama.com/install.sh | sh
ollama pull mistral

# Log out and back in
exit
```

## AWS Security Group Configuration

Ensure your EC2 security group allows:

| Type | Protocol | Port | Source |
|------|----------|------|--------|
| HTTP | TCP | 80 | 0.0.0.0/0 |
| Custom TCP | TCP | 8000 | 0.0.0.0/0 |
| SSH | TCP | 22 | Your IP |

## Useful Commands

```bash
# View logs
docker-compose logs -f

# Stop application
docker-compose down

# Restart application
docker-compose restart

# Rebuild after code changes
docker-compose down
docker-compose build
docker-compose up -d

# Check container status
docker-compose ps

# View backend logs
docker-compose logs backend

# View frontend logs
docker-compose logs frontend
```

## Auto-Start on Reboot

To make your application start automatically when EC2 reboots:

```bash
# Create systemd service
sudo nano /etc/systemd/system/smart-home.service
```

Paste this content:
```ini
[Unit]
Description=Smart Home Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ec2-user/smart_home
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=ec2-user

[Install]
WantedBy=multi-user.target
```

Enable the service:
```bash
sudo systemctl enable smart-home.service
sudo systemctl start smart-home.service
```

## Troubleshooting

### Docker permission denied
```bash
# Make sure you logged out and back in after setup
# Or run:
newgrp docker
```

### Port already in use
```bash
# Check what's using the port
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :8000

# Stop conflicting services
sudo systemctl stop nginx  # if nginx is running
```

### Containers won't start
```bash
# Check logs
docker-compose logs

# Check Docker status
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker
```

## Performance Optimization

For production use, consider:

1. **Use an Application Load Balancer** for HTTPS and better traffic management
2. **Enable CloudWatch logs** for monitoring
3. **Use RDS** instead of SQLite for better database performance
4. **Set up auto-scaling** for high traffic
5. **Use ElastiCache** for session management

## Cost Optimization

- Use **t3.micro** or **t3.small** for testing (Free tier eligible)
- Use **t3.medium** for production with moderate traffic
- Enable **EC2 Auto Scaling** to handle traffic spikes
- Use **Spot Instances** for development environments

## Next Steps

1. Set up HTTPS with Let's Encrypt
2. Configure domain name with Route 53
3. Set up automated backups for database
4. Configure CloudWatch alarms
5. Set up CI/CD pipeline with CodePipeline
