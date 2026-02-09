# Production Frontend Dockerfile for AWS Amazon Linux
# Optimized with proper instruction ordering

# Stage 1: Base image
FROM nginx:alpine

# Set working directory
WORKDIR /usr/share/nginx/html

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy custom nginx configuration first
COPY nginx.conf /etc/nginx/nginx.conf

# Copy frontend static files
COPY index.html .
COPY app.js .
COPY *.css . 2>/dev/null || true

# Create non-root user and set permissions
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /usr/share/nginx/html && \
    chown -R appuser:appuser /var/cache/nginx && \
    chown -R appuser:appuser /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appuser /var/run/nginx.pid

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
