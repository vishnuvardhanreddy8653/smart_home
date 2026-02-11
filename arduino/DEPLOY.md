# 🚀 Quick Deployment Guide - ESP32 Fix

## ⚡ TL;DR - What You Need to Do

Your ESP32 was receiving HTML because the `/device` endpoint was missing. I've fixed the code - now you need to deploy it!

## 📋 Step-by-Step Deployment

### Step 1: Deploy Backend to AWS (5 minutes)

```bash
# 1. SSH into your EC2 instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# 2. Navigate to project
cd smart_home

# 3. Update the backend/main.py file
# (Either git pull or manually copy the updated file)

# 4. Restart Docker containers
docker-compose down
docker-compose up -d

# 5. Verify the endpoint works
curl https://gunukulavishnuvardhanreddy.in/device
# Should return: idle
```

### Step 2: Upload Arduino Code (3 minutes)

1. Open Arduino IDE
2. Open: `smart_home/arduino/updated_smart_home.ino`
3. Select: Tools → Board → ESP32 Dev Module
4. Select: Tools → Port → (your COM port)
5. Click Upload (→ button)
6. Open Serial Monitor (115200 baud)

### Step 3: Test (2 minutes)

1. Watch Serial Monitor - should show:
   ```
   ✅ WiFi Connected
   🌐 HTTP Status Code: 200
   📩 Received: 'idle'
   ```

2. Open web UI and toggle a device

3. Within 2 seconds, Serial Monitor should show:
   ```
   📩 Received: 'turn_on:light'
   ✅ Device Updated: light -> turn_on
   ```

## ✅ Success Checklist

- [ ] Backend deployed (curl returns "idle")
- [ ] Arduino code uploaded
- [ ] Serial Monitor shows HTTP 200
- [ ] Device toggles work within 2 seconds

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Still getting HTML | Backend not deployed - check Step 1 |
| HTTP 404 | `/device` endpoint missing - redeploy backend |
| WiFi won't connect | Check SSID/password in Arduino code |
| HTTPS failed: -1 | SSL issue - try `smart_home_insecure.ino` temporarily |

## 📁 Files Changed

**Backend:**
- ✅ `backend/main.py` - Added `/device` endpoint

**ESP32:**
- ✅ `arduino/updated_smart_home.ino` - New version with fixes

**Documentation:**
- ✅ `arduino/README.md` - Full guide

---

**Need help?** Check the detailed [README.md](file:///c:/Users/vishnu/Desktop/electrocoders/smart_home/arduino/README.md) in the arduino folder.
