
# Fix ESP32 Communication Issues

## Root Cause Analysis

I identified 3 critical issues preventing communication:

### Issue 1: IP Address Mismatch
| Component | Configured IP | Actual/Expected IP |
|-----------|---------------|---------------------|
| ESP32 Static IP | `192.168.8.150` | Correct (on 8.x subnet) |
| Frontend ESP32 URL | `192.168.254.150` | Wrong - should be `192.168.8.150` |

The frontend is trying to push the batch to the wrong IP address!

### Issue 2: PHP Auth Blocks ESP32 Fallback
The `batches.php?action=esp_active` endpoint requires session authentication, but ESP32 can't send cookies:
```php
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;  // <-- ESP32 fails here
}
```

### Issue 3: Frontend Not Showing ESP32 Sync Status
When batch selection fails to reach ESP32, there's no visual feedback to the user.

---

## Changes Required

### 1. Fix Frontend ESP32 URL (`src/lib/api.ts`)
Update the ESP32 URL to match the actual static IP:

```typescript
const DEFAULT_ESP32_URL = "http://192.168.8.150";
```

### 2. Fix PHP Auth Bypass for ESP32 (`backend/php/api/batches.php`)
Move the `esp_active` endpoint handler BEFORE the auth check so ESP32 can access it without a session:

```php
// Handle esp_active BEFORE auth check (ESP32 can't authenticate)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'esp_active') {
    // Return the most recently created batch for ESP32
    $stmt = $pdo->query('SELECT batch_id FROM batches ORDER BY created_at DESC LIMIT 1');
    $batch = $stmt->fetch();
    echo json_encode(['success' => true, 'batch_id' => $batch ? $batch['batch_id'] : null]);
    exit;
}

// Now check authentication for all other endpoints
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}
```

### 3. Update Documentation (`startup.txt`)
Update ESP32 IP to be consistent with the actual configuration.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/api.ts` | Fix `DEFAULT_ESP32_URL` to `http://192.168.8.150` |
| `backend/php/api/batches.php` | Move `esp_active` handler before auth check |
| `startup.txt` | Update ESP32 IP documentation |

---

## After These Changes

1. **Dashboard selects batch** → Pushes to ESP32 at `192.168.8.150:80/batch` ✓
2. **ESP32 receives batch** → Sets `BATCH_ID` variable ✓
3. **ESP32 sends sensor data** → Uses active batch ID ✓
4. **Fallback works** → If frontend push fails, ESP32 polls `esp_active` (now without auth) ✓

---

## Verification Steps

After uploading the updated ESP32 code and applying these changes:

1. Start PHP: `php -S 192.168.8.145:8080 -t backend/php`
2. Start Frontend: `npm run dev`
3. Open dashboard, select a batch
4. Check ESP32 Serial Monitor for: `Received batch update: {"batch_id":"LAC-2026-001"}`
5. Sensor data should now flow to the backend
