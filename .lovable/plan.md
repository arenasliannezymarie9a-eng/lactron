

# Network Configuration Update for ESP32 Communication

## Current State

You're running the development server on the **Network URL** (`http://192.168.254.100:5173`) instead of localhost to enable communication with the ESP32. The current configuration has:

- **Vite**: Port 5173, host `::` (binds to all interfaces - already correct)
- **API Config**: Already points to `192.168.254.100:8080` for PHP and `192.168.254.100:5000` for Flask
- **CORS**: Has `192.168.254.100:5173` and `192.168.254.100:8080` in allowlist
- **ESP32**: Still has placeholder `YOUR_PC_IP`

## Required Changes

### 1. Vite Configuration (`vite.config.ts`)
**Change port from 5173 to 8080** as required by the Lovable platform.

```typescript
server: {
  host: "::",
  port: 8080,  // Required port for Lovable
}
```

### 2. Update CORS Configuration (`backend/php/config/cors.php`)
Add a regex pattern to allow any IP on the local network (192.168.x.x) for easier development across different machines.

**Current:**
```php
$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://192.168.254.100:5173',
    'http://192.168.254.100:8080',
];
```

**Updated:**
```php
$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080',
    'http://192.168.254.100:5173',
    'http://192.168.254.100:8080',
];

// Allow any 192.168.x.x IP address (local network)
$isLocalNetworkOrigin = false;
if (!empty($origin)) {
    $isLocalNetworkOrigin = preg_match('#^https?://192\.168\.\d{1,3}\.\d{1,3}:\d+$#', $origin) === 1;
}
```

### 3. Update API Configuration (`src/lib/api.ts`)
Update the comments and ensure the default URLs reflect the current setup with port 8080 for the frontend.

**Updated configuration:**
```typescript
// Default to 8080 for PHP API, running on the local network IP
const DEFAULT_PHP_BASE_URL = "http://192.168.254.100:8080/api";

const API_CONFIG = {
  PHP_BASE_URL:
    import.meta.env.VITE_PHP_BASE_URL ||
    import.meta.env.VITE_PHP_API_URL ||
    DEFAULT_PHP_BASE_URL,
  FLASK_BASE_URL: import.meta.env.VITE_FLASK_BASE_URL || "http://192.168.254.100:5000",
} as const;

const PHP_BACKEND_UNAVAILABLE_MESSAGE =
  "Backend not available. Start the PHP API: php -S 192.168.254.100:8080 -t backend/php";
```

### 4. Update ESP32 Code (`backend/esp32/lactron_esp32.ino`)
Replace the placeholder `YOUR_PC_IP` with a clearer example using your actual IP.

**Updated:**
```cpp
// Backend Server Configuration
// Your development machine IP: 192.168.254.100
const char* PHP_SERVER_URL = "http://192.168.254.100:8080/api/sensor_data.php";
const char* BATCH_ENDPOINT = "http://192.168.254.100:8080/api/batches.php?action=esp_active";
```

### 5. Update Backend README (`backend/README.md`)
Update the PHP server startup command to bind to the network IP instead of localhost.

**Updated:**
```bash
# PHP Server - bind to network IP for ESP32 access
cd php && php -S 192.168.254.100:8080

# Or bind to all interfaces (0.0.0.0)
cd php && php -S 0.0.0.0:8080
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `vite.config.ts` | Change port from 5173 to 8080 |
| `backend/php/config/cors.php` | Add regex for 192.168.x.x network origins |
| `src/lib/api.ts` | Update help message to use network IP |
| `backend/esp32/lactron_esp32.ino` | Set default IP to 192.168.254.100 |
| `backend/README.md` | Update PHP startup command to use network IP |

---

## Network Architecture After Changes

```text
+----------------+                     +------------------+                    +------------------+
|    ESP32       |                     |  Dev Machine     |                    |   Browser        |
| 192.168.x.x    |  HTTP POST          | 192.168.254.100  |   HTTP (CORS)      | 192.168.x.x      |
|                | ------------------> |   PHP :8080      | <----------------- |   or localhost   |
|                |                     |   Flask :5000    |                    |                  |
|                |                     |   Vite :8080     |                    |                  |
+----------------+                     +------------------+                    +------------------+
```

---

## Startup Commands After Changes

```bash
# Terminal 1: Frontend (Vite)
npm run dev
# Accessible at: http://192.168.254.100:8080

# Terminal 2: PHP Backend
cd backend/php && php -S 192.168.254.100:8080
# Or: php -S 0.0.0.0:8080

# Terminal 3: Flask ML Server
cd backend/python && python app.py
# Bind to: 0.0.0.0:5000

# ESP32: Flash with updated IP
# Points to: http://192.168.254.100:8080/api/*
```

