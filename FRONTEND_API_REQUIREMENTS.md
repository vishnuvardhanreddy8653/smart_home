# Smart Home Backend API Requirements

## Overview
The frontend application expects the backend to provide REST API and WebSocket endpoints for managing smart home devices.

## API Endpoints

### Authentication Endpoints
```
POST /auth/signup
- Body: { email: string, password: string, username: string }
- Returns: { success: boolean, message: string }

POST /auth/login
- Body: { email: string, password: string }
- Returns: { success: boolean, token: string, user: { email, username } }
```

### Device Control Endpoints
```
POST /api/device/:deviceId
- Body: { deviceId: string, state: boolean }
- Returns: { success: boolean, deviceId: string, state: boolean }

GET /api/device/:deviceId
- Returns: { deviceId: string, state: boolean, name: string, status: string }

GET /api/devices
- Returns: [{ deviceId, state, name, status, lastUpdated }]
```

## WebSocket Connection

### Connection URL
```
ws://localhost:3000
```

### Message Format
The WebSocket server should send device state changes in JSON format:
```json
{
  "deviceId": "light|kitchen|fan",
  "state": true,
  "timestamp": "2024-02-13T10:30:00Z",
  "source": "voice|manual|external"
}
```

## Supported Devices

### Bedroom Light
- ID: `light`
- Type: Light Switch
- States: On/Off
- Default: Off

### Kitchen Light
- ID: `kitchen`
- Type: Light Switch
- States: On/Off
- Default: Off

### Living Room Fan
- ID: `fan`
- Type: Fan Control
- States: On/Off
- Default: Off

## Frontend to Backend Flow

1. **Device Toggle**: User clicks device card or toggle
   - Frontend sends: `POST /api/device/{deviceId}`
   - Backend updates device state
   - Backend broadcasts via WebSocket to all connected clients

2. **Voice Command**: User speaks a command
   - Frontend recognizes: "turn on bedroom light"
   - Simulates manual toggle (same as step 1)
   - Frontend plays speech response

3. **WebSocket Update**: Backend notifies frontend of state change
   - Useful for multi-client scenarios
   - Updates UI immediately when device changes from another client

## Error Handling

Backend should return standard HTTP status codes:
- 200: Success
- 400: Bad Request (invalid input)
- 401: Unauthorized (authentication failed)
- 404: Not Found (device not found)
- 500: Server Error

## Backend Example (Node.js/Express)

```javascript
// Example device toggle endpoint
app.post('/api/device/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const { state } = req.body;
  
  // Update device state in database
  devices[deviceId].state = state;
  
  // Broadcast to WebSocket clients
  broadcastToClients({
    deviceId: deviceId,
    state: state,
    timestamp: new Date().toISOString()
  });
  
  res.json({ success: true, deviceId, state });
});

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('message', (message) => {
    // Handle client messages if needed
  });
  ws.on('close', () => console.log('Client disconnected'));
});
```

## CORS Configuration

Enable CORS for the frontend domain:
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```
