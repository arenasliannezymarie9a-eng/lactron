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
This creates the `lactron` database with all required tables.

### 2. PHP Server (Port 8080)
```bash
# Bind to network IP for ESP32 access
cd php && php -S 192.168.254.100:8080

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

### Sign Up & Login
Create a new account via the Sign Up tab in the web app.
