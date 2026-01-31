
# LACTRON Complete System Integration Plan

## Current State Analysis

### Your Hardware Setup:
```text
+----------------+      UART (9600 baud)      +----------------+      WiFi       +----------------+
|  ARDUINO NANO  |  ---------------------->  |     ESP32      |  ------------> |  PHP Backend   |
|                |    "eth,nh3,h2s\n"        |   (receiver)   |     HTTP       |  + MySQL       |
+----------------+                            +----------------+                 +----------------+
       |                                             |                                  |
  Sensors:                                    Currently:                          Currently:
  - MQ-3 (A0) -> Ethanol                     - Receives UART                    - Has POST endpoint
  - NH3 I2C (0x74)                           - Serves web page                  - Stores readings
  - H2S I2C (0x76)                           - NO backend integration!          - Calls ML server
```

### The Missing Link:
Your ESP32 code receives sensor data from Arduino but only displays it on a local web page. It needs to forward this data to the PHP backend so it can be:
1. Stored in MySQL (`sensor_readings` table)
2. Sent to Flask ML server for shelf-life prediction
3. Displayed on the React dashboard

---

## Updated System Architecture

```text
+----------------+                            +----------------+                 +------------------+
|  ARDUINO NANO  |      UART Serial           |     ESP32      |    HTTP POST   |   PHP Backend    |
|  (Sensor Hub)  |  ---------------------->   |   (Gateway)    |  ----------->  |  sensor_data.php |
+----------------+                            +----------------+                 +--------+---------+
                                                     |                                   |
  Sensors Read:                               Does:                               Does:
  - Ethanol PPM                               - Receive UART data                 - Store in MySQL
  - Ammonia PPM                               - Parse CSV values                  - Call Flask ML
  - H2S PPM                                   - Forward to PHP API                - Return prediction
                                              - (Optional) Serve debug page
                                                                                         |
                                                                                         v
+------------------+                          +------------------+               +------------------+
|  React Dashboard | <----------------------  |  Flask ML Server | <-----------  |  sensor_readings |
|   (Frontend)     |     Fetch Latest         |   /predict       |    HTTP POST  |     (MySQL)      |
+------------------+                          +------------------+               +------------------+
```

---

## Implementation Changes

### 1. Update ESP32 Code
**File:** `backend/esp32/lactron_esp32.ino`

The ESP32 must:
- Receive CSV data from Arduino via Serial2 (RX=16, TX=17)
- Parse the three sensor values
- Forward to PHP backend via HTTP POST
- Optionally serve a debug web page

Key changes:
- Use Serial2 for UART (matching your current working code)
- Add HTTPClient to POST data to PHP
- Include configurable batch ID selection
- Add ArduinoJson for structured API calls

### 2. Keep Arduino Code As-Is
Your Arduino code is working correctly:
- Reads MQ-3 analog with proper calibration (Ro = 0.82)
- Reads NH3/H2S via I2C using DFRobot library
- Sends CSV format: `ethanol,ammonia,h2s\n`

No changes needed to the Arduino code.

### 3. PHP Backend Already Ready
The `sensor_data.php` already handles:
- POST requests with `ethanol`, `ammonia`, `h2s`, `batch_id`
- Calls Flask ML server for prediction
- Stores results in `sensor_readings` table

No changes needed to PHP.

---

## ESP32 Code Changes

### Configuration Section
```cpp
// WiFi Configuration
const char* WIFI_SSID = "GlobeAtHome_da200_2.4";
const char* WIFI_PASSWORD = "nVnkdF4e";

// Backend Server Configuration
const char* PHP_SERVER_URL = "http://YOUR_PC_IP:8083/api/sensor_data.php";
String BATCH_ID = "LAC-2026-002";  // Can be changed via serial command

// UART Configuration (Arduino connection)
#define ARDUINO_RX 16  // ESP32 receives on GPIO16
#define ARDUINO_TX 17  // ESP32 transmits on GPIO17
```

### Main Loop Flow
```cpp
void loop() {
  // 1. Handle web server (optional debug page)
  server.handleClient();
  
  // 2. Read UART data from Arduino
  if (Serial2.available() > 0) {
    String data = Serial2.readStringUntil('\n');
    data.trim();
    
    // 3. Parse CSV: "ethanol,ammonia,h2s"
    parseCSV(data, ethValue, nh3Value, h2sValue);
    
    // 4. Forward to PHP backend
    sendToBackend(ethValue, nh3Value, h2sValue, BATCH_ID);
  }
}
```

### Backend Integration Function
```cpp
void sendToBackend(float eth, float nh3, float h2s, String batchId) {
  if (WiFi.status() != WL_CONNECTED) return;
  
  HTTPClient http;
  http.begin(PHP_SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<256> doc;
  doc["batch_id"] = batchId;
  doc["ethanol"] = eth;
  doc["ammonia"] = nh3;
  doc["h2s"] = h2s;
  
  String json;
  serializeJson(doc, json);
  
  int code = http.POST(json);
  if (code == 200) {
    String response = http.getString();
    Serial.println("Backend response: " + response);
  } else {
    Serial.println("Backend error: " + String(code));
  }
  http.end();
}
```

---

## Complete Data Flow After Changes

1. **Arduino Nano** reads sensors every 1 second
2. **Arduino** sends CSV via UART: `"45.23,12.50,3.20\n"`
3. **ESP32** receives and parses the CSV
4. **ESP32** POSTs JSON to PHP: `{"batch_id":"LAC-2026-002","ethanol":45.23,"ammonia":12.50,"h2s":3.20}`
5. **PHP** calls Flask ML server for prediction
6. **PHP** stores in MySQL with status and shelf_life
7. **React Dashboard** fetches latest data via `sensor_data.php?action=latest&batch_id=LAC-2026-002`
8. **Dashboard** displays real-time charts and prediction

---

## Batch ID Management

The ESP32 will have two ways to set the batch ID:

1. **Hardcoded Default:** Set in code for quick testing
2. **Serial Command:** Change at runtime via Serial Monitor:
   ```
   CMD:BATCH:LAC-2026-005
   ```

This allows switching batches without reflashing the ESP32.

---

## Send Interval Configuration

Current Arduino sends every 1 second (1000ms). Options:
- Keep 1 second for real-time monitoring (more database writes)
- Increase to 5-10 seconds for less frequent updates (matches dashboard refresh)

The plan will keep the Arduino at 1 second but add a configurable send interval on ESP32 side to batch or throttle backend calls.

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/esp32/lactron_esp32.ino` | Complete rewrite: UART receive + HTTP POST integration |

### Features in New ESP32 Code:
- WiFi connection with reconnection logic
- Serial2 UART for Arduino data
- HTTP POST to PHP backend
- ArduinoJson for payload formatting
- Optional WebServer for debug page
- Serial commands for batch ID changes
- Configurable send interval
- LED status indicator (optional)

---

## Summary

This plan bridges the gap between your working hardware (Arduino + ESP32 UART) and the LACTRON backend:

| Component | Status | Action |
|-----------|--------|--------|
| Arduino Nano | Working | No changes |
| ESP32 UART | Working | Keep Serial2 setup |
| ESP32 HTTP | Missing | Add HTTPClient + ArduinoJson |
| PHP Backend | Ready | No changes |
| Flask ML | Ready | No changes |
| React Dashboard | Ready | No changes |

After implementation, your complete milk spoilage detection system will flow seamlessly from physical sensors to the web dashboard with real-time ML predictions.
