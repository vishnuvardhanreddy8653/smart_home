#!/bin/bash
# Quick deployment script for AWS
# Run this AFTER running deploy_aws_setup.sh and logging back in

set -e

echo "🚀 Starting Smart Home Deployment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running or you don't have permission"
    echo "💡 Did you log out and back in after running deploy_aws_setup.sh?"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Build containers
echo "🔨 Building Docker containers..."
docker-compose build

echo ""
echo "🚀 Starting application..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "🌐 Access your application at:"
echo "   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)/"
echo ""
echo "📋 Useful commands:"
echo "   docker-compose logs -f     # View logs"
echo "   docker-compose ps          # Check status"
echo "   docker-compose down        # Stop application"
echo "   docker-compose restart     # Restart application"
echo ""
