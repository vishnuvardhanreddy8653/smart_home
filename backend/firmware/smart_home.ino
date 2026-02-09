#include <WiFi.h>
#include <WebSocketsClient.h> // Install "WebSockets" by Markus Sattler from Library Manager

// ---------------- WIFI ----------------
const char* ssid = "Redmi Note 12 Pro 5G";
const char* password = "123456789";

// ---------------- SERVER ----------------
// IMPORTANT: Change this IP to your computer's IP found in "Connection Info" (QR Code)
const char* serverHost = "10.209.6.232"; 
const int serverPort = 8000;

// ---------------- DEVICE ID ----------------
String device_id = "home_esp32";

// ---------------- GPIO PINS ----------------
#define BEDROOM_LIGHT 2
#define FAN 4
#define KITCHEN_LIGHT 5
#define FRIDGE 18
#define TV 19
#define HOME_THEATER 21

WebSocketsClient webSocket;

void setup() {
  Serial.begin(115200);

  // Initialize Pins
  pinMode(BEDROOM_LIGHT, OUTPUT);
  pinMode(FAN, OUTPUT);
  pinMode(KITCHEN_LIGHT, OUTPUT);
  pinMode(FRIDGE, OUTPUT);
  pinMode(TV, OUTPUT);
  pinMode(HOME_THEATER, OUTPUT);

  // Set default state (OFF)
  digitalWrite(BEDROOM_LIGHT, LOW);
  digitalWrite(FAN, LOW);
  digitalWrite(KITCHEN_LIGHT, LOW);
  digitalWrite(FRIDGE, LOW);
  digitalWrite(TV, LOW);
  digitalWrite(HOME_THEATER, LOW);

  Serial.println("\n--- ESP32 SMART HOME START ---");

  // Connect WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi CONNECTED");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  // Connect WebSocket
  // Path: /ws/device/{device_id}
  String url = "/ws/device/" + device_id;
  webSocket.begin(serverHost, serverPort, url);
  
  // Event Handler
  webSocket.onEvent(webSocketEvent);
  
  // Auto Reconnect
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();
}

// ---------------- WEBSOCKET EVENT HANDLER ----------------
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WSc] Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.printf("[WSc] Connected to url: %s\n", payload);
      // Optional: Send initial status
      webSocket.sendTXT("status:ready");
      break;
    case WStype_TEXT:
      String text = (char*)payload;
      Serial.printf("[WSc] Received: %s\n", payload);
      processCommand(text);
      break;
  }
}

// ---------------- COMMAND PROCESSING ----------------
// Format received: "turn_on:light", "turn_off:kitchen light", etc.
void processCommand(String command) {
  
  // Split the string by ':'
  int firstColon = command.indexOf(':');
  if (firstColon == -1) return; // Invalid format

  String action = command.substring(0, firstColon); // "turn_on" or "turn_off"
  String device = command.substring(firstColon + 1); // "light", "fan", "kitchen light"

  bool isTurnOn = (action == "turn_on");

  // --- DEVICE MAPPING ---
  
  // 1. Bedroom Light (mapped to "light")
  if (device == "light") {
    digitalWrite(BEDROOM_LIGHT, isTurnOn ? HIGH : LOW);
    Serial.println(isTurnOn ? "BEDROOM_LIGHT ON" : "BEDROOM_LIGHT OFF");
  }
  
  // 2. Fan
  else if (device == "fan") {
    digitalWrite(FAN, isTurnOn ? HIGH : LOW);
    Serial.println(isTurnOn ? "FAN ON" : "FAN OFF");
  }
  
  // 3. Kitchen Light
  else if (device == "kitchen light") {
    digitalWrite(KITCHEN_LIGHT, isTurnOn ? HIGH : LOW);
    Serial.println(isTurnOn ? "KITCHEN_LIGHT ON" : "KITCHEN_LIGHT OFF");
  }
  
  // 4. Fridge / Refrigerator
  else if (device == "refrigerator" || device == "fridge") {
    digitalWrite(FRIDGE, isTurnOn ? HIGH : LOW);
    Serial.println(isTurnOn ? "FRIDGE ON" : "FRIDGE OFF");
  }
  
  // 5. TV
  else if (device == "tv") {
    digitalWrite(TV, isTurnOn ? HIGH : LOW);
    Serial.println(isTurnOn ? "TV ON" : "TV OFF");
  }
  
  // 6. Home Theater
  else if (device == "hometheater" || device == "home theater") {
    digitalWrite(HOME_THEATER, isTurnOn ? HIGH : LOW);
    Serial.println(isTurnOn ? "HOME_THEATER ON" : "HOME_THEATER OFF");
  }
  
  // 7. ALL (Except Fridge if action is OFF)
  else if (device == "all") {
     if (isTurnOn) {
         digitalWrite(BEDROOM_LIGHT, HIGH);
         digitalWrite(FAN, HIGH);
         digitalWrite(KITCHEN_LIGHT, HIGH);
         digitalWrite(FRIDGE, HIGH);
         digitalWrite(TV, HIGH);
         digitalWrite(HOME_THEATER, HIGH);
         Serial.println("ALL ON");
     } else {
         // TURN OFF ALL (PROTECT FRIDGE)
         digitalWrite(BEDROOM_LIGHT, LOW);
         digitalWrite(FAN, LOW);
         digitalWrite(KITCHEN_LIGHT, LOW);
         // digitalWrite(FRIDGE, LOW); // PROTECTED!
         digitalWrite(TV, LOW);
         digitalWrite(HOME_THEATER, LOW);
         Serial.println("ALL OFF (FRIDGE KEPT ON)");
     }
  }
}
