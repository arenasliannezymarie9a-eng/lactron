

# ESP32 Static IP and Bidirectional Batch Communication

## Overview

This plan configures the ESP32 with a static IP address and enables the LACTRON dashboard to push the active batch selection directly to the ESP32, eliminating the 30-second polling delay.

---

## Architecture Changes

```text
CURRENT FLOW (Polling):
+------------------+         polls every 30s        +------------------+
|      ESP32       | <----------------------------- |   PHP Backend    |
| 192.168.254.150  |   (esp_active endpoint)        |   :8080          |
+------------------+                                +------------------+

NEW FLOW (Push + Polling):
+------------------+         HTTP POST              +------------------+
|    Dashboard     | -----------------------------> |      ESP32       |
| 192.168.254.100  |   /batch (push active batch)   | 192.168.254.150  |
|     :5173        |                                |      :80         |
+------------------+                                +------------------+
        |                                                   |
        |              PHP Backend :8080                    |
        +----------------> (batches/sensor data) <----------+
```

---

## Changes Required

### 1. ESP32 Code - Static IP Configuration

**File:** `backend/esp32/lactron_esp32.ino`

Add static IP configuration before WiFi.begin():

```cpp
// Static IP Configuration
IPAddress staticIP(192, 168, 254, 150);
IPAddress gateway(192, 168, 254, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns(8, 8, 8, 8);

void connectWiFi() {
  // Configure static IP before connecting
  WiFi.config(staticIP, gateway, subnet, dns);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  // ... rest of connection code
}
```

### 2. ESP32 Code - Add HTTP Server for Receiving Batch Commands

**File:** `backend/esp32/lactron_esp32.ino`

Add a lightweight web server to receive batch updates from the frontend:

```cpp
#include <WebServer.h>

WebServer server(80);

void setup() {
  // ... existing setup code
  
  // Setup HTTP endpoints
  server.on("/batch", HTTP_POST, handleSetBatch);
  server.on("/batch", HTTP_GET, handleGetBatch);
  server.on("/status", HTTP_GET, handleStatus);
  server.begin();
}

void loop() {
  server.handleClient();  // Handle incoming HTTP requests
  // ... rest of loop
}

void handleSetBatch() {
  // Parse JSON body to get batch_id
  // Update BATCH_ID variable
  // Return success response
}
```

### 3. Frontend - Add ESP32 Configuration

**File:** `src/lib/api.ts`

Add ESP32 endpoint configuration:

```typescript
const DEFAULT_ESP32_URL = "http://192.168.254.150";

const API_CONFIG = {
  PHP_BASE_URL: /* existing */,
  FLASK_BASE_URL: /* existing */,
  ESP32_URL: import.meta.env.VITE_ESP32_URL || DEFAULT_ESP32_URL,
} as const;
```

### 4. Frontend - Add ESP32 API Functions

**File:** `src/lib/api.ts`

Add API functions to communicate with ESP32:

```typescript
export const esp32API = {
  async setActiveBatch(batchId: string): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(`${API_CONFIG.ESP32_URL}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: batchId }),
      });
      return await response.json();
    } catch (error) {
      console.warn('ESP32 not reachable, batch will sync via polling');
      return { success: false, error: 'ESP32 not reachable' };
    }
  },

  async clearBatch(): Promise<ApiResponse<null>> {
    try {
      const response = await fetch(`${API_CONFIG.ESP32_URL}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: '' }),
      });
      return await response.json();
    } catch (error) {
      return { success: false, error: 'ESP32 not reachable' };
    }
  },

  async getStatus(): Promise<ApiResponse<{ip: string, batch_id: string, connected: boolean}>> {
    try {
      const response = await fetch(`${API_CONFIG.ESP32_URL}/status`);
      return await response.json();
    } catch (error) {
      return { success: false, error: 'ESP32 offline' };
    }
  },
};
```

### 5. Dashboard - Push Batch Selection to ESP32

**File:** `src/pages/Dashboard.tsx`

Update `handleSelectBatch` to notify ESP32:

```typescript
import { esp32API } from "@/lib/api";

const handleSelectBatch = async (batch: Batch) => {
  setCurrentBatch(batch);
  
  // Push to ESP32 (non-blocking, fails gracefully)
  const response = await esp32API.setActiveBatch(batch.batch_id);
  if (response.success) {
    toast.success("ESP32 synced with selected batch");
  }
  // If ESP32 unreachable, it will still sync via polling
};

const handleCloseBatch = async () => {
  setCurrentBatch(null);
  
  // Clear batch on ESP32
  await esp32API.clearBatch();
};
```

### 6. Update Documentation

**File:** `startup.txt` and `backend/README.md`

Add ESP32 static IP information:

```text
# ESP32 Configuration:
# - Static IP: 192.168.254.150
# - Gateway: 192.168.254.1
# - Web Server Port: 80
# - Endpoints:
#   - POST /batch - Set active batch
#   - GET /batch - Get current batch
#   - GET /status - Get ESP32 status
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/esp32/lactron_esp32.ino` | Add static IP config, add WebServer for receiving batch commands |
| `src/lib/api.ts` | Add ESP32_URL config and esp32API functions |
| `src/pages/Dashboard.tsx` | Push batch selection to ESP32 on select/close |
| `startup.txt` | Document ESP32 static IP and endpoints |
| `backend/README.md` | Add ESP32 network documentation |
| `vite.config.ts` | Set port to 8080 (Lovable requirement) |

---

## Technical Details

### ESP32 Static IP Setup

The ESP32 will be configured with:
- **IP Address:** 192.168.254.150
- **Gateway:** 192.168.254.1 (your router)
- **Subnet Mask:** 255.255.255.0
- **DNS:** 8.8.8.8 (Google DNS)

### ESP32 HTTP Server Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/batch` | POST | Set active batch ID (JSON: `{"batch_id": "..."}`) |
| `/batch` | GET | Get current batch ID |
| `/status` | GET | Get ESP32 status (IP, batch, WiFi status) |

### Fallback Behavior

If the ESP32 is unreachable when selecting a batch:
1. The frontend logs a warning (no error shown to user)
2. ESP32 continues polling the PHP backend every 30 seconds
3. Batch will sync on next poll cycle

---

## Network Requirements

Ensure the following for ESP32 ↔ Frontend communication:
1. ESP32 and dev machine on same subnet (192.168.254.x)
2. Router allows device-to-device communication
3. No firewall blocking port 80 on ESP32
4. Static IP (192.168.254.150) not assigned to other devices

