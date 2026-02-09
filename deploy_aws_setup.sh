#!/bin/bash
# AWS Amazon Linux 2023 Setup Script for Smart Home Application
# Run this script on your EC2 instance to install all dependencies

set -e  # Exit on error

echo "=========================================="
echo "Smart Home AWS Deployment Setup"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo "❌ Please do not run this script as root"
    echo "Run as: ./deploy_aws_setup.sh"
    exit 1
fi

echo "📦 Step 1: Updating system packages..."
sudo yum update -y

echo ""
echo "🐳 Step 2: Installing Docker..."
if ! command -v docker &> /dev/null; then
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    echo "✅ Docker installed successfully"
else
    echo "✅ Docker already installed"
fi

echo ""
echo "👥 Step 3: Adding user to docker group..."
sudo usermod -a -G docker $USER
echo "✅ User added to docker group"
echo "⚠️  You need to log out and back in for this to take effect"

echo ""
echo "🔧 Step 4: Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installed successfully"
else
    echo "✅ Docker Compose already installed"
fi

echo ""
echo "📚 Step 5: Installing Git..."
if ! command -v git &> /dev/null; then
    sudo yum install -y git
    echo "✅ Git installed successfully"
else
    echo "✅ Git already installed"
fi

echo ""
echo "🤖 Step 6: Installing Ollama (optional - for AI features)..."
read -p "Do you want to install Ollama for AI voice commands? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if ! command -v ollama &> /dev/null; then
        curl -fsSL https://ollama.com/install.sh | sh
        echo "✅ Ollama installed successfully"
        
        echo "📥 Pulling Mistral model..."
        ollama pull mistral
        echo "✅ Mistral model downloaded"
    else
        echo "✅ Ollama already installed"
    fi
else
    echo "⏭️  Skipping Ollama installation"
fi

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Installed versions:"
docker --version
docker-compose --version
git --version
if command -v ollama &> /dev/null; then
    ollama --version
fi

echo ""
echo "📋 Next Steps:"
echo "1. Log out and back in (for docker group to take effect)"
echo "2. Clone your repository or upload your code"
echo "3. Run: cd smart_home && docker-compose build"
echo "4. Run: docker-compose up -d"
echo ""
echo "🔥 To start deployment now (after re-login):"
echo "   cd /path/to/smart_home"
echo "   docker-compose build"
echo "   docker-compose up -d"
echo ""
