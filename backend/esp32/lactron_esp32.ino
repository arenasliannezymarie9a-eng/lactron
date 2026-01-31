/*
 * LACTRON ESP32 Gateway Code
 * Receives sensor data from Arduino Nano via UART
 * Forwards data to PHP backend via HTTP POST
 * 
 * Hardware Setup:
 * - Arduino TX → ESP32 GPIO16 (RX2)
 * - Arduino RX → ESP32 GPIO17 (TX2) [optional, for bidirectional]
 * - Common GND between Arduino and ESP32
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebServer.h>

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend Server Configuration
// Replace YOUR_PC_IP with your computer's local IP address (e.g., 192.168.1.100)
const char* PHP_SERVER_URL = "http://YOUR_PC_IP:8083/api/sensor_data.php";

// Default Batch ID (can be changed via Serial command)
String BATCH_ID = "LAC-2026-002";

// Send interval in milliseconds (throttle backend calls)
// Arduino sends every 1 second, but we can send to backend less frequently
const unsigned long SEND_INTERVAL = 5000;  // 5 seconds

// ============================================
// UART Configuration (Arduino connection)
// ============================================
#define ARDUINO_RX 16  // ESP32 receives on GPIO16 (Serial2 RX)
#define ARDUINO_TX 17  // ESP32 transmits on GPIO17 (Serial2 TX)
#define UART_BAUD 9600

// ============================================
// Global Variables
// ============================================
WebServer server(80);

// Latest sensor values
float ethValue = 0.0;
float nh3Value = 0.0;
float h2sValue = 0.0;

// Timing
unsigned long lastSendTime = 0;
unsigned long lastReceiveTime = 0;
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
  
  // Connect to WiFi
  connectWiFi();
  
  // Setup web server for debug page
  setupWebServer();
  
  Serial.println("Setup complete. Waiting for Arduino data...");
  Serial.println("Commands: CMD:BATCH:xxx to change batch ID");
}

// ============================================
// MAIN LOOP
// ============================================
void loop() {
  // Handle web server requests
  server.handleClient();
  
  // Check for serial commands (batch ID change, etc.)
  handleSerialCommands();
  
  // Read data from Arduino via UART
  readArduinoData();
  
  // Send data to backend at configured interval
  if (dataReceived && (millis() - lastSendTime >= SEND_INTERVAL)) {
    sendToBackend();
    lastSendTime = millis();
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
// WiFi Connection
// ============================================
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed. Will retry...");
  }
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
  http.setTimeout(5000);  // 5 second timeout
  
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

// ============================================
// Handle Serial Commands
// ============================================
void handleSerialCommands() {
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    
    if (cmd.startsWith("CMD:BATCH:")) {
      String newBatchId = cmd.substring(10);
      if (newBatchId.length() > 0) {
        BATCH_ID = newBatchId;
        Serial.print("Batch ID changed to: ");
        Serial.println(BATCH_ID);
      }
    } else if (cmd == "CMD:STATUS") {
      printStatus();
    } else if (cmd == "CMD:HELP") {
      Serial.println("Available commands:");
      Serial.println("  CMD:BATCH:xxx - Set batch ID to xxx");
      Serial.println("  CMD:STATUS    - Show current status");
      Serial.println("  CMD:HELP      - Show this help");
    }
  }
}

// ============================================
// Print Status
// ============================================
void printStatus() {
  Serial.println("\n=== LACTRON Status ===");
  Serial.print("WiFi: ");
  Serial.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("Batch ID: ");
  Serial.println(BATCH_ID);
  Serial.print("Backend URL: ");
  Serial.println(PHP_SERVER_URL);
  Serial.printf("Latest Readings - Eth: %.2f, NH3: %.2f, H2S: %.2f\n", ethValue, nh3Value, h2sValue);
  Serial.println("======================\n");
}

// ============================================
// Web Server Setup (Debug Page)
// ============================================
void setupWebServer() {
  server.on("/", HTTP_GET, handleRoot);
  server.on("/data", HTTP_GET, handleData);
  server.on("/batch", HTTP_POST, handleBatchChange);
  server.begin();
  Serial.print("Debug web server started at http://");
  Serial.println(WiFi.localIP());
}

void handleRoot() {
  String html = "<!DOCTYPE html><html><head>";
  html += "<meta charset='UTF-8'>";
  html += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
  html += "<meta http-equiv='refresh' content='5'>";
  html += "<title>LACTRON ESP32 Gateway</title>";
  html += "<style>";
  html += "body{font-family:system-ui;max-width:600px;margin:40px auto;padding:20px;background:#0a0a0a;color:#fff}";
  html += ".card{background:#1a1a1a;border-radius:12px;padding:20px;margin:16px 0}";
  html += ".value{font-size:2em;font-weight:bold;color:#22c55e}";
  html += ".label{color:#888;font-size:0.9em}";
  html += "h1{color:#22c55e}";
  html += "input,button{padding:10px;margin:5px;border-radius:8px;border:1px solid #333;background:#222;color:#fff}";
  html += "button{background:#22c55e;color:#000;cursor:pointer;border:none}";
  html += "</style></head><body>";
  html += "<h1>🥛 LACTRON Gateway</h1>";
  html += "<div class='card'><div class='label'>Batch ID</div><div class='value'>" + BATCH_ID + "</div></div>";
  html += "<div class='card'><div class='label'>Ethanol (ppm)</div><div class='value'>" + String(ethValue, 2) + "</div></div>";
  html += "<div class='card'><div class='label'>Ammonia (ppm)</div><div class='value'>" + String(nh3Value, 2) + "</div></div>";
  html += "<div class='card'><div class='label'>H₂S (ppm)</div><div class='value'>" + String(h2sValue, 2) + "</div></div>";
  html += "<div class='card'><form action='/batch' method='POST'>";
  html += "<input type='text' name='batch_id' placeholder='New Batch ID'>";
  html += "<button type='submit'>Change Batch</button></form></div>";
  html += "<div class='card'><div class='label'>Backend</div><div>" + String(PHP_SERVER_URL) + "</div></div>";
  html += "<div class='card'><div class='label'>WiFi IP</div><div>" + WiFi.localIP().toString() + "</div></div>";
  html += "</body></html>";
  
  server.send(200, "text/html", html);
}

void handleData() {
  StaticJsonDocument<256> doc;
  doc["batch_id"] = BATCH_ID;
  doc["ethanol"] = ethValue;
  doc["ammonia"] = nh3Value;
  doc["h2s"] = h2sValue;
  doc["wifi_connected"] = (WiFi.status() == WL_CONNECTED);
  doc["ip"] = WiFi.localIP().toString();
  
  String json;
  serializeJson(doc, json);
  server.send(200, "application/json", json);
}

void handleBatchChange() {
  if (server.hasArg("batch_id")) {
    String newBatchId = server.arg("batch_id");
    if (newBatchId.length() > 0) {
      BATCH_ID = newBatchId;
      Serial.print("Batch ID changed via web to: ");
      Serial.println(BATCH_ID);
    }
  }
  server.sendHeader("Location", "/");
  server.send(302, "text/plain", "Redirecting...");
}
