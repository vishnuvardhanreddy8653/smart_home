// Alternative version if SSL certificate verification fails
// Use this ONLY for testing - NOT recommended for production

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

/* ========= WiFi Credentials ========= */
const char* ssid = "realme 5i";
const char* password = "980";

/* ========= Server ========= */
const char* serverURL = "https://gunukulavishnuvardhanreddy.in/device";

/* ========= GPIO Mapping ========= */
#define LIGHT       23
#define FAN         4
#define KITCHEN     5
#define FRIDGE      18
#define TV          19
#define HOMETHEATER 21

WiFiClientSecure client;
HTTPClient https;

/* ========= Setup Pins ========= */
void setupPins() {
  pinMode(LIGHT, OUTPUT);
  pinMode(FAN, OUTPUT);
  pinMode(KITCHEN, OUTPUT);
  pinMode(FRIDGE, OUTPUT);
  pinMode(TV, OUTPUT);
  pinMode(HOMETHEATER, OUTPUT);

  digitalWrite(LIGHT, LOW);
  digitalWrite(FAN, LOW);
  digitalWrite(KITCHEN, LOW);
  digitalWrite(FRIDGE, LOW);
  digitalWrite(TV, LOW);
  digitalWrite(HOMETHEATER, LOW);
}

/* ========= Device Control ========= */
void handleDevice(String action, String device) {
  bool ON = (action == "turn_on");

  if (device == "light") digitalWrite(LIGHT, ON);
  else if (device == "fan") digitalWrite(FAN, ON);
  else if (device == "kitchen") digitalWrite(KITCHEN, ON);
  else if (device == "refrigerator") digitalWrite(FRIDGE, ON);
  else if (device == "tv") digitalWrite(TV, ON);
  else if (device == "hometheater") digitalWrite(HOMETHEATER, ON);
  else {
    Serial.println("⚠️ Unknown device: " + device);
    return;
  }

  Serial.println("✅ Device Updated: " + device + " -> " + action);
}

/* ========= WiFi Connect ========= */
void connectWiFi() {
  Serial.print("📡 Connecting to WiFi");
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected");
    Serial.print("📍 ESP32 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi Connection Failed");
  }
}

/* ========= Fetch Command from Server ========= */
void fetchCommand() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi Disconnected - Reconnecting...");
    connectWiFi();
    return;
  }

  // ⚠️ WARNING: This disables SSL certificate verification
  // Only use for testing! Replace with proper certificate in production
  client.setInsecure();
  
  Serial.println("\n🔄 Connecting to HTTPS server (INSECURE MODE)...");

  if (!https.begin(client, serverURL)) {
    Serial.println("❌ HTTPS begin failed");
    return;
  }

  int httpCode = https.GET();

  if (httpCode > 0) {
    Serial.print("🌐 HTTP Status Code: ");
    Serial.println(httpCode);

    if (httpCode == HTTP_CODE_OK) {
      Serial.println("✅ Server Connected");

      String payload = https.getString();
      Serial.println("📩 Received: " + payload);

      int colon = payload.indexOf(':');
      if (colon > 0) {
        String action = payload.substring(0, colon);
        String device = payload.substring(colon + 1);
        action.trim();
        device.trim();
        handleDevice(action, device);
      } else {
        Serial.println("⚠️ Invalid command format");
        Serial.println("⚠️ Received: " + payload);
      }
    } else {
      Serial.print("⚠️ Server responded with code: ");
      Serial.println(httpCode);
    }
  } else {
    Serial.print("❌ HTTPS request failed: ");
    Serial.println(https.errorToString(httpCode));
  }

  https.end();
}

/* ========= Arduino Setup ========= */
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n⚠️⚠️⚠️ WARNING: SSL VERIFICATION DISABLED ⚠️⚠️⚠️");
  Serial.println("This is for TESTING ONLY - Use secure version for production\n");

  setupPins();
  connectWiFi();
}

/* ========= Arduino Loop ========= */
void loop() {
  fetchCommand();
  delay(2000);
}
