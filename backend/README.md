# LACTRON Backend

## Network Configuration

All services bind to your machine's network IP (e.g., `192.168.8.145`) to enable ESP32 communication.

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 8080 | http://192.168.8.145:8080 |
| PHP Backend | 8080 | http://192.168.8.145:8080 |
| Flask ML Server | 5000 | http://192.168.8.145:5000 |
| ESP32 Gateway | 80 | http://192.168.254.150 |

## Quick Start

### 1. Database Setup
```bash
mysql -u root -p < sql/database.sql
```
This creates the `lactron` database with all required tables.

### 2. PHP Server (Port 8080)
```bash
# Bind to network IP for ESP32 access
cd php && php -S 192.168.8.145:8080

# Or bind to all interfaces (0.0.0.0)
cd php && php -S 0.0.0.0:8080
```

### 3. Flask ML Server (Port 5000)
```bash
cd python
pip install -r requirements.txt
python train_model.py  # First time only
python app.py --host 0.0.0.0
```

### 4. Frontend (Port 8080)
```bash
# From project root
npm run dev
# Access at: http://192.168.8.145:8080
```

### 5. ESP32
- Open `esp32/lactron_esp32.ino` in Arduino IDE
- Update WiFi credentials (WIFI_SSID, WIFI_PASSWORD)
- Verify server IP is set to your machine's IP
- Upload to ESP32
- ESP32 will get static IP: **192.168.254.150**

### Sign Up & Login
Create a new account via the Sign Up tab in the web app.

## ESP32 Static IP Configuration

The ESP32 is configured with a static IP to enable bidirectional communication:

| Setting | Value |
|---------|-------|
| IP Address | 192.168.254.150 |
| Gateway | 192.168.254.1 |
| Subnet Mask | 255.255.255.0 |
| DNS | 8.8.8.8 |

## ESP32 HTTP Endpoints

The ESP32 runs a web server on port 80 to receive commands from the frontend:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/batch` | POST | Set active batch ID. Body: `{"batch_id": "..."}` |
| `/batch` | GET | Get current batch ID |
| `/status` | GET | Get ESP32 status (IP, batch, sensors, uptime) |

### Example: Set Active Batch
```bash
curl -X POST http://192.168.254.150/batch \
  -H "Content-Type: application/json" \
  -d '{"batch_id": "BATCH-001"}'
```

### Example: Get Status
```bash
curl http://192.168.254.150/status
```

Response:
```json
{
  "success": true,
  "ip": "192.168.254.150",
  "batch_id": "BATCH-001",
  "connected": true,
  "data_received": true,
  "uptime_ms": 123456,
  "sensors": {
    "ethanol": 15.2,
    "ammonia": 8.5,
    "h2s": 3.1
  }
}
```

## Data Flow

```text
1. User selects batch in Dashboard
   └─> Frontend POSTs to ESP32 /batch endpoint
   
2. ESP32 receives batch activation
   └─> Starts sending sensor data to PHP backend
   
3. Arduino sends sensor data via UART
   └─> ESP32 parses and forwards to PHP
   
4. PHP backend receives sensor data
   └─> Calls Flask ML for prediction
   └─> Stores in MySQL database
   
5. Dashboard polls sensor_data.php
   └─> Displays real-time updates
```
