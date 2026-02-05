

# Network Architecture Refactor for ESP32 Communication

## Problem Analysis

The current configuration incorrectly set Vite to port 8080, which conflicts with the PHP backend. When you access port 8080, you're hitting the PHP server which shows "Not Found" because there's no root `/` handler in the PHP API structure.

## Correct Architecture

```text
+----------------+                     +--------------------+                    +------------------+
|    ESP32       |                     |   Dev Machine      |                    |   Browser        |
| 192.168.x.x    |  HTTP POST          |  192.168.254.100   |   HTTP (CORS)      | 192.168.x.x      |
|                | ------------------> |                    | <----------------- |  or localhost    |
|                |                     |  PHP API  :8080    |                    |                  |
|                |                     |  Flask ML :5000    |                    |                  |
|                |                     |  Vite     :5173    |                    |                  |
+----------------+                     +--------------------+                    +------------------+
```

**Port Assignments:**
- Frontend (Vite): **5173** - Required by Lovable platform
- PHP Backend: **8080** - Standard backend port, serves `/api/*` endpoints
- Flask ML Server: **5000** - ML prediction service

---

## Files to Modify

| File | Changes |
|------|---------|
| `vite.config.ts` | Change port from 8080 to 5173 |
| `src/lib/api.ts` | Update PHP URL to use network IP with port 8080 |
| `backend/php/config/cors.php` | Already configured correctly for network access |
| `backend/esp32/lactron_esp32.ino` | Already configured with 192.168.254.100:8080 |
| `backend/README.md` | Update startup commands for clarity |

---

## Detailed Changes

### 1. Vite Configuration (`vite.config.ts`)

Change port from 8080 back to 5173:

```typescript
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",      // Binds to all interfaces (allows network access)
    port: 5173,      // Frontend port - access via http://192.168.254.100:5173
  },
  // ... rest unchanged
}));
```

### 2. API Configuration (`src/lib/api.ts`)

Update to clearly separate frontend and backend ports:

```typescript
// LACTRON API Configuration and Services
// 
// Network Configuration:
// - Frontend (Vite):  http://192.168.254.100:5173
// - PHP Backend:      http://192.168.254.100:8080
// - Flask ML Server:  http://192.168.254.100:5000
//
// The PHP backend runs on port 8080, NOT the same port as Vite.
// Start PHP with: php -S 192.168.254.100:8080 -t backend/php

const DEFAULT_PHP_BASE_URL = "http://192.168.254.100:8080/api";
const DEFAULT_FLASK_BASE_URL = "http://192.168.254.100:5000";

const API_CONFIG = {
  PHP_BASE_URL:
    import.meta.env.VITE_PHP_BASE_URL ||
    import.meta.env.VITE_PHP_API_URL ||
    DEFAULT_PHP_BASE_URL,
  FLASK_BASE_URL: 
    import.meta.env.VITE_FLASK_BASE_URL || 
    DEFAULT_FLASK_BASE_URL,
} as const;

const PHP_BACKEND_UNAVAILABLE_MESSAGE =
  "Backend not available. Start PHP: php -S 192.168.254.100:8080 -t backend/php";
```

### 3. Backend README (`backend/README.md`)

Update with clear startup instructions:

```markdown
# LACTRON Backend

## Network Configuration

All services bind to your machine's network IP (e.g., `192.168.254.100`) to enable ESP32 communication.

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 5173 | http://192.168.254.100:5173 |
| PHP Backend | 8080 | http://192.168.254.100:8080 |
| Flask ML Server | 5000 | http://192.168.254.100:5000 |

## Quick Start

### 1. Database Setup
```bash
mysql -u root -p < sql/database.sql
```

### 2. PHP Server (Port 8080)
```bash
# Bind to your network IP
cd php && php -S 192.168.254.100:8080

# Or bind to all interfaces
cd php && php -S 0.0.0.0:8080
```

### 3. Flask ML Server (Port 5000)
```bash
cd python
pip install -r requirements.txt
python train_model.py  # First time only
python app.py --host 0.0.0.0
```

### 4. Frontend (Port 5173)
```bash
# From project root
npm run dev
# Access at: http://192.168.254.100:5173
```

### 5. ESP32
- Open `esp32/lactron_esp32.ino` in Arduino IDE
- Update WiFi credentials
- Verify server IP is set to your machine's IP
- Upload to ESP32
```

### 4. Create Startup Reference File (`startup.txt`)

Create a quick reference file in project root:

```text
# LACTRON Development Startup Commands
# Your Machine IP: 192.168.254.100

# Terminal 1: Frontend (Vite) - Port 5173
npm run dev
# Access at: http://192.168.254.100:5173

# Terminal 2: PHP Backend - Port 8080
cd backend/php && php -S 192.168.254.100:8080
# Or: php -S 0.0.0.0:8080
# API at: http://192.168.254.100:8080/api/

# Terminal 3: Flask ML Server - Port 5000
cd backend/python && python app.py
# Or: python app.py --host 0.0.0.0

# ESP32 Configuration:
# - PHP_SERVER_URL: http://192.168.254.100:8080/api/sensor_data.php
# - BATCH_ENDPOINT: http://192.168.254.100:8080/api/batches.php?action=esp_active
```

---

## ESP32 Code (Already Correct)

The ESP32 code is already configured correctly with port 8080 for the PHP backend:

```cpp
const char* PHP_SERVER_URL = "http://192.168.254.100:8080/api/sensor_data.php";
const char* BATCH_ENDPOINT = "http://192.168.254.100:8080/api/batches.php?action=esp_active";
```

---

## CORS Configuration (Already Correct)

The `backend/php/config/cors.php` already allows:
- `localhost:5173` and `localhost:8080`
- `192.168.254.100:5173` and `192.168.254.100:8080`
- Any `192.168.x.x` IP via regex pattern
- Lovable preview/published domains

---

## Data Flow After Fix

```text
1. Browser opens: http://192.168.254.100:5173 (Vite frontend)
                    ↓
2. React app makes API call to: http://192.168.254.100:8080/api/auth.php
                    ↓
3. PHP backend handles request, returns JSON
                    ↓
4. ESP32 sends sensor data to: http://192.168.254.100:8080/api/sensor_data.php
                    ↓
5. PHP calls Flask ML at: http://192.168.254.100:5000/predict
                    ↓
6. Prediction stored in MySQL, returned to ESP32
                    ↓
7. Dashboard polls sensor_data.php, displays real-time updates
```

---

## Startup Sequence

```bash
# Step 1: Start PHP Backend (Terminal 1)
cd backend/php
php -S 0.0.0.0:8080
# Verify: curl http://192.168.254.100:8080/api/hello.php

# Step 2: Start Flask ML (Terminal 2)
cd backend/python
python app.py
# Verify: curl http://192.168.254.100:5000/health

# Step 3: Start Frontend (Terminal 3)
npm run dev
# Open: http://192.168.254.100:5173

# Step 4: Power on ESP32
# Monitor serial output for connection status
```

