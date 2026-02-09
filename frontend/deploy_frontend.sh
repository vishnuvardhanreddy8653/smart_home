#!/bin/bash
# Frontend deployment script for AWS Amazon Linux 2023

set -e

echo "========================================="
echo "Smart Home Frontend Deployment"
echo "========================================="

# Navigate to frontend directory
cd /opt/smart_home/frontend

# Build Docker image
echo "Building frontend Docker image..."
docker build -t smart_home_frontend:latest .

# Stop existing container if running
echo "Stopping existing frontend container..."
docker stop smart_home_frontend 2>/dev/null || true
docker rm smart_home_frontend 2>/dev/null || true

# Run new container
echo "Starting frontend container..."
docker run -d \
    --name smart_home_frontend \
    --restart always \
    -p 80:80 \
    --network smart_home_network \
    --log-driver json-file \
    --log-opt max-size=10m \
    --log-opt max-file=3 \
    smart_home_frontend:latest

# Wait for container to be healthy
echo "Waiting for frontend to be healthy..."
sleep 5

# Check health
if docker exec smart_home_frontend curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✓ Frontend is healthy!"
else
    echo "✗ Frontend health check failed"
    docker logs smart_home_frontend
    exit 1
fi

echo "========================================="
echo "Frontend deployment complete!"
echo "Access at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'localhost')"
echo "========================================="
