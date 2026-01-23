# LACTRON Backend

## Quick Start

### 1. Database Setup
```bash
mysql -u root -p < sql/database.sql
```
This creates the `lactron` database with all required tables.

### 2. PHP Server
```bash
cd php && php -S localhost:8080
```

### 3. Flask ML Server
```bash
cd python
pip install -r requirements.txt
python train_model.py  # First time only
python app.py
```

### 4. ESP32
- Open `esp32/lactron_esp32.ino` in Arduino IDE
- Update WiFi credentials and server IP
- Upload to ESP32

### Sign Up & Login
Create a new account via the Sign Up tab in the web app.
