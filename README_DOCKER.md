# Smart Home Docker Deployment Guide

## Prerequisites
- Docker Desktop installed (Windows/Mac) or Docker Engine (Linux)
- Docker Compose installed (usually comes with Docker Desktop)

## Quick Start

### 1. Build and Run All Services
```bash
# From the smart_home directory
docker-compose up --build
```

### 2. Run in Background (Detached Mode)
```bash
docker-compose up -d --build
```

### 3. View Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend
```

### 4. Stop Services
```bash
docker-compose down
```

### 5. Stop and Remove Volumes
```bash
docker-compose down -v
```

## Individual Service Commands

### Backend Only
```bash
# Build
docker build -t smart_home_backend ./backend

# Run
docker run -p 8000:8000 smart_home_backend
```

### Frontend Only
```bash
# Build
docker build -t smart_home_frontend ./frontend

# Run
docker run -p 80:80 smart_home_frontend
```

## Accessing the Application

- **Frontend**: http://localhost or http://localhost:80
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Development Mode

For development with hot-reload:
```bash
docker-compose up
```

The backend has `--reload` enabled by default in the Dockerfile.

## Production Deployment

1. Update the backend Dockerfile CMD to remove `--reload`:
   ```dockerfile
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

2. Build and run:
   ```bash
   docker-compose up -d --build
   ```

## Troubleshooting

### Port Already in Use
If port 8000 or 80 is already in use, modify `docker-compose.yml`:
```yaml
ports:
  - "8001:8000"  # Backend on 8001
  - "8080:80"    # Frontend on 8080
```

### Backend Not Connecting to Ollama
Ensure Ollama is running on your host machine and accessible from Docker containers.

### Database Persistence
Database files are stored in `./database` directory and persist across container restarts.

## Network Configuration

Both services run on the `smart_home_network` bridge network, allowing them to communicate using service names:
- Backend accessible at: `http://backend:8000`
- Frontend accessible at: `http://frontend:80`

## Environment Variables

Create a `.env` file in the root directory for custom configuration:
```env
BACKEND_PORT=8000
FRONTEND_PORT=80
```

Then update `docker-compose.yml` to use these variables.
