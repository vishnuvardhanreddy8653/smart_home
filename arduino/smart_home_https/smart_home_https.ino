#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

/* ========= WiFi Credentials ========= */
const char* ssid = "realme 5i";
const char* password = "980";

/* ========= Server ========= */
const char* serverURL = "https://gunukulavishnuvardhanreddy.in/device";

/* ========= SSL Certificate (Root CA) ========= */
// Let's Encrypt Root CA (valid until 2035)
const char* root_ca = \
"-----BEGIN CERTIFICATE-----\n" \
"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\n" \
"-----END CERTIFICATE-----\n";

/* ========= GPIO Mapping ========= */
// Avoid GPIO0, GPIO2, GPIO15
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

  // Set the root CA certificate for SSL verification
  client.setCACert(root_ca);
  
  // Optional: Set timeout to avoid hanging
  client.setTimeout(10000); // 10 seconds

  Serial.println("\n🔄 Connecting to HTTPS server...");

  if (!https.begin(client, serverURL)) {
    Serial.println("❌ HTTPS begin failed");
    return;
  }

  // Set request timeout
  https.setTimeout(10000);

  int httpCode = https.GET();

  if (httpCode > 0) {

    Serial.print("🌐 HTTP Status Code: ");
    Serial.println(httpCode);

    if (httpCode == HTTP_CODE_OK) {

      Serial.println("✅ Server Connected");

      String payload = https.getString();
      Serial.println("📩 Received: " + payload);

      // Expected format: turn_on:light
      int colon = payload.indexOf(':');
      if (colon > 0) {
        String action = payload.substring(0, colon);
        String device = payload.substring(colon + 1);
        
        // Trim whitespace
        action.trim();
        device.trim();
        
        handleDevice(action, device);
      } else {
        Serial.println("⚠️ Invalid command format. Expected: action:device");
        Serial.println("⚠️ Received: " + payload);
      }

    } else {
      Serial.print("⚠️ Server responded with code: ");
      Serial.println(httpCode);
    }

  } else {
    Serial.print("❌ HTTPS request failed: ");
    Serial.println(https.errorToString(httpCode));
    Serial.println("💡 Check: 1) Server is running 2) Domain is accessible 3) SSL certificate is valid");
  }

  https.end();
}

/* ========= Arduino Setup ========= */
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n========================================");
  Serial.println("🏠 Smart Home ESP32 Controller");
  Serial.println("========================================");
  Serial.println("Server: " + String(serverURL));
  Serial.println("========================================\n");

  setupPins();
  connectWiFi();
}

/* ========= Arduino Loop ========= */
void loop() {
  fetchCommand();
  delay(2000);   // polling interval (2 seconds)
}
