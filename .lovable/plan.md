
# Refactor to Use WAMP + Vite Proxy Setup

## Current Setup Issues

| Current | Problem |
|---------|---------|
| Vite runs on port 5173 | Lovable requires port 8080 |
| PHP runs via manual `php -S` command | You have to start it separately |
| Frontend calls `http://192.168.8.145:8080/api` directly | Requires running separate PHP server |

## Proposed Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                     Development Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Browser ──► Vite (port 8080) ──► /api/* proxy ──► WAMP    │
│                    │                                (port 80)│
│                    │                                         │
│                    └──► All other routes ──► React App       │
│                                                              │
│   ESP32 ────────────────────────────────────────► WAMP      │
│                                               (port 80)      │
└─────────────────────────────────────────────────────────────┘
```

**Benefits:**
- Only run `npm run dev` for frontend
- WAMP runs in background (tray) serving PHP on port 80
- Vite proxies `/api/*` requests to WAMP
- ESP32 sends data directly to WAMP on port 80
- Meets Lovable's port 8080 requirement

---

## Required Changes

### 1. Configure Vite Proxy (`vite.config.ts`)

Set Vite to port 8080 and proxy `/api` requests to WAMP (port 80):

```typescript
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:80',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  // ... rest of config
}));
```

### 2. Update API Configuration (`src/lib/api.ts`)

Change PHP base URL to use relative path (proxied by Vite) or direct to WAMP port 80:

```typescript
// For browser (uses Vite proxy)
const DEFAULT_PHP_BASE_URL = "/api";

// For ESP32 (direct to WAMP)
// ESP32 should target: http://192.168.8.145:80/lactron/api
```

### 3. WAMP Configuration (Manual Step)

You'll need to set up WAMP to serve the PHP files:

**Option A: Virtual Host (Recommended)**
Create a virtual host in WAMP that maps `/lactron` to your project's `backend/php` folder.

**Option B: Symlink**
Create a symbolic link from WAMP's www folder to your project:
```powershell
mklink /D "C:\wamp64\www\lactron" "C:\path\to\your\project\backend\php"
```

### 4. Update ESP32 Configuration (`backend/esp32/lactron_esp32.ino`)

Change the ESP32 to send data to WAMP on port 80 instead of 8080:

```cpp
// Change from:
const char* PHP_SERVER_URL = "http://192.168.8.145:8080/api/sensor_data.php";

// To:
const char* PHP_SERVER_URL = "http://192.168.8.145/lactron/api/sensor_data.php";
```

### 5. Update Documentation (`startup.txt`)

Simplify the startup instructions.

---

## Files to Modify

| File | Change |
|------|--------|
| `vite.config.ts` | Set port 8080, add proxy for `/api` to localhost:80 |
| `src/lib/api.ts` | Change `DEFAULT_PHP_BASE_URL` to `/api` for browser requests |
| `backend/esp32/lactron_esp32.ino` | Update PHP server URL to port 80 with `/lactron` path |
| `startup.txt` | Update documentation for simplified workflow |

---

## WAMP Setup (One-Time Manual Steps)

1. **Create symlink to PHP files:**
   ```powershell
   # Run as Administrator in PowerShell
   mklink /D "C:\wamp64\www\lactron" "C:\full\path\to\project\backend\php"
   ```

2. **Verify WAMP is running** (green icon in system tray)

3. **Test PHP accessibility:**
   - Open browser: `http://localhost/lactron/api/hello.php`
   - Should return JSON response

4. **Ensure WAMP listens on network interface:**
   - Click WAMP tray icon → Apache → httpd.conf
   - Find `Listen 80` and ensure it's not `Listen 127.0.0.1:80`
   - Or add: `Listen 0.0.0.0:80`

---

## After Implementation

**Development workflow:**
1. Start WAMP (runs in background)
2. Run `npm run dev`
3. Open `http://localhost:8080`
4. API calls automatically proxied to WAMP

**ESP32 workflow:**
1. ESP32 connects to `http://192.168.8.145/lactron/api/sensor_data.php`
2. WAMP serves the PHP directly on port 80
3. No HTTP Error -1 (port 80 is standard and always accessible)
