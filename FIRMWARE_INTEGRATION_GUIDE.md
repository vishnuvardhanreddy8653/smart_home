# Smart Home Firmware - Integration Guide

## Overview

The firmware (Arduino/ESP32/ESP8266) needs to be updated to work with the new Smart Home Frontend. The firmware acts as the hardware controller that:

1. Receives commands from the backend API
2. Controls physical devices (relays, lights, fans)
3. Reports device states back to the backend
4. Supports both HTTP polling and WebSocket real-time updates

## Architecture

```
┌─────────────────┐
│   Frontend      │
│  (app.js)       │
└────────┬────────┘
         │ HTTP/WebSocket
         │ REST API: /api/device/*
         │ WS: ws://localhost:3000
         ▼
┌─────────────────┐
│    Backend      │
│  (Node.js/      │
│   Python)       │
└────────┬────────┘
         │ HTTP/Serial
         │ WiFi Connection
         ▼
┌─────────────────┐
│   Firmware      │ ◄─── Arduino/ESP32/ESP8266
│  (IoT Device)   │
│                 │
│  GPIO→Relays    │
└─────────────────┘
```

## API Changes Required

### Old Implementation
```cpp
// Polling format: action:device
// Example: "turn_on:light"
```

### New Implementation
```cpp
// REST API endpoint format
// POST /api/device/:deviceId
// Body: { "deviceId": "light", "state": true }
// Response: { "success": true }

// Device IDs (matching frontend):
// - light (Bedroom Light)
// - kitchen (Kitchen Light)
// - fan (Living Room Fan)
```

## Updated Arduino Code

### Step 1: WiFi + HTTP Setup (Updated)

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>  // Add: npm install ArduinoJson

/* ========= WiFi Credentials ========= */
const char* SSID = "YOUR_WIFI_SSID";
const char* PASSWORD = "YOUR_WIFI_PASSWORD";

/* ========= Server Configuration ========= */
const char* BACKEND_HOST = "192.168.1.100";  // Backend IP address
const int BACKEND_PORT = 3000;
const char* API_ENDPOINT = "http://192.168.1.100:3000/api/device";

/* ========= GPIO Pin Mapping ========= */
#define LIGHT_PIN       23    // Bedroom Light
#define KITCHEN_PIN     4     // Kitchen Light
#define FAN_PIN         5     // Living Room Fan

HTTPClient http;

/* ========= Initialize Pins ========= */
void setupPins() {
  pinMode(LIGHT_PIN, OUTPUT);
  pinMode(KITCHEN_PIN, OUTPUT);
  pinMode(FAN_PIN, OUTPUT);
  
  // Set all devices to OFF (LOW = OFF, HIGH = ON for most relays)
  digitalWrite(LIGHT_PIN, LOW);
  digitalWrite(KITCHEN_PIN, LOW);
  digitalWrite(FAN_PIN, LOW);
  
  Serial.println("✅ GPIO pins initialized");
}

/* ========= Connect to WiFi ========= */
void connectWiFi() {
  Serial.print("📡 Connecting to WiFi: ");
  Serial.println(SSID);
  
  WiFi.begin(SSID, PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("📍 Device IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
  }
}

/* ========= Control Device ========= */
void controlDevice(String deviceId, bool state) {
  int pin = -1;
  String deviceName = "";
  
  if (deviceId == "light") {
    pin = LIGHT_PIN;
    deviceName = "Bedroom Light";
  } else if (deviceId == "kitchen") {
    pin = KITCHEN_PIN;
    deviceName = "Kitchen Light";
  } else if (deviceId == "fan") {
    pin = FAN_PIN;
    deviceName = "Living Room Fan";
  } else {
    Serial.println("⚠️ Unknown device: " + deviceId);
    return;
  }
  
  digitalWrite(pin, state ? HIGH : LOW);
  Serial.printf("✅ %s turned %s\n", deviceName.c_str(), state ? "ON" : "OFF");
}

/* ========= Handle API Request from Backend ========= */
void handleApiRequest(String deviceId, bool state) {
  String url = String(API_ENDPOINT) + "/" + deviceId;
  
  // Create JSON payload
  StaticJsonDocument<200> doc;
  doc["deviceId"] = deviceId;
  doc["state"] = state;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.println("🔄 Sending API request...");
  Serial.println("📤 URL: " + url);
  Serial.println("📤 Payload: " + jsonPayload);
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.POST(jsonPayload);
  
  if (httpCode > 0) {
    Serial.printf("🌐 HTTP Status: %d\n", httpCode);
    
    if (httpCode == HTTP_CODE_OK) {
      String response = http.getString();
      Serial.println("📥 Response: " + response);
      
      // Control the physical device
      controlDevice(deviceId, state);
    } else {
      Serial.println("⚠️ Server error response");
    }
  } else {
    Serial.println("❌ HTTP request failed: " + http.errorToString(httpCode));
  }
  
  http.end();
}

/* ========= Poll Backend for Commands (Optional) ========= */
void pollBackendStatus() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnected - reconnecting...");
    connectWiFi();
    return;
  }
  
  String url = String(API_ENDPOINT) + "/light";  // Example: get light status
  
  http.begin(url);
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    Serial.println("📥 Status: " + response);
    
    // Parse response and update device state
    StaticJsonDocument<200> doc;
    deserializeJson(doc, response);
    
    bool state = doc["state"];
    // Optionally sync GPIO state
    digitalWrite(LIGHT_PIN, state ? HIGH : LOW);
  }
  
  http.end();
}

/* ========= Setup Function ========= */
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n╔════════════════════════════════════════════╗");
  Serial.println("║    🏠 Smart Home IoT Device Controller     ║");
  Serial.println("║         ESP32 Firmware v2.0                ║");
  Serial.println("╚════════════════════════════════════════════╝\n");
  
  setupPins();
  connectWiFi();
  
  Serial.println("✅ Initialization complete!");
}

/* ========= Main Loop ========= */
void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    delay(5000);
    connectWiFi();
    return;
  }
  
  // Optional: Poll backend for status updates
  pollBackendStatus();
  
  delay(5000);  // Poll every 5 seconds
}
```

## WebSocket Support (Optional - Advanced)

For real-time updates without polling, add WebSocket support:

```cpp
#include <WebSocketsClient.h>  // Install: arduino-websocket library

WebSocketsClient webSocket;
bool wsConnected = false;

/* ========= WebSocket Event Handler ========= */
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  
  switch (type) {
    case WStype_DISCONNECTED:
      wsConnected = false;
      Serial.println("❌ WebSocket disconnected");
      break;
      
    case WStype_CONNECTED:
      wsConnected = true;
      Serial.println("✅ WebSocket connected!");
      // Register this device
      webSocket.sendTXT("{\"action\":\"register\",\"deviceId\":\"esp32-001\"}");
      break;
      
    case WStype_TEXT:
      Serial.println("📥 WebSocket message: " + String((char*)payload));
      handleWebSocketMessage((char*)payload);
      break;
      
    case WStype_BIN:
      Serial.println("📥 WebSocket binary data received");
      break;
  }
}

/* ========= Handle WebSocket Message ========= */
void handleWebSocketMessage(char* payload) {
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload);
  
  if (error) {
    Serial.println("❌ JSON parse error");
    return;
  }
  
  // Expected message format:
  // {"deviceId": "light", "state": true}
  
  String deviceId = doc["deviceId"].as<String>();
  bool state = doc["state"].as<bool>();
  
  controlDevice(deviceId, state);
}

/* ========= Connect to WebSocket ========= */
void connectWebSocket() {
  webSocket.begin(BACKEND_HOST, BACKEND_PORT, "/");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);  // Reconnect every 5 seconds
}

// Update setup():
void setup() {
  // ... existing code ...
  connectWebSocket();
}

// Update loop():
void loop() {
  webSocket.loop();
  // ... rest of loop ...
}
```

## Hardware Setup

### GPIO Pin Configuration

| Device | Pin | Relay | Expected Behavior |
|--------|-----|-------|-------------------|
| Bedroom Light | GPIO 23 | Relay 1 | HIGH=ON, LOW=OFF |
| Kitchen Light | GPIO 4 | Relay 2 | HIGH=ON, LOW=OFF |
| Living Room Fan | GPIO 5 | Relay 3 | HIGH=ON, LOW=OFF |

### Wiring Diagram

```
ESP32 Module
├── GPIO 23 --[Relay Module Pin 1]--[220V AC Light]
├── GPIO 4  --[Relay Module Pin 2]--[220V AC Light]
├── GPIO 5  --[Relay Module Pin 3]--[220V AC Fan]
├── GND ----[Relay Common Ground]
└── 3.3V ---[Relay VCC]

WiFi
├── WiFi Router (2.4GHz)
└── Connected via onboard antenna
```

## Installation Steps

### 1. Install Required Libraries (Arduino IDE)

```
Sketch → Include Library → Manage Libraries
- Search "ArduinoJson" → Install (version 6.x)
- Search "WebSockets" → Install (optional)
- Search "HTTPClient" → Already included in ESP32
```

### 2. Configuration

Edit these variables in your code:

```cpp
const char* SSID = "your_wifi_network";           // WiFi network name
const char* PASSWORD = "your_wifi_password";      // WiFi password
const char* BACKEND_HOST = "192.168.1.100";       // Backend server IP
const int BACKEND_PORT = 3000;                    // Backend server port
```

### 3. Flash to ESP32

1. Connect ESP32 via USB
2. Select Board: Tools → Board → esp32 → "ESP32 Dev Module"
3. Select Port: Tools → Port → COM3 (or your port)
4. Click Upload

### 4. Monitor Serial Output

Open Serial Monitor (Tools → Serial Monitor)
- Baud Rate: 115200
- Watch for connection messages

## Testing Procedure

### Test 1: WiFi Connection
```
Expected output:
📡 Connecting to WiFi: YOUR_WIFI_SSID
✅ WiFi Connected!
📍 Device IP: 192.168.x.x
```

### Test 2: Device Control via Frontend
1. Open dashboard at `http://localhost:8000/dashboard.html`
2. Toggle bedroom light
3. Check Serial Monitor - should show: `✅ Bedroom Light turned ON`

### Test 3: Voice Command
1. Click microphone button
2. Say: "turn on kitchen light"
3. Check frontend and hardware response

### Test 4: Manual HTTP Request

```bash
# From computer terminal:
curl -X POST http://192.168.1.100:3000/api/device/light \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"light","state":true}'

# Expected response:
# {"success":true,"deviceId":"light","state":true}
```

### Test 5: WebSocket Connection (if enabled)

```javascript
// In browser console:
const ws = new WebSocket('ws://192.168.1.100:3000');
ws.onopen = () => {
  ws.send(JSON.stringify({deviceId: 'light', state: true}));
};
```

## Device IDs Mapping

| Frontend Name | Device ID | Hardware Pin | Default State |
|---|---|---|---|
| Bedroom Light | `light` | GPIO 23 | OFF |
| Kitchen Light | `kitchen` | GPIO 4 | OFF |
| Living Room Fan | `fan` | GPIO 5 | OFF |

## Firmware Requirements

### Minimum
- ✅ HTTP POST to backend API
- ✅ GPIO control
- ✅ WiFi connectivity
- ✅ Serial debugging

### Recommended
- ✅ JSON payload support
- ✅ Error handling
- ✅ Reconnection logic
- ✅ Status reporting

### Advanced
- ⭐ WebSocket support
- ⭐ Multi-device fallback
- ⭐ OTA (Over-The-Air) updates
- ⭐ Device logging

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "WiFi Connection Failed" | Wrong credentials | Check SSID/Password |
| "HTTP request failed" | Backend not running | Start Node.js server on port 3000 |
| "GPIO pin not responding" | Wrong pin number | Verify pin mapping in hardware |
| "Relay not clicking" | Pin state inverted | Change GPIO to `!state` |
| "Devices toggle randomly" | Brownout detection | Add capacitor to power supply |

## Migration from Old Code

If upgrading from old polling format (`action:device`):

1. **Old Format:**
   ```cpp
   // Received: "turn_on:light"
   ```

2. **New Format:**
   ```cpp
   // POST body: {"deviceId": "light", "state": true}
   // Parse as JSON and extract values
   ```

3. **Update Strategy:**
   - Backup old code
   - Update device control function
   - Test each device individually
   - Verify WebSocket connection (optional)

## Debugging Commands

Run these in Serial Monitor:

```
// Check WiFi status
Serial.println(WiFi.status());
// 0=OFF, 1=SCANNING, 2=FAILED, 3=CONNECTING, 4=CONNECTED

// Check IP address
Serial.println(WiFi.localIP());

// Force reconnect
WiFi.disconnect();
WiFi.begin(SSID, PASSWORD);

// Check free memory
Serial.println(ESP.getFreeHeap());

// Reset device
ESP.restart();
```

## Firmware Update Strategy

### OTA (Over-The-Air) Update
```cpp
#include <ArduinoOTA.h>

void setupOTA() {
  ArduinoOTA.begin();
  Serial.println("🔄 OTA enabled - ready for updates");
}

// Add to loop:
ArduinoOTA.handle();
```

Then upload from Arduino IDE:
```
Tools → Port → Network Ports → ESP32.local
```

## Production Checklist

- [ ] WiFi credentials secure (use environment variables for production)
- [ ] All GPIO pins tested individually
- [ ] Relay modules provide proper isolation
- [ ] Power supply stable (5V, 2A minimum)
- [ ] Error handling for network failures
- [ ] Automatic reconnection implemented
- [ ] Serial logging enabled for debugging
- [ ] Firmware version tracked
- [ ] Backup power supply for critical devices (optional)
- [ ] Network timeout configured

## Security Considerations

⚠️ **Current Implementation**: HTTP (not encrypted)

**For Production:**
1. Use HTTPS with valid SSL certificate
2. Implement API key authentication
3. Validate all incoming commands
4. Rate limit requests (prevent DDoS)
5. Secure WiFi with WPA3 encryption
6. Use hardware security module if available

## Next Steps

1. ✅ Update Arduino code with new API format
2. ✅ Flash firmware to ESP32
3. ✅ Test individual devices
4. ✅ Integrate with frontend
5. ✅ Test voice commands
6. 🔄 Enable WebSocket (optional)
7. 🔄 Implement OTA updates
8. 🔄 Production deployment

## Support Files

- [Arduino Sketch](./arduino/smart_home_https.ino) - Updated
- [Hardware Diagram](./HARDWARE_DIAGRAM.md) - See in project
- [Backend Integration](./FRONTEND_API_REQUIREMENTS.md) - API specs
