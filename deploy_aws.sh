#!/bin/bash
# AWS Amazon Linux 2023 Deployment Script for Smart Home System

set -e

echo "========================================="
echo "Smart Home AWS Deployment Script"
echo "========================================="

# Update system
echo "Updating system packages..."
sudo yum update -y

# Install Docker
echo "Installing Docker..."
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Docker Compose
echo "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git (if not already installed)
echo "Installing Git..."
sudo yum install -y git

# Create application directory
echo "Creating application directory..."
sudo mkdir -p /opt/smart_home
sudo chown ec2-user:ec2-user /opt/smart_home
cd /opt/smart_home

# Clone or copy your repository
echo "========================================="
echo "MANUAL STEP REQUIRED:"
echo "Please upload your code to /opt/smart_home"
echo "You can use: scp -r smart_home/ ec2-user@YOUR_EC2_IP:/opt/"
echo "Or clone from git: git clone YOUR_REPO_URL ."
echo "========================================="

# Install Ollama (for AI service)
echo "Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh
sudo systemctl start ollama
sudo systemctl enable ollama

# Pull the AI model
echo "Pulling Mistral model for Ollama..."
ollama pull mistral

# Create database directory
echo "Creating database directory..."
mkdir -p /opt/smart_home/database

# Set proper permissions
sudo chown -R ec2-user:ec2-user /opt/smart_home

echo "========================================="
echo "Installation Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Upload your code to /opt/smart_home"
echo "2. Run: cd /opt/smart_home && docker-compose up -d --build"
echo "3. Check logs: docker-compose logs -f"
echo ""
echo "Access your application at:"
echo "Frontend: http://YOUR_EC2_PUBLIC_IP"
echo "Backend: http://YOUR_EC2_PUBLIC_IP:8000"
echo ""
