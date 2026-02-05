/*
 * LACTRON ESP32 Gateway Code
 * Receives sensor data from Arduino Nano via UART
 * Forwards data to PHP backend via HTTP POST
 * Receives active batch ID from frontend via HTTP Server
 * 
 * Hardware Setup:
 * - Arduino TX → ESP32 GPIO16 (RX2)
 * - Arduino RX → ESP32 GPIO17 (TX2) [optional]
 * - Common GND between Arduino and ESP32
 * 
 * Static IP: 192.168.254.150
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Static IP Configuration
IPAddress staticIP(192, 168, 254, 150);
IPAddress gateway(192, 168, 254, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns(8, 8, 8, 8);

// Backend Server Configuration
const char* PHP_SERVER_URL = "http://192.168.254.100:8080/api/sensor_data.php";
const char* BATCH_ENDPOINT = "http://192.168.254.100:8080/api/batches.php?action=esp_active";

// Send interval in milliseconds (throttle backend calls)
const unsigned long SEND_INTERVAL = 5000;  // 5 seconds

// Batch refresh interval (fallback sync with server)
const unsigned long BATCH_CHECK_INTERVAL = 30000;  // 30 seconds

// ============================================
// UART Configuration (Arduino connection)
// ============================================
#define ARDUINO_RX 16  // ESP32 receives on GPIO16 (Serial2 RX)
#define ARDUINO_TX 17  // ESP32 transmits on GPIO17 (Serial2 TX)
#define UART_BAUD 9600

// ============================================
// Global Variables
// ============================================

// HTTP Server for receiving commands from frontend
WebServer server(80);

// Active batch ID (set by frontend or fetched from server)
String BATCH_ID = "";

// Latest sensor values
float ethValue = 0.0;
float nh3Value = 0.0;
float h2sValue = 0.0;

// Timing
unsigned long lastSendTime = 0;
unsigned long lastReceiveTime = 0;
unsigned long lastBatchCheck = 0;
bool dataReceived = false;

// Status LED (optional - use built-in LED)
#define STATUS_LED 2

// ============================================
// SETUP
// ============================================
void setup() {
  // Initialize Serial for debugging
  Serial.begin(115200);
  Serial.println("\n=== LACTRON ESP32 Gateway ===");
  
  // Initialize Serial2 for Arduino UART
  Serial2.begin(UART_BAUD, SERIAL_8N1, ARDUINO_RX, ARDUINO_TX);
  Serial.println("UART initialized (RX=GPIO16, TX=GPIO17, 9600 baud)");
  
  // Initialize LED
  pinMode(STATUS_LED, OUTPUT);
  digitalWrite(STATUS_LED, LOW);
  
  // Connect to WiFi with static IP
  connectWiFi();
  
  // Setup HTTP server endpoints
  setupHttpServer();
  
  // Fetch active batch from server (fallback)
  fetchActiveBatch();
  
  Serial.println("Setup complete. Waiting for Arduino data...");
  Serial.print("HTTP Server running at: http://");
  Serial.println(WiFi.localIP());
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  // Handle incoming HTTP requests from frontend
  server.handleClient();
  
  // Read data from Arduino via UART
  readArduinoData();
  
  // Send data to backend at configured interval
  if (dataReceived && (millis() - lastSendTime >= SEND_INTERVAL)) {
    if (BATCH_ID.length() > 0) {
      sendToBackend();
    } else {
      Serial.println("No active batch. Skipping backend send.");
    }
    lastSendTime = millis();
  }
  
  // Periodically refresh batch ID from server (fallback if frontend doesn't push)
  if (millis() - lastBatchCheck >= BATCH_CHECK_INTERVAL) {
    fetchActiveBatch();
    lastBatchCheck = millis();
  }
  
  // WiFi reconnection check
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectWiFi();
  }
  
  // Blink LED when data is being received
  if (millis() - lastReceiveTime < 500) {
    digitalWrite(STATUS_LED, HIGH);
  } else {
    digitalWrite(STATUS_LED, LOW);
  }
}

// ============================================
// WiFi Connection with Static IP
// ============================================
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  // Configure static IP before connecting
  if (!WiFi.config(staticIP, gateway, subnet, dns)) {
    Serial.println("Static IP configuration failed!");
  }
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("Static IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed. Will retry...");
  }
}

// ============================================
// HTTP Server Setup for Frontend Commands
// ============================================
void setupHttpServer() {
  // CORS preflight handler
  server.on("/batch", HTTP_OPTIONS, handleCors);
  server.on("/status", HTTP_OPTIONS, handleCors);
  
  // Set active batch (POST /batch)
  server.on("/batch", HTTP_POST, handleSetBatch);
  
  // Get current batch (GET /batch)
  server.on("/batch", HTTP_GET, handleGetBatch);
  
  // Get ESP32 status (GET /status)
  server.on("/status", HTTP_GET, handleStatus);
  
  server.begin();
  Serial.println("HTTP Server started on port 80");
}

void handleCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

void handleSetBatch() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    Serial.print("Received batch update: ");
    Serial.println(body);
    
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, body);
    
    if (!error) {
      String newBatchId = doc["batch_id"].as<String>();
      BATCH_ID = newBatchId;
      
      Serial.print("Active batch set to: ");
      Serial.println(BATCH_ID.length() > 0 ? BATCH_ID : "(cleared)");
      
      // Send success response
      StaticJsonDocument<128> response;
      response["success"] = true;
      response["batch_id"] = BATCH_ID;
      response["message"] = BATCH_ID.length() > 0 ? "Batch activated" : "Batch cleared";
      
      String responseJson;
      serializeJson(response, responseJson);
      server.send(200, "application/json", responseJson);
    } else {
      server.send(400, "application/json", "{\"success\":false,\"error\":\"Invalid JSON\"}");
    }
  } else {
    server.send(400, "application/json", "{\"success\":false,\"error\":\"No body\"}");
  }
}

void handleGetBatch() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  StaticJsonDocument<128> response;
  response["success"] = true;
  response["batch_id"] = BATCH_ID;
  response["has_batch"] = BATCH_ID.length() > 0;
  
  String responseJson;
  serializeJson(response, responseJson);
  server.send(200, "application/json", responseJson);
}

void handleStatus() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  StaticJsonDocument<256> response;
  response["success"] = true;
  response["ip"] = WiFi.localIP().toString();
  response["batch_id"] = BATCH_ID;
  response["connected"] = WiFi.status() == WL_CONNECTED;
  response["data_received"] = dataReceived;
  response["uptime_ms"] = millis();
  
  // Latest sensor values
  JsonObject sensors = response.createNestedObject("sensors");
  sensors["ethanol"] = ethValue;
  sensors["ammonia"] = nh3Value;
  sensors["h2s"] = h2sValue;
  
  String responseJson;
  serializeJson(response, responseJson);
  server.send(200, "application/json", responseJson);
}

// ============================================
// Fetch Active Batch from Server (Fallback)
// ============================================
void fetchActiveBatch() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Cannot fetch batch.");
    return;
  }
  
  // Skip if batch already set by frontend
  if (BATCH_ID.length() > 0) {
    Serial.println("Batch already set by frontend. Skipping server fetch.");
    return;
  }
  
  HTTPClient http;
  http.begin(BATCH_ENDPOINT);
  http.setTimeout(5000);
  
  int httpCode = http.GET();
  
  if (httpCode == 200) {
    String response = http.getString();
    Serial.print("Batch response: ");
    Serial.println(response);
    
    // Parse JSON response
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error && doc["success"]) {
      if (!doc["batch_id"].isNull()) {
        String newBatchId = doc["batch_id"].as<String>();
        if (newBatchId != BATCH_ID) {
          BATCH_ID = newBatchId;
          Serial.print("Active batch updated from server: ");
          Serial.println(BATCH_ID);
        }
      } else {
        Serial.println("No active batch found on server.");
      }
    } else {
      Serial.println("Failed to parse batch response.");
    }
  } else {
    Serial.print("Batch fetch failed. HTTP code: ");
    Serial.println(httpCode);
  }
  
  http.end();
}

// ============================================
// Read Arduino UART Data
// ============================================
void readArduinoData() {
  if (Serial2.available() > 0) {
    String data = Serial2.readStringUntil('\n');
    data.trim();
    
    if (data.length() > 0) {
      Serial.print("Received from Arduino: ");
      Serial.println(data);
      
      // Parse CSV format: "ethanol,ammonia,h2s"
      if (parseCSV(data)) {
        dataReceived = true;
        lastReceiveTime = millis();
        
        Serial.printf("Parsed - Ethanol: %.2f ppm, NH3: %.2f ppm, H2S: %.2f ppm\n", 
                      ethValue, nh3Value, h2sValue);
      } else {
        Serial.println("Failed to parse CSV data");
      }
    }
  }
}

// ============================================
// Parse CSV Data
// ============================================
bool parseCSV(String data) {
  // Expected format: "ethanol,ammonia,h2s"
  int firstComma = data.indexOf(',');
  int secondComma = data.indexOf(',', firstComma + 1);
  
  if (firstComma == -1 || secondComma == -1) {
    return false;
  }
  
  String ethStr = data.substring(0, firstComma);
  String nh3Str = data.substring(firstComma + 1, secondComma);
  String h2sStr = data.substring(secondComma + 1);
  
  ethValue = ethStr.toFloat();
  nh3Value = nh3Str.toFloat();
  h2sValue = h2sStr.toFloat();
  
  // Basic validation - values should be non-negative
  return (ethValue >= 0 && nh3Value >= 0 && h2sValue >= 0);
}

// ============================================
// Send Data to PHP Backend
// ============================================
void sendToBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Skipping backend send.");
    return;
  }
  
  HTTPClient http;
  http.begin(PHP_SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["batch_id"] = BATCH_ID;
  doc["ethanol"] = ethValue;
  doc["ammonia"] = nh3Value;
  doc["h2s"] = h2sValue;
  
  String jsonPayload;
  serializeJson(doc, jsonPayload);
  
  Serial.print("Sending to backend: ");
  Serial.println(jsonPayload);
  
  int httpCode = http.POST(jsonPayload);
  
  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("Response [");
    Serial.print(httpCode);
    Serial.print("]: ");
    Serial.println(response);
    
    // Parse response to show prediction
    if (httpCode == 200) {
      StaticJsonDocument<512> respDoc;
      DeserializationError error = deserializeJson(respDoc, response);
      if (!error && respDoc["success"]) {
        const char* status = respDoc["data"]["status"];
        float shelfLife = respDoc["data"]["shelfLife"];
        Serial.printf("ML Prediction - Status: %s, Shelf Life: %.1f days\n", status, shelfLife);
      }
    }
  } else {
    Serial.print("HTTP Error: ");
    Serial.println(httpCode);
  }
  
  http.end();
}
