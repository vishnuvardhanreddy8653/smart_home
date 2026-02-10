#!/bin/bash

# Smart Home SSL/TLS Certificate Generation Script
# This script generates self-signed certificates for development/testing

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR/certs"

echo "🔐 Smart Home SSL/TLS Certificate Generator"
echo "=============================================="
echo ""

# Check if certificates already exist
if [ -f "$CERT_DIR/cert.pem" ] && [ -f "$CERT_DIR/key.pem" ]; then
    echo "⚠️  Certificates already exist in $CERT_DIR"
    read -p "Do you want to regenerate them? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "✅ Using existing certificates"
        exit 0
    fi
    echo "🗑️  Removing old certificates..."
    rm -f "$CERT_DIR/cert.pem" "$CERT_DIR/key.pem"
fi

# Create certs directory if it doesn't exist
mkdir -p "$CERT_DIR"

echo "📝 Please answer the following questions to generate your certificate:"
echo ""

read -p "Country (e.g., US): " COUNTRY
read -p "State/Province (e.g., California): " STATE
read -p "City (e.g., San Francisco): " CITY
read -p "Organization (e.g., Smart Home): " ORG
read -p "Organizational Unit (e.g., IoT): " OU
read -p "Common Name - Domain or Hostname (e.g., localhost, yourdomain.com): " CN
read -p "Email Address: " EMAIL
read -p "Validity in days (e.g., 365): " DAYS

# Validate inputs
if [ -z "$COUNTRY" ] || [ -z "$STATE" ] || [ -z "$CITY" ] || [ -z "$ORG" ] || [ -z "$CN" ]; then
    echo "❌ Error: Please provide all required information"
    exit 1
fi

DAYS=${DAYS:-365}

echo ""
echo "🔑 Generating certificate with the following details:"
echo "  Country: $COUNTRY"
echo "  State: $STATE"
echo "  City: $CITY"
echo "  Organization: $ORG"
echo "  Unit: $OU"
echo "  Common Name: $CN"
echo "  Email: $EMAIL"
echo "  Valid for: $DAYS days"
echo ""

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -nodes \
    -out "$CERT_DIR/cert.pem" \
    -keyout "$CERT_DIR/key.pem" \
    -days "$DAYS" \
    -subj "/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=$CN/emailAddress=$EMAIL"

# Set proper permissions
chmod 644 "$CERT_DIR/cert.pem"
chmod 644 "$CERT_DIR/key.pem"

echo ""
echo "✅ Certificate generation completed!"
echo ""
echo "📂 Certificate files created:"
echo "   - $CERT_DIR/cert.pem (Certificate)"
echo "   - $CERT_DIR/key.pem (Private Key)"
echo ""

# Display certificate info
echo "📋 Certificate Information:"
openssl x509 -in "$CERT_DIR/cert.pem" -text -noout | grep -A 2 "Subject:\|Issuer:\|Not Before:\|Not After:"

echo ""
echo "🚀 Next steps:"
echo "   1. Update frontend/nginx.conf if certificate paths changed"
echo "   2. Run: docker-compose up --build"
echo "   3. Access: https://localhost"
echo ""
echo "⚠️  Note: Self-signed certificate will trigger browser warnings"
echo "   Click 'Advanced' and 'Proceed to localhost' to continue"
echo ""

