# include <WiFi.h>
# include <HTTPClient.h>
# include <WiFiClientSecure.h>

/* 
 * ========================================================
 * 🏠 SMART HOME ESP32 SECURE FIRMWARE (AWS PRODUCTION)
 * ========================================================
 * Target: gunukulavishnuvardhanreddy.in (HTTPS)
 * Note: No port 8000 in URL as Nginx handles the proxy.
 * ========================================================
 */

// WiFi Credentials
const char* ssid = "realme 5i";
const char* password = "980";

// Final API Endpoint (HTTPS via Nginx Proxy)
const char* serverURL = "https://gunukulavishnuvardhanreddy.in/device";

// Root CA Certificate (ISRG Root X1 for Let's Encrypt)
const char* root_ca = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw\n" \
"TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh\n" \
"cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4\n" \
"WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu\n" \
"ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY\n" \
"MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc\n" \
"h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+\n" \
"0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U\n" \
"A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW\n" \
"T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH\n" \
"B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC\n" \
"B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv\n" \
"KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn\n" \
"OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn\n" \
"jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw\n" \
"qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI\n" \
"rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV\n"HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq\nhkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL\nubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ\n3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK\nNFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5\nORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur\nTkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC\njNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc\noxi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq\n4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA\nmRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d\nemyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=\n" \
"-----END CERTIFICATE-----\n";

// GPIO Pins
#define LIGHT       23
#define FAN         4
#define KITCHEN     5
#define REFRIGERATOR 18
#define TV          19
#define HOMETHEATER 21

WiFiClientSecure client;
HTTPClient https;

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- Jerry Smart Home Secure Init ---");

  pinMode(LIGHT, OUTPUT);
  pinMode(FAN, OUTPUT);
  pinMode(KITCHEN, OUTPUT);
  pinMode(REFRIGERATOR, OUTPUT);
  pinMode(TV, OUTPUT);
  pinMode(HOMETHEATER, OUTPUT);

  // Default states
  digitalWrite(REFRIGERATOR, HIGH); // Safety ON

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected. IP: " + WiFi.localIP().toString());
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    fetchSecureCommand();
  }
  delay(1500); // Poll interval
}

void fetchSecureCommand() {
  client.setCACert(root_ca);
  
  if (https.begin(client, serverURL)) {
    int httpCode = https.GET();
    
    if (httpCode == HTTP_CODE_OK) {
      String payload = https.getString();
      payload.trim();
      
      if (payload != "idle" && payload != "") {
        Serial.println("📩 Received command: " + payload);
        
        // Anti-HTML Guard
        if (payload.startsWith("<!DOCTYPE") || payload.startsWith("<html")) {
          Serial.println("❌ ERROR: Received HTML! Check Nginx proxy_pass.");
        } else {
          executeCommand(payload);
        }
      }
    } else {
      Serial.print("⚠️ HTTPS Failed. Code: ");
      Serial.println(httpCode);
      if (httpCode == -1) Serial.println("💡 Possible SSL Handshake issue or Domain unreachable.");
    }
    https.end();
  } else {
    Serial.println("❌ Unable to connect to HTTPS Server");
  }
}

void executeCommand(String command) {
  int sep = command.indexOf(':');
  if (sep == -1) return;

  String action = command.substring(0, sep);
  String device = command.substring(sep + 1);
  int state = (action == "turn_on") ? HIGH : LOW;

  if (device == "bedroom_light" || device == "light") digitalWrite(LIGHT, state);
  else if (device == "living_room_fan" || device == "fan") digitalWrite(FAN, state);
  else if (device == "kitchen_light" || device == "kitchen") digitalWrite(KITCHEN, state);
  else if (device == "refrigerator" || device == "fridge") digitalWrite(REFRIGERATOR, state);
  else if (device == "smart_tv" || device == "tv") digitalWrite(TV, state);
  else if (device == "home_theater" || device == "hometheater") digitalWrite(HOMETHEATER, state);
  else if (device == "all") {
    digitalWrite(LIGHT, state);
    digitalWrite(FAN, state);
    digitalWrite(KITCHEN, state);
    if (state == HIGH) digitalWrite(REFRIGERATOR, HIGH);
    digitalWrite(TV, state);
    digitalWrite(HOMETHEATER, state);
  }
  Serial.println("✅ Executed: " + action + " for " + device);
}
