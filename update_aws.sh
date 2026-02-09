#!/bin/bash
# Quick deployment script for updates

set -e

echo "Updating Smart Home Application..."

cd /opt/smart_home

# Pull latest changes (if using git)
if [ -d .git ]; then
    echo "Pulling latest code..."
    git pull
fi

# Rebuild and restart containers
echo "Rebuilding containers..."
docker-compose down
docker-compose up -d --build

# Wait for services to be healthy
echo "Waiting for services to start..."
sleep 10

# Check status
echo "Checking service status..."
docker-compose ps

echo ""
echo "Update complete!"
echo "Frontend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "Backend: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000"
