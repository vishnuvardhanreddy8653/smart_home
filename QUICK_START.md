# Smart Home Frontend - Quick Start Guide

## Installation & Setup

### Requirements
- Modern web browser (Chrome 90+, Edge 90+, Firefox 88+, Safari 14+)
- Basic HTTP server or local development environment
- Backend API server running on `http://localhost:3000`
- WebSocket server running on `ws://localhost:3000`

### Step 1: Set Up Frontend Files

Place all frontend files in a web-accessible directory:
```
smart_home/
├── frontend/
│   ├── app.js                 (440+ lines - Main application)
│   ├── signup.html            (User registration)
│   ├── login.html             (User login)
│   ├── dashboard.html         (Main control panel)
│   └── FRONTEND_README.md     (Documentation)
```

### Step 2: Run Local Server

#### Option A: Using Python
```bash
cd frontend/
python -m http.server 8000
```
Then open: `http://localhost:8000/signup.html`

#### Option B: Using Node.js HTTP Server
```bash
npm install -g http-server
cd frontend/
http-server
```

#### Option C: Using VS Code Live Server
- Install "Live Server" extension in VS Code
- Right-click on signup.html and select "Open with Live Server"

### Step 3: Test the Application

#### Authentication Flow
1. **Sign Up**: Go to `http://localhost:8000/signup.html`
   - Enter: Username, Email, Password
   - Click "Sign Up"
   - Should redirect to login page

2. **Login**: On login page
   - Enter: Same email and password from signup
   - Click "Login"
   - Should redirect to dashboard and play welcome message

3. **Logout**: Click "Logout" button in dashboard
   - Should clear session and return to login page

#### Manual Device Control
1. **Toggle Switches**: Click the toggle switch on any device card
   - Should update status (On/Off)
   - Should send request to backend API
   - Should play audio confirmation

2. **Click Cards**: Click anywhere on device card
   - Should toggle device same as switch
   - Should not toggle if clicking toggle area

#### Voice Control
1. **Activate Microphone**: Click the circular mic button
   - Button should glow/pulse (mic-active class)
   - Should say "Voice recognition activated"
   - Status should change to "Listening..."

2. **Test Voice Commands**:
   ```
   Try these commands:
   
   - "turn on bedroom light"
   - "kitchen light off"
   - "fan on"
   - "living room fan off"
   - "turn on all"
   - "turn off all"
   - "status"
   ```

3. **Deactivate Microphone**: Click mic button again
   - Button should stop glowing
   - Should say "Voice recognition deactivated"
   - Status should change to "Tap mic to Activate"

#### Real-time Updates (WebSocket)
If backend supports WebSocket messages:
1. Open dashboard in two browser windows
2. Toggle device in one window
3. Other window should update automatically
4. Connection status should show "Connected"

---

## Backend Integration Setup

### Create a Simple Backend (Node.js/Express)

Create `backend/server.js`:
```javascript
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Device state storage
const devices = {
  light: { state: false },
  kitchen: { state: false },
  fan: { state: false }
};

// REST API
app.post('/api/device/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  const { state } = req.body;

  if (devices[deviceId] === undefined) {
    return res.status(404).json({ error: 'Device not found' });
  }

  devices[deviceId].state = state;

  // Broadcast to all WebSocket clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        deviceId: deviceId,
        state: state
      }));
    }
  });

  res.json({ success: true, deviceId, state });
});

// Get device status
app.get('/api/device/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  if (devices[deviceId] === undefined) {
    return res.status(404).json({ error: 'Device not found' });
  }
  res.json({ deviceId, state: devices[deviceId].state });
});

// WebSocket
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('message', (message) => {
    console.log('Received:', message);
  });
  ws.on('close', () => console.log('Client disconnected'));
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('WebSocket at ws://localhost:3000');
});
```

Install dependencies:
```bash
npm install express ws cors
```

Run server:
```bash
node server.js
```

---

## Testing Checklist

### Essential Tests
- [ ] Can load signup page
- [ ] Can create new account
- [ ] Can login with created account
- [ ] Redirects to dashboard on successful login
- [ ] Dashboard loads with 3 devices visible
- [ ] Can toggle devices manually
- [ ] Microphone button exists and responds to clicks
- [ ] Page redirects to login if not authenticated

### Voice Feature Tests
- [ ] Microphone button activates voice recognition
- [ ] Can say "turn on light" and device toggles
- [ ] Can say "turn off fan" and device toggles
- [ ] Speech response plays for valid commands
- [ ] Error message plays for invalid commands
- [ ] Can deactivate microphone
- [ ] "Status" command reports device states
- [ ] "Turn on all" activates all devices

### WebSocket Tests
- [ ] Connection status shows "Connected"
- [ ] Remains "Connected" while dashboard is open
- [ ] Shows "Disconnected" if backend is down
- [ ] Receives updates when backend sends messages

### Security Tests
- [ ] Cannot access dashboard without login
- [ ] Logout clears session
- [ ] localStorage has expected values
- [ ] Password is stored (production: replace with tokens)

### Edge Cases
- [ ] Can spam toggle buttons without breaking
- [ ] Can send voice commands rapidly
- [ ] Works with browser back/forward buttons
- [ ] Handles network disconnections gracefully
- [ ] Page works after WebSocket reconnection

---

## Debugging & Troubleshooting

### Check Browser Console
```javascript
// In browser console (F12):

// Check if app is loaded
window.smartHomeApp

// Check login status
localStorage.getItem('isLoggedIn')

// Check user data
localStorage.getItem('userEmail')

// Check WebSocket status
window.smartHomeApp.ws.readyState
// 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED

// Check voice recognition
window.smartHomeApp.speechRecognition.lang
window.smartHomeApp.voiceEnabled

// Test manual commands
window.smartHomeApp.toggleDevice('toggle-light', true)
window.smartHomeApp.speak('Hello, testing speech')
```

### Check Network Requests
1. Open DevTools → Network tab
2. Toggle a device
3. Should see POST request to `http://localhost:3000/api/device/light`
4. Response should be: `{"success":true,"deviceId":"light","state":true}`

### Check WebSocket
1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Should see `ws://localhost:3000` connection
4. Status should be "101 Switching Protocols"

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Voice recognition not supported" | Use Chrome/Edge, enable microphone permissions |
| "WebSocket connection failed" | Start backend server on port 3000 |
| "Login fails after signup" | Clear browser localStorage, try again |
| "Devices don't update" | Check backend API is running, verify endpoint URL |
| "Speech output silent" | Unmute browser, check system volume, test speakers |
| "Mic button doesn't work" | Refresh page, allow microphone permissions |

---

## Performance Testing

### Baseline Metrics
- Page load time: < 2 seconds
- Voice recognition startup: < 1 second
- Device toggle response: < 200ms
- WebSocket message latency: < 100ms

### Stress Testing
```javascript
// Test rapid toggles
for (let i = 0; i < 100; i++) {
  window.smartHomeApp.toggleDevice('toggle-light', Math.random() > 0.5);
}

// Test many voice commands
for (let i = 0; i < 10; i++) {
  window.smartHomeApp.processVoiceCommand('turn on light');
}
```

---

## Production Deployment

### Pre-deployment Checklist
- [ ] Update API URLs from localhost to production server
- [ ] Enable HTTPS (WebSocket should be wss://)
- [ ] Implement proper authentication (JWT tokens)
- [ ] Test all features in staging environment
- [ ] Set up error tracking (Sentry, LogRocket)
- [ ] Configure CORS properly
- [ ] Optimize assets (minify CSS/JS)
- [ ] Set up performance monitoring
- [ ] Test on target devices/browsers
- [ ] Create user documentation

### Deployment Platforms
- **Vercel**: `vercel deploy`
- **Netlify**: Drag & drop or `netlify deploy`
- **AWS S3 + CloudFront**: Static hosting
- **Docker**: See README_DOCKER.md

---

## Next Steps

1. ✅ Set up frontend files
2. ✅ Create backend API (see example above)
3. ✅ Test authentication flow
4. ✅ Test device control
5. ✅ Test voice commands
6. ✅ Run deployment checklist
7. 🚀 Deploy to production

For detailed information, see:
- [FRONTEND_README.md](#) - Complete documentation
- [FRONTEND_API_REQUIREMENTS.md](#) - Backend API specs
- [DATABASE_SCHEMA.md](#) - Database design

Happy automating! 🏠✨
