/*
 * LACTRON ESP32 Sensor Code
 * Reads MQ-3 (Ethanol), MQ-135 (Ammonia), MQ-136 (H2S) sensors
 * Sends data to PHP backend via HTTP POST
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server Configuration
const char* SERVER_URL = "http://YOUR_SERVER_IP:8080/api/sensor_data.php";
const char* BATCH_ID = "LCT-2024-001";

// Sensor Pins
const int MQ3_PIN = 34;   // Ethanol
const int MQ135_PIN = 35; // Ammonia  
const int MQ136_PIN = 32; // H2S

// Calibration values (adjust based on your sensors)
const float MQ3_R0 = 10.0;
const float MQ135_R0 = 10.0;
const float MQ136_R0 = 10.0;
const float RL = 10.0; // Load resistance in kOhm

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 10000; // 10 seconds

void setup() {
    Serial.begin(115200);
    analogReadResolution(12);
    
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    Serial.print("Connecting to WiFi");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nConnected! IP: " + WiFi.localIP().toString());
}

float readSensor(int pin, float R0, float a, float b) {
    int raw = analogRead(pin);
    float voltage = raw * (3.3 / 4095.0);
    float RS = RL * (3.3 - voltage) / voltage;
    float ratio = RS / R0;
    return pow(10, ((log10(ratio) - b) / a));
}

void sendData(float ethanol, float ammonia, float h2s) {
    if (WiFi.status() != WL_CONNECTED) return;
    
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    
    StaticJsonDocument<200> doc;
    doc["action"] = "save";
    doc["batch_id"] = BATCH_ID;
    doc["ethanol"] = ethanol;
    doc["ammonia"] = ammonia;
    doc["h2s"] = h2s;
    
    String json;
    serializeJson(doc, json);
    
    int code = http.POST(json);
    if (code > 0) {
        Serial.println("Data sent: " + http.getString());
    } else {
        Serial.println("Error: " + String(code));
    }
    http.end();
}

void loop() {
    if (millis() - lastSend >= SEND_INTERVAL) {
        float ethanol = readSensor(MQ3_PIN, MQ3_R0, -0.66, 1.33);
        float ammonia = readSensor(MQ135_PIN, MQ135_R0, -0.42, 0.93);
        float h2s = readSensor(MQ136_PIN, MQ136_R0, -0.48, 1.18);
        
        Serial.printf("Ethanol: %.2f ppm, Ammonia: %.2f ppm, H2S: %.2f ppm\n", ethanol, ammonia, h2s);
        sendData(ethanol, ammonia, h2s);
        lastSend = millis();
    }
}
