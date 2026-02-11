# ESP32 Communication Fix - UPDATED VERSION

## 🎯 What Was Fixed

Your ESP32 was receiving **HTML code** instead of device commands because the `/device` endpoint didn't exist in your backend. This has now been fixed!

## 📝 Changes Made

### 1. Backend (`main.py`)

**Added:**
- ✅ Global `pending_esp32_command` variable to store the latest command
- ✅ New `GET /device` endpoint that returns commands in plain text format
- ✅ Command queue mechanism that clears after ESP32 reads it (one-time delivery)
- ✅ Device name mapping: "kitchen light" → "kitchen" for ESP32 compatibility
- ✅ Support for "all" devices command

**How it works:**
1. When you toggle a device in the web UI, the command is stored in `pending_esp32_command`
2. ESP32 polls `GET /device` every 2 seconds
3. Backend returns the pending command (e.g., `turn_on:light`)
4. Command is cleared after being sent
5. Subsequent polls return `"idle"` until a new command arrives

### 2. ESP32 Arduino Code (`updated_smart_home.ino`)

**Improvements:**
- ✅ Handles `"idle"` response (no command pending)
- ✅ Detects HTML responses and shows helpful error message
- ✅ Supports `"all"` devices command
- ✅ Better error messages and debugging output
- ✅ Proper SSL certificate verification with Let's Encrypt root CA
- ✅ Improved command parsing with whitespace trimming

## 🚀 How to Use

### Step 1: Deploy Updated Backend

You need to redeploy your backend to AWS with the updated `main.py`:

```bash
# SSH into your AWS EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Navigate to your project
cd smart_home

# Pull the latest changes (if using git)
git pull

# Or manually update the main.py file with the new version

# Restart the Docker containers
docker-compose down
docker-compose up -d

# Check logs to verify /device endpoint is working
docker-compose logs -f backend
```

### Step 2: Upload Arduino Code to ESP32

1. **Open Arduino IDE**
2. **Load the file:** `smart_home/arduino/updated_smart_home.ino`
3. **Verify WiFi credentials** are correct:
   ```cpp
   const char* ssid = "realme 5i";
   const char* password = "980";
   ```
4. **Select your ESP32 board:**
   - Tools → Board → ESP32 Dev Module
5. **Select the correct COM port:**
   - Tools → Port → (your ESP32 port)
6. **Upload the code** (click the → button)
7. **Open Serial Monitor** (115200 baud)

### Step 3: Test the System

1. **Watch Serial Monitor** - You should see:
   ```
   ========================================
   🏠 Smart Home ESP32 Controller v2.0
   ========================================
   Server: https://gunukulavishnuvardhanreddy.in/device
   Polling Interval: 2 seconds
   ========================================

   📡 Connecting to WiFi.....
   ✅ WiFi Connected
   📍 ESP32 IP: 192.168.1.xxx

   🔄 Polling server...
   🌐 HTTP Status Code: 200
   📩 Received: 'idle'
   ⏸️ No command pending
   ```

2. **Open your web frontend** in a browser

3. **Toggle a device** (e.g., Light)

4. **Watch Serial Monitor** - Within 2 seconds you should see:
   ```
   🔄 Polling server...
   🌐 HTTP Status Code: 200
   📩 Received: 'turn_on:light'
   ✅ Device Updated: light -> turn_on
   ```

5. **Verify GPIO pin** - The corresponding pin should change state

## 🔍 Troubleshooting

### Issue: Still receiving HTML

**Symptoms:**
```
📩 Received: '<!DOCTYPE html>'
⚠️ ERROR: Received HTML instead of command!
```

**Solution:**
- Backend is not updated or not running
- Verify `/device` endpoint exists: `curl https://gunukulavishnuvardhanreddy.in/device`
- Should return `"idle"` or `"turn_on:light"`, NOT HTML

### Issue: HTTP Status Code 404

**Symptoms:**
```
🌐 HTTP Status Code: 404
```

**Solution:**
- The `/device` endpoint is not deployed
- Redeploy the updated backend code

### Issue: HTTPS request failed: -1

**Symptoms:**
```
❌ HTTPS request failed: -1
```

**Solution:**
- SSL certificate issue
- Try the `smart_home_insecure.ino` version temporarily to test connectivity
- Verify domain is accessible: `ping gunukulavishnuvardhanreddy.in`

### Issue: WiFi won't connect

**Symptoms:**
```
❌ WiFi Connection Failed
```

**Solution:**
- Double-check SSID and password
- Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
- Check WiFi signal strength

## 📊 Expected Serial Monitor Output

### Successful Connection (No Commands)
```
🔄 Polling server...
🌐 HTTP Status Code: 200
📩 Received: 'idle'
⏸️ No command pending

(2 seconds later)

🔄 Polling server...
🌐 HTTP Status Code: 200
📩 Received: 'idle'
⏸️ No command pending
```

### Successful Command Execution
```
🔄 Polling server...
🌐 HTTP Status Code: 200
📩 Received: 'turn_on:light'
✅ Device Updated: light -> turn_on

(2 seconds later)

🔄 Polling server...
🌐 HTTP Status Code: 200
📩 Received: 'idle'
⏸️ No command pending
```

## 🔄 Command Flow Diagram

```
User clicks "Light ON" in Web UI
         ↓
Frontend sends WebSocket message
         ↓
Backend receives: "ACTION:turn_on:light"
         ↓
Backend stores: pending_esp32_command = "turn_on:light"
         ↓
ESP32 polls: GET /device (every 2 seconds)
         ↓
Backend responds: "turn_on:light"
         ↓
Backend clears: pending_esp32_command = "idle"
         ↓
ESP32 executes: digitalWrite(LIGHT, HIGH)
         ↓
Light turns ON! 💡
```

## 📋 Supported Devices

| Device Name | GPIO Pin | Command Examples |
|-------------|----------|------------------|
| light | 23 | `turn_on:light`, `turn_off:light` |
| fan | 4 | `turn_on:fan`, `turn_off:fan` |
| kitchen | 5 | `turn_on:kitchen`, `turn_off:kitchen` |
| refrigerator | 18 | `turn_on:refrigerator`, `turn_off:refrigerator` |
| tv | 19 | `turn_on:tv`, `turn_off:tv` |
| hometheater | 21 | `turn_on:hometheater`, `turn_off:hometheater` |
| all | All pins | `turn_on:all`, `turn_off:all` |

## ⚠️ Important Notes

1. **One-time delivery:** Each command is delivered only once. After ESP32 reads it, the queue is cleared.

2. **Polling delay:** There's up to a 2-second delay between toggling in the UI and ESP32 responding (due to polling interval).

3. **Refrigerator protection:** The "all off" command will NOT turn off the refrigerator for safety.

4. **SSL Certificate:** Uses Let's Encrypt root certificate, valid until 2035.

## 🎉 Success Checklist

- [ ] Backend deployed with updated `main.py`
- [ ] `curl https://gunukulavishnuvardhanreddy.in/device` returns `"idle"`
- [ ] Arduino code uploaded to ESP32
- [ ] Serial Monitor shows "✅ WiFi Connected"
- [ ] Serial Monitor shows "🌐 HTTP Status Code: 200"
- [ ] Serial Monitor shows "📩 Received: 'idle'"
- [ ] Toggling device in web UI triggers ESP32 response within 2 seconds
- [ ] GPIO pins change state correctly

---

**Version:** 2.0  
**Last Updated:** 2026-02-11  
**Status:** ✅ Ready for deployment
