

# ESP32 Code Simplification Plan

## Current Issues

The existing ESP32 code has unnecessary complexity:
1. **Web server hosting** - Serves a debug webpage which isn't needed since all data goes to the React dashboard
2. **Local batch management** - Batch ID is hardcoded or set via serial commands instead of syncing with the server
3. **Unnecessary memory usage** - WebServer library consumes RAM that could be freed

## Proposed Architecture

```text
+----------------+                       +----------------+                 +------------------+
|  ARDUINO NANO  |     UART (9600)       |     ESP32      |    HTTP POST   |   PHP Backend    |
|  (Sensors)     |  ------------------>  |   (Gateway)    |  ----------->  |  sensor_data.php |
+----------------+                       +----------------+                 +------------------+
                                                |                                   |
                                          On startup:                         Stores in:
                                          1. Connect WiFi                    sensor_readings
                                          2. Fetch active batch                    |
                                             from server                           v
                                          3. Forward sensor data          +------------------+
                                             with batch_id                | React Dashboard  |
                                                                          +------------------+
```

## Key Changes

### 1. Remove Web Server
- Delete `WebServer.h` include
- Remove all web server functions (`setupWebServer`, `handleRoot`, `handleData`, `handleBatchChange`)
- Remove `server.handleClient()` from loop
- Reduce memory footprint significantly

### 2. Server-Synced Batch Selection
Create a new PHP endpoint or add an action to `batches.php` that returns the currently "active" batch for the ESP32 to use. Two approaches:

**Option A: Use Latest Created Batch (Simple)**
- ESP32 fetches from: `batches.php?action=esp_active`
- Returns the most recently created batch's `batch_id`
- No user intervention needed

**Option B: Explicit Active Batch Flag (More Control)**
- Add `is_active` column to batches table
- Dashboard UI toggles which batch receives sensor data
- ESP32 queries for the batch where `is_active = true`

### 3. Simplified ESP32 Workflow

```text
setup():
  1. Connect to WiFi
  2. Fetch active batch from server → BATCH_ID
  
loop():
  1. Read UART data from Arduino
  2. Parse CSV (ethanol, ammonia, h2s)
  3. Send to PHP backend with current BATCH_ID
  4. Check if batch changed (periodic refresh every 30 seconds)
```

---

## Implementation Details

### New PHP Endpoint
**File:** `backend/php/api/batches.php`

Add a new action `esp_active` that returns the batch ID for ESP32:

```php
case 'esp_active':
    // Return the most recently created batch for any user
    // (ESP32 doesn't have session, so we return global active batch)
    $stmt = $pdo->query('
        SELECT batch_id FROM batches 
        ORDER BY created_at DESC LIMIT 1
    ');
    $batch = $stmt->fetch();
    echo json_encode([
        'success' => true, 
        'batch_id' => $batch ? $batch['batch_id'] : null
    ]);
    break;
```

### Revised ESP32 Code Structure

```cpp
// Includes - NO WebServer
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Configuration
const char* WIFI_SSID = "YOUR_SSID";
const char* WIFI_PASSWORD = "YOUR_PASSWORD";
const char* PHP_SERVER_URL = "http://YOUR_PC_IP:8083/api/sensor_data.php";
const char* BATCH_ENDPOINT = "http://YOUR_PC_IP:8083/api/batches.php?action=esp_active";

// State
String BATCH_ID = "";  // Fetched from server
unsigned long lastBatchCheck = 0;
const unsigned long BATCH_CHECK_INTERVAL = 30000;  // 30 seconds

void setup() {
  // Init Serial, UART, WiFi
  connectWiFi();
  fetchActiveBatch();  // Get initial batch from server
}

void loop() {
  readArduinoData();  // Parse UART
  
  if (dataReady && intervalElapsed) {
    sendToBackend();  // POST to PHP
  }
  
  // Periodically refresh batch ID from server
  if (millis() - lastBatchCheck > BATCH_CHECK_INTERVAL) {
    fetchActiveBatch();
    lastBatchCheck = millis();
  }
}

void fetchActiveBatch() {
  HTTPClient http;
  http.begin(BATCH_ENDPOINT);
  int code = http.GET();
  
  if (code == 200) {
    String response = http.getString();
    // Parse JSON to get batch_id
    StaticJsonDocument<128> doc;
    deserializeJson(doc, response);
    if (doc["success"] && !doc["batch_id"].isNull()) {
      BATCH_ID = doc["batch_id"].as<String>();
      Serial.println("Active batch: " + BATCH_ID);
    }
  }
  http.end();
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/esp32/lactron_esp32.ino` | Remove WebServer, add batch fetch from PHP |
| `backend/php/api/batches.php` | Add `esp_active` action for ESP32 batch sync |

---

## Complete Workflow After Changes

1. **User creates batch** in React dashboard → stored in `batches` table
2. **ESP32 starts** → connects to WiFi → calls `batches.php?action=esp_active`
3. **Server returns** the latest batch's `batch_id`
4. **Arduino sends sensor data** via UART → ESP32 receives
5. **ESP32 POSTs** `{batch_id, ethanol, ammonia, h2s}` to `sensor_data.php`
6. **PHP stores** in `sensor_readings` → calls Flask ML → returns prediction
7. **Dashboard displays** real-time data for the selected batch
8. **Every 30 seconds** → ESP32 re-checks active batch (in case user switched)

---

## Benefits

- **Simpler code** - ~150 lines removed (web server functions)
- **Less memory** - No WebServer library loaded
- **Server-synced** - Batch ID always matches what's in the dashboard
- **No manual config** - Users don't need to set batch via Serial commands
- **Automatic updates** - ESP32 detects when user switches batches

---

## Summary

| Component | Before | After |
|-----------|--------|-------|
| Web Server | Yes (debug page) | Removed |
| Batch ID Source | Hardcoded/Serial command | Fetched from PHP server |
| Memory Usage | Higher (WebServer) | Lower |
| Code Lines | ~360 | ~200 |
| User Intervention | Required for batch switch | Automatic |

