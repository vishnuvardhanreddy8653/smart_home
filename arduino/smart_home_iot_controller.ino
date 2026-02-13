/*
 * ====================================
 * Smart Home IoT Controller - ESP32
 * Compatible with Smart Home Frontend
 * Version: 2.0
 * ====================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ========== CONFIGURATION ==========
const char* SSID = "YOUR_WIFI_SSID";
const char* PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend Server Configuration
const char* BACKEND_HOST = "192.168.1.100";      // IP of your backend server
const int BACKEND_PORT = 3000;
const char* API_BASE = "http://192.168.1.100:3000/api/device";

// ========== GPIO PIN MAPPING ==========
// Adjust these pins based on your hardware setup
#define LIGHT_PIN       23    // Bedroom Light (GPIO 23)
#define KITCHEN_PIN     4     // Kitchen Light (GPIO 4)
#define FAN_PIN         5     // Living Room Fan (GPIO 5)

// ========== GLOBAL VARIABLES ==========
WiFiClient wifiClient;
HTTPClient http;
unsigned long lastPollTime = 0;
const unsigned long POLL_INTERVAL = 5000;  // Poll every 5 seconds (milliseconds)

// Device states
struct DeviceState {
  String id;
  bool state;
  int pin;
  String name;
};

DeviceState devices[3] = {
  {"light", false, LIGHT_PIN, "Bedroom Light"},
  {"kitchen", false, KITCHEN_PIN, "Kitchen Light"},
  {"fan", false, FAN_PIN, "Living Room Fan"}
};

// ========== SETUP PINS ==========
void setupPins() {
  Serial.println("\n🔧 Initializing GPIO pins...");
  
  for (int i = 0; i < 3; i++) {
    pinMode(devices[i].pin, OUTPUT);
    digitalWrite(devices[i].pin, LOW);  // All devices OFF by default
    Serial.printf("  ✅ %s (GPIO %d) -> OUTPUT\n", 
                  devices[i].name.c_str(), devices[i].pin);
  }
  
  Serial.println("✅ GPIO initialization complete!\n");
}

// ========== WIFI CONNECTION ==========
void connectToWiFi() {
  Serial.print("\n📡 Connecting to WiFi: ");
  Serial.println(SSID);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ WiFi Connected Successfully!");
    Serial.print("📍 Device IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("📶 Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm\n");
  } else {
    Serial.println("❌ WiFi Connection Failed!");
    Serial.println("⚠️  Check WiFi credentials and network availability\n");
  }
}

// ========== CONTROL DEVICE ==========
// This function directly controls the GPIO pins
void controlDevice(String deviceId, bool state) {
  int pin = -1;
  String deviceName = "";
  
  // Find device by ID
  for (int i = 0; i < 3; i++) {
    if (devices[i].id == deviceId) {
      pin = devices[i].pin;
      deviceName = devices[i].name;
      devices[i].state = state;
      break;
    }
  }
  
  if (pin == -1) {
    Serial.printf("⚠️  Unknown device: %s\n", deviceId.c_str());
    return;
  }
  
  // Control the relay
  digitalWrite(pin, state ? HIGH : LOW);
  
  // Log the action
  Serial.printf("✅ %s -> %s (GPIO %d)\n", 
                deviceName.c_str(), 
                state ? "ON" : "OFF", 
                pin);
}

// ========== SEND COMMAND TO BACKEND ==========
void sendCommandToBackend(String deviceId, bool state) {
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnected - cannot send command");
    return;
  }
  
  // Build URL
  String url = String(API_BASE) + "/" + deviceId;
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["deviceId"] = deviceId;
  doc["state"] = state;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  // Log request
  Serial.println("\n🔄 Sending API Request:");
  Serial.printf("  📤 URL: %s\n", url.c_str());
  Serial.printf("  📤 Payload: %s\n", jsonPayload.c_str());
  
  // Send HTTP POST request
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  int httpCode = http.POST(jsonPayload);
  
  if (httpCode > 0) {
    Serial.printf("  🌐 HTTP Status: %d\n", httpCode);
    
    if (httpCode == HTTP_CODE_OK) {
      String response = http.getString();
      Serial.printf("  📥 Response: %s\n", response.c_str());
      
      // Parse response and confirm
      StaticJsonDocument<256> respDoc;
      deserializeJson(respDoc, response);
      
      if (respDoc["success"]) {
        Serial.println("  ✅ Command accepted by backend\n");
        // GPIO state already updated above
      }
    } else {
      Serial.printf("  ⚠️  Server error: %d\n\n", httpCode);
    }
  } else {
    Serial.printf("  ❌ HTTP request failed: %s\n\n", 
                  http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

// ========== POLL DEVICE STATUS ==========
// Optional: Poll backend to synchronize state
void pollDeviceStatus() {
  
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }
  
  Serial.println("\n🔄 Polling backend for device status...");
  
  for (int i = 0; i < 3; i++) {
    String url = String(API_BASE) + "/" + devices[i].id;
    
    http.begin(url);
    int httpCode = http.GET();
    
    if (httpCode == HTTP_CODE_OK) {
      String response = http.getString();
      
      StaticJsonDocument<256> doc;
      deserializeJson(doc, response);
      
      bool remoteState = doc["state"];
      
      // Sync with local state
      if (devices[i].state != remoteState) {
        Serial.printf("  🔄 Syncing %s: %s -> %s\n",
                      devices[i].name.c_str(),
                      devices[i].state ? "ON" : "OFF",
                      remoteState ? "ON" : "OFF");
        
        controlDevice(devices[i].id, remoteState);
      }
    }
    
    http.end();
  }
  
  Serial.println();
}

// ========== PRINT DEVICE STATES ==========
void printDeviceStates() {
  Serial.println("\n📊 Current Device States:");
  for (int i = 0; i < 3; i++) {
    Serial.printf("  %s: %s\n", 
                  devices[i].name.c_str(),
                  devices[i].state ? "ON ✅" : "OFF ❌");
  }
  Serial.println();
}

// ========== SETUP FUNCTION ==========
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Print startup banner
  Serial.println("\n\n╔════════════════════════════════════════════╗");
  Serial.println("║   🏠 Smart Home IoT Device Controller      ║");
  Serial.println("║         ESP32 Firmware v2.0                ║");
  Serial.println("║   Frontend Compatible Controller           ║");
  Serial.println("╚════════════════════════════════════════════╝");
  
  // Configuration info
  Serial.println("\n⚙️  Configuration:");
  Serial.printf("  WiFi SSID: %s\n", SSID);
  Serial.printf("  Backend: http://%s:%d\n", BACKEND_HOST, BACKEND_PORT);
  Serial.printf("  API Endpoint: %s\n", API_BASE);
  
  Serial.println("\n📋 GPIO Mapping:");
  Serial.println("  Light    (GPIO 23)");
  Serial.println("  Kitchen  (GPIO 4)");
  Serial.println("  Fan      (GPIO 5)");
  
  // Initialize hardware
  setupPins();
  
  // Connect to WiFi
  connectToWiFi();
  
  Serial.println("🎯 Device ready!");
  Serial.println("⏳ Waiting for commands...\n");
}

// ========== MAIN LOOP ==========
void loop() {
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi disconnected - reconnecting...");
    connectToWiFi();
    delay(5000);
    return;
  }
  
  // Optional: Poll backend status periodically
  unsigned long currentTime = millis();
  if (currentTime - lastPollTime >= POLL_INTERVAL) {
    lastPollTime = currentTime;
    // Uncomment below to enable polling:
    // pollDeviceStatus();
  }
  
  delay(100);  // Small delay to prevent watchdog reset
}

// ========== SERIAL COMMAND INTERFACE ==========
// For testing via Serial Monitor
void serialEvent() {
  while (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    // Format: device-on (light-on, kitchen-off, fan-on, etc)
    if (command.indexOf('-') > 0) {
      int dashIndex = command.indexOf('-');
      String device = command.substring(0, dashIndex);
      String action = command.substring(dashIndex + 1);
      
      bool state = action == "on";
      
      Serial.printf("\n📋 Serial Command Received: %s -> %s\n", 
                    device.c_str(), action.c_str());
      
      // Send to backend and control locally
      sendCommandToBackend(device, state);
      controlDevice(device, state);
      
      Serial.println();
    }
    // Special commands
    else if (command == "status") {
      printDeviceStates();
    }
    else if (command == "wifi") {
      Serial.printf("WiFi Status: %s\n", 
                    (WiFi.status() == WL_CONNECTED) ? "Connected ✅" : "Disconnected ❌");
      Serial.printf("IP: %s\n\n", WiFi.localIP().toString().c_str());
    }
    else if (command == "reset") {
      Serial.println("🔄 Restarting device...\n");
      delay(1000);
      ESP.restart();
    }
    else if (command == "help") {
      Serial.println("\n📖 Available Commands:");
      Serial.println("  light-on    : Turn on bedroom light");
      Serial.println("  light-off   : Turn off bedroom light");
      Serial.println("  kitchen-on  : Turn on kitchen light");
      Serial.println("  kitchen-off : Turn off kitchen light");
      Serial.println("  fan-on      : Turn on living room fan");
      Serial.println("  fan-off     : Turn off living room fan");
      Serial.println("  status      : Show all device states");
      Serial.println("  wifi        : Show WiFi status");
      Serial.println("  reset       : Restart device");
      Serial.println("  help        : Show this help message\n");
    }
  }
}

/*
 * ========================================
 * USAGE INSTRUCTIONS
 * ========================================
 * 
 * 1. Update WiFi credentials:
 *    const char* SSID = "your_network";
 *    const char* PASSWORD = "your_password";
 * 
 * 2. Update backend address:
 *    const char* BACKEND_HOST = "192.168.1.100";
 * 
 * 3. Flash to ESP32 via Arduino IDE
 * 
 * 4. Open Serial Monitor (Baud: 115200)
 * 
 * 5. Test commands:
 *    light-on
 *    kitchen-off
 *    fan-on
 *    status
 * 
 * 6. Frontend will control via HTTP POST to backend
 *    Backend will forward to this device via WiFi
 * 
 * ========================================
 */
