# Arduino/Firmware Quick Setup

## Files Included

1. **smart_home_iot_controller.ino** - Updated firmware for ESP32
   - HTTP POST API support
   - GPIO device control
   - Serial command interface
   - WiFi connectivity
   - Production-ready

## Hardware Requirements

### Electronics
- **ESP32 Development Board** (or compatible)
- **3-Channel Relay Module** (5V or 3.3V)
- **USB Cable** (Type-A to Micro-USB)
- **Breadboard** (optional, for testing)
- **Jumper Wires**

### Power
- 5V USB power supply (for development)
- 220V AC power supply (for relays, production)
- Capacitors (2x 100µF) for power stability

### Networking
- WiFi router (2.4GHz, WPA2/WPA3)
- Backend server running on same network

## Step 1: Install Arduino IDE

1. Download [Arduino IDE 2.0](https://www.arduino.cc/en/software)
2. Install on your computer
3. Launch Arduino IDE

## Step 2: Install ESP32 Board Support

1. Open Arduino IDE
2. Go to **File → Preferences**
3. In "Additional Boards Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click OK
5. Go to **Tools → Board → Boards Manager**
6. Search for "ESP32"
7. Install "ESP32 by Espressif Systems"
8. Click Close

## Step 3: Install Required Libraries

1. Go to **Sketch → Include Library → Manage Libraries**
2. Search and install these libraries:
   - **ArduinoJson** (by Benoit Blanchon) - version 6.x
   - Other libraries are built-in

Installation steps:
```
Sketch → Include Library → Manage Libraries
Search: "ArduinoJson"
Click "Install"
```

## Step 4: Configure the Sketch

Open `smart_home_iot_controller.ino` and update:

```cpp
// Line 11-12: Your WiFi credentials
const char* SSID = "YOUR_WIFI_NETWORK";
const char* PASSWORD = "YOUR_WIFI_PASSWORD";

// Line 15-17: Backend server address
const char* BACKEND_HOST = "192.168.1.100";      // Change to your backend IP
const int BACKEND_PORT = 3000;
const char* API_BASE = "http://192.168.1.100:3000/api/device";
```

**How to find your backend server IP:**
```bash
# On Linux/Mac:
hostname -I

# On Windows (Command Prompt):
ipconfig
# Look for IPv4 Address

# Or use your backend's reported IP
```

## Step 5: Connect ESP32 to Computer

1. Connect ESP32 via USB cable
2. Wait for drivers to install
3. Go to **Tools → Port**
4. Select your COM port (usually COM3 or COM4 on Windows)

## Step 6: Select Board

1. Go to **Tools → Board → esp32**
2. Select **"ESP32 Dev Module"** (or your specific board)

Verified Settings:
```
Board: ESP32 Dev Module
Upload Speed: 115200
CPU Frequency: 80MHz
Flash Frequency: 40MHz
Flash Mode: DIO
Flash Size: 4MB
Partition Scheme: Default
PSRAM: Disabled
```

## Step 7: Upload Sketch

1. Click **Sketch → Upload** (or Ctrl+U)
2. Wait for "Uploading..." message
3. Once complete, you should see:
   ```
   Leaving... 
   Hard resetting via RTS pin...
   ```

## Step 8: Open Serial Monitor

1. Go to **Tools → Serial Monitor** (or Ctrl+Shift+M)
2. Set baud rate to **115200**
3. You should see startup messages:
   ```
   ╔════════════════════════════════════════════╗
   ║   🏠 Smart Home IoT Device Controller      ║
   ║         ESP32 Firmware v2.0                ║
   ╚════════════════════════════════════════════╝
   
   📡 Connecting to WiFi: YOUR_NETWORK
   ✅ WiFi Connected Successfully!
   ```

## Testing via Serial Monitor

Once connected, you can test commands directly:

### Test 1: Turn on Bedroom Light
```
Input:  light-on
Output: ✅ Bedroom Light -> ON (GPIO 23)
```

### Test 2: Turn off Kitchen Light
```
Input:  kitchen-off
Output: ✅ Kitchen Light -> OFF (GPIO 4)
```

### Test 3: Turn on Fan
```
Input:  fan-on
Output: ✅ Living Room Fan -> ON (GPIO 5)
```

### Test 4: Check Device Status
```
Input:  status
Output: 
📊 Current Device States:
  Bedroom Light: ON ✅
  Kitchen Light: OFF ❌
  Living Room Fan: ON ✅
```

### Test 5: WiFi Status
```
Input:  wifi
Output:
WiFi Status: Connected ✅
IP: 192.168.1.123
```

### Test 6: Get Help
```
Input:  help
Output: 
📖 Available Commands:
  light-on    : Turn on bedroom light
  light-off   : Turn off bedroom light
  kitchen-on  : Turn on kitchen light
  kitchen-off : Turn off kitchen light
  fan-on      : Turn on living room fan
  fan-off     : Turn off living room fan
  status      : Show all device states
  wifi        : Show WiFi status
  reset       : Restart device
  help        : Show this help message
```

## GPIO Pin Mapping

| Device | GPIO Pin | Relay Channel |
|--------|----------|---------------|
| Bedroom Light | 23 | Ch1 |
| Kitchen Light | 4 | Ch2 |
| Living Room Fan | 5 | Ch3 |

**To change pins:** Edit lines 22-24 in the sketch

## Troubleshooting

### Issue: "Port not found"
- **Solution**: Connect ESP32 with USB cable, wait 2 seconds, try again
- ESP32 may need CH340 USB driver for Windows

### Issue: "Upload failed"
- **Solution**: 
  - Try different USB cable
  - Press and hold BOOT button while uploading
  - Select different upload speed

### Issue: "WiFi Connected Failed"
- **Solution**:
  - Check SSID and password
  - Ensure 2.4GHz WiFi (not 5GHz)
  - Move ESP32 closer to router

### Issue: "Cannot reach backend"
- **Solution**:
  - Verify backend is running on port 3000
  - Check firewall allows port 3000
  - Verify ESP32 and backend are on same network
  - Test: `ping 192.168.1.100` from computer

### Issue: "Relay not switching"
- **Solution**:
  - Check GPIO pins connected to relay
  - Verify relay module power (VCC + GND)
  - Test with LED instead of relay
  - Check relay pin states in serial output

## Integration with Frontend

1. **Backend Running:**
   ```bash
   node server.js
   # Running on http://localhost:3000
   ```

2. **Frontend Loaded:**
   ```
   http://localhost:8000/dashboard.html
   ```

3. **Toggle Device in Frontend:**
   - Device state sends to backend
   - Backend forwards to ESP32
   - GPIO pin controls relay
   - Relay switches AC device

**Flow:**
```
Frontend → Backend → ESP32 → Relay → AC Device
```

## Advanced: WebSocket Support

For real-time updates without polling, add WebSocket library:

```
Sketch → Include Library → Manage Libraries
Search: "WebSockets"
Install: "WebSockets by Markus Sattler"
```

Then uncomment WebSocket code in firmware guide.

## OTA Updates (Over-The-Air)

Update firmware without USB cable:

1. Go to **Tools → Port → Network Ports**
2. Your ESP32 should appear as a network device
3. Select it and upload normally

**First time setup required via USB.**

## Production Checklist

- [ ] WiFi credentials set
- [ ] Backend IP address correct
- [ ] GPIO pins mapped correctly
- [ ] Relay modules tested
- [ ] All devices toggle correctly
- [ ] Serial monitor shows "✅ WiFi Connected"
- [ ] Frontend can control devices
- [ ] Voice commands work
- [ ] Power supply stable
- [ ] Device auto-reconnects on network loss

## Example Integration Test

1. **Terminal 1** (Backend):
   ```bash
   node server.js
   # Listening on :3000
   ```

2. **Arduino IDE**:
   - Upload sketch to ESP32
   - Open Serial Monitor
   - Wait for WiFi connection

3. **Terminal 2** (Test HTTP):
   ```bash
   curl -X POST http://192.168.1.100:3000/api/device/light \
     -H "Content-Type: application/json" \
     -d '{"deviceId":"light","state":true}'
   ```

4. **Expected Result**:
   - Serial Monitor shows command received
   - Relay clicks (device turns on)
   - HTTP response: `{"success":true}`

5. **Browser** (Frontend):
   - Open dashboard
   - Click device toggle
   - Should control ESP32 device

## Support

For issues:
1. Check Serial Monitor output
2. Verify WiFi connection
3. Test backend separately
4. Check GPIO pin wiring
5. Review [FIRMWARE_INTEGRATION_GUIDE.md](./FIRMWARE_INTEGRATION_GUIDE.md)

## Next Steps

- ✅ Flash firmware to ESP32
- ✅ Test via Serial Monitor
- ✅ Connect relay modules
- ✅ Test from frontend dashboard
- ✅ Test voice commands
- 🔄 Deploy to production
