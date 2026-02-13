/*
 * Smart Home Backend Server
 * Node.js with Express and WebSocket
 * Compatible with Frontend & Firmware
 * 
 * Install dependencies:
 * npm install express ws cors
 * 
 * Run:
 * node server.js
 * 
 * Server will listen on:
 * - HTTP: http://localhost:3000
 * - WebSocket: ws://localhost:3000
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ============= CONFIGURATION =============
const PORT = 3000;
const HOSTNAME = 'localhost';

// ============= MIDDLEWARE =============
app.use(cors());
app.use(express.json());

// ============= DEVICE STATE STORAGE =============
// In production, use database (MongoDB, PostgreSQL, SQLite)
const deviceStates = {
  light: {
    deviceId: 'light',
    name: 'Bedroom Light',
    state: false,
    lastUpdated: new Date(),
    lastControlledBy: 'system'
  },
  kitchen: {
    deviceId: 'kitchen',
    name: 'Kitchen Light',
    state: false,
    lastUpdated: new Date(),
    lastControlledBy: 'system'
  },
  fan: {
    deviceId: 'fan',
    name: 'Living Room Fan',
    state: false,
    lastUpdated: new Date(),
    lastControlledBy: 'system'
  }
};

// ============= REQUEST LOGGING =============
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
  next();
});

// ============= HELPER FUNCTIONS =============

// Broadcast message to all WebSocket clients
function broadcastToClients(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Validate device ID
function isValidDeviceId(deviceId) {
  return ['light', 'kitchen', 'fan'].includes(deviceId);
}

// ============= REST API ENDPOINTS =============

// ===== POST: Toggle Device =====
app.post('/api/device/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const { state } = req.body;

  // Validate input
  if (!isValidDeviceId(deviceId)) {
    return res.status(404).json({
      success: false,
      error: 'Device not found',
      deviceId
    });
  }

  if (typeof state !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'Invalid state - must be boolean (true/false)',
      received: typeof state
    });
  }

  // Update device state
  const device = deviceStates[deviceId];
  const previousState = device.state;
  device.state = state;
  device.lastUpdated = new Date();
  device.lastControlledBy = 'frontend';

  console.log(`  ✅ ${device.name}: ${previousState} → ${state}`);

  // Broadcast to WebSocket clients
  broadcastToClients({
    type: 'device_update',
    deviceId,
    state,
    timestamp: device.lastUpdated
  });

  // Send response to frontend
  res.json({
    success: true,
    deviceId,
    state,
    device: {
      name: device.name,
      state: state,
      lastUpdated: device.lastUpdated
    }
  });
});

// ===== GET: Get Device Status =====
app.get('/api/device/:deviceId', (req, res) => {
  const { deviceId } = req.params;

  if (!isValidDeviceId(deviceId)) {
    return res.status(404).json({
      success: false,
      error: 'Device not found'
    });
  }

  const device = deviceStates[deviceId];

  res.json({
    success: true,
    deviceId,
    name: device.name,
    state: device.state,
    lastUpdated: device.lastUpdated,
    lastControlledBy: device.lastControlledBy
  });
});

// ===== GET: Get All Devices =====
app.get('/api/devices', (req, res) => {
  const devices = Object.values(deviceStates).map(device => ({
    deviceId: device.deviceId,
    name: device.name,
    state: device.state,
    lastUpdated: device.lastUpdated,
    lastControlledBy: device.lastControlledBy
  }));

  res.json({
    success: true,
    count: devices.length,
    devices
  });
});

// ===== GET: Server Status =====
app.get('/api/status', (req, res) => {
  res.json({
    server: 'Smart Home Backend',
    version: '2.0',
    status: 'running',
    uptime: process.uptime(),
    timestamp: new Date(),
    devices: {
      total: Object.keys(deviceStates).length,
      connected: Object.keys(deviceStates).length,
      states: Object.fromEntries(
        Object.entries(deviceStates).map(([id, device]) => [
          id,
          {
            name: device.name,
            state: device.state
          }
        ])
      )
    },
    websocketClients: wss.clients.size
  });
});

// ===== Health Check =====
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date()
  });
});

// ============= WEBSOCKET HANDLING =============

wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress;
  console.log(`\n🔌 WebSocket Client Connected: ${clientIp}`);
  console.log(`   📊 Total clients: ${wss.clients.size}\n`);

  // Send current state to newly connected client
  ws.send(JSON.stringify({
    type: 'initial_state',
    devices: deviceStates
  }));

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      console.log(`📨 WebSocket Message from ${clientIp}:`);
      console.log(`   ${JSON.stringify(message)}`);

      // Expected format: { "deviceId": "light", "state": true }
      if (message.deviceId && typeof message.state === 'boolean') {
        if (isValidDeviceId(message.deviceId)) {
          const device = deviceStates[message.deviceId];
          device.state = message.state;
          device.lastUpdated = new Date();
          device.lastControlledBy = 'websocket';

          console.log(`  ✅ Device updated: ${device.name} → ${message.state}`);

          // Broadcast to all clients
          broadcastToClients({
            type: 'device_update',
            deviceId: message.deviceId,
            state: message.state,
            timestamp: device.lastUpdated
          });
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Unknown device'
          }));
        }
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format'
        }));
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error.message);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid JSON'
      }));
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    console.log(`\n🔌 WebSocket Client Disconnected: ${clientIp}`);
    console.log(`   📊 Remaining clients: ${wss.clients.size}\n`);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket Error: ${error.message}`);
  });
});

// ============= STATIC PAGES =============
// Serve a simple control page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Smart Home Backend</title>
      <style>
        * { font-family: Arial, sans-serif; }
        body { margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .status { padding: 15px; background: #d4edda; border-radius: 5px; margin: 20px 0; }
        .device { padding: 15px; margin: 10px 0; background: #f8f9fa; border-left: 4px solid #007bff; }
        .on { border-left-color: #28a745; }
        button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        button:hover { background: #0056b3; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🏠 Smart Home Backend</h1>
        <div class="status">
          ✅ Server Running on port 3000<br>
          📊 WebSocket Active<br>
          🔌 ${wss.clients.size} clients connected
        </div>
        
        <h2>API Endpoints</h2>
        <ul>
          <li><code>GET /api/devices</code> - Get all device states</li>
          <li><code>GET /api/device/:deviceId</code> - Get specific device</li>
          <li><code>POST /api/device/:deviceId</code> - Update device state</li>
          <li><code>GET /api/status</code> - Server status</li>
          <li><code>WS /</code> - WebSocket connection</li>
        </ul>

        <h2>Quick Control</h2>
        <div class="device">
          <strong>Bedroom Light</strong>
          <button onclick="toggleDevice('light', true)">ON</button>
          <button onclick="toggleDevice('light', false)">OFF</button>
        </div>
        <div class="device">
          <strong>Kitchen Light</strong>
          <button onclick="toggleDevice('kitchen', true)">ON</button>
          <button onclick="toggleDevice('kitchen', false)">OFF</button>
        </div>
        <div class="device">
          <strong>Living Room Fan</strong>
          <button onclick="toggleDevice('fan', true)">ON</button>
          <button onclick="toggleDevice('fan', false)">OFF</button>
        </div>

        <h2>Device States</h2>
        <div id="states"></div>

        <h2>Logs</h2>
        <pre id="logs" style="background: #f0f0f0; padding: 15px; border-radius: 5px; max-height: 200px; overflow-y: auto;"></pre>
      </div>

      <script>
        // Update device status
        function updateStatus() {
          fetch('/api/devices')
            .then(r => r.json())
            .then(data => {
              const html = data.devices.map(d => 
                '<div class="device ' + (d.state ? 'on' : '') + '">' +
                '<strong>' + d.name + '</strong>: ' + (d.state ? '✅ ON' : '❌ OFF') +
                '</div>'
              ).join('');
              document.getElementById('states').innerHTML = html;
            });
        }

        // Toggle device
        function toggleDevice(deviceId, state) {
          fetch('/api/device/' + deviceId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deviceId, state })
          })
          .then(r => r.json())
          .then(() => updateStatus());
        }

        // Update immediately and every 2 seconds
        updateStatus();
        setInterval(updateStatus, 2000);
      </script>
    </body>
    </html>
  `);
});

// ============= 404 HANDLER =============
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
    message: 'This endpoint does not exist'
  });
});

// ============= ERROR HANDLER =============
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// ============= START SERVER =============
server.listen(PORT, HOSTNAME, () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   🏠 Smart Home Backend Server            ║');
  console.log('║         Node.js + Express                 ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('\n📡 Server Configuration:');
  console.log(`   HTTP: http://${HOSTNAME}:${PORT}`);
  console.log(`   WebSocket: ws://${HOSTNAME}:${PORT}`);
  console.log('\n📋 API Endpoints:');
  console.log('   GET  /api/devices');
  console.log('   GET  /api/device/:deviceId');
  console.log('   POST /api/device/:deviceId');
  console.log('   GET  /api/status');
  console.log('\n🌐 Open http://localhost:3000 in browser for dashboard');
  console.log('\n⏳ Waiting for connections...\n');
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
