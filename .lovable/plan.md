

# ESP32 Status Detection, Warm-Up Timer, and Dashboard Placeholders

## Overview

Three interconnected features:

1. **ESP32 Online/Offline Status Indicator** - Show a live status badge on the Welcome State ("Get Started" area) and the BatchSelector strip when a batch is active, plus in the Dataset Gathering modal. Polls the ESP32 `/status` endpoint every 10 seconds.

2. **Sensor Warm-Up Countdown** - When the ESP32 transitions from offline to online, show a 2-minute warm-up overlay/dialog. During warm-up, sensor data is not inserted into the database. The warm-up applies system-wide (Welcome State, active batch dashboard, dataset gathering).

3. **Dashboard Placeholders** - When a batch is selected but has no sensor readings yet, show `--` placeholders instead of default values for classification grade, shelf life, and sensor readings.

---

## 1. ESP32 Status Polling

### `src/hooks/useEsp32Status.ts` (New File)

A custom hook that polls `esp32API.getStatus()` every 10 seconds and tracks:
- `isOnline: boolean`
- `isWarmingUp: boolean` (true for 120 seconds after offline-to-online transition)
- `warmUpRemaining: number` (seconds left in warm-up countdown)

```text
Hook logic:
- Poll esp32API.getStatus() every 10s
- Track previous online state
- When transitions from offline -> online:
  - Set isWarmingUp = true
  - Start a 120-second countdown timer (1s interval)
  - When countdown hits 0, set isWarmingUp = false
- Expose: { isOnline, isWarmingUp, warmUpRemaining }
```

### Where the status indicator appears:

**A. `WelcomeState.tsx`** - Below the "Get Started" heading, show a small badge:
- Online: green dot + "ESP32 Online"
- Offline: red dot + "ESP32 Offline"

**B. `BatchSelector.tsx`** - Add a small status dot/badge next to the batch count or at the end of the info row:
- Online: green dot
- Offline: red dot + "ESP32 Offline" text

**C. `DatasetGatheringModal.tsx`** - Show ESP32 status in the active session status bar.

---

## 2. Warm-Up Overlay

### `src/components/dashboard/WarmUpOverlay.tsx` (New File)

A modal/dialog that appears when `isWarmingUp` is true. Shows:
- A circular countdown timer (120 seconds down to 0)
- "Sensor Warm-Up in Progress" title
- "The sensors require a 2-minute calibration period before readings are accurate."
- Countdown in MM:SS format
- Auto-dismisses when countdown reaches 0

This overlay is rendered at the Dashboard page level (in `Dashboard.tsx`), so it covers the entire dashboard regardless of which state (welcome/active batch) is shown.

### ESP32 Code Change: `backend/esp32/lactron_esp32.ino`

Add a `warm_up` field to the `/status` endpoint response so the frontend knows the ESP32's uptime. The existing `uptime_ms` field already provides this. No ESP32 code changes needed -- the frontend uses `uptime_ms` only as supplementary info; the warm-up logic is entirely frontend-driven based on offline-to-online transitions.

However, to prevent data insertion during warm-up, we need to gate data sending on the frontend side. Since the ESP32 sends data directly to the PHP backend (not through the frontend), the warm-up gate needs to be in the ESP32 itself:

**ESP32 Change**: Add a 120-second startup delay before sending data to the backend. After WiFi connects (in `setup()`), record `startupTime = millis()`. In `loop()`, skip `sendToBackend()` if `millis() - startupTime < 120000`. The `/status` endpoint will include a `warming_up` boolean field.

```text
New global:
  unsigned long startupTime = 0;
  bool warmingUp = true;

In setup() after connectWiFi():
  startupTime = millis();

In loop() before sendToBackend():
  if (millis() - startupTime < 120000) {
    warmingUp = true;
    // skip sendToBackend
  } else {
    warmingUp = false;
  }

In handleStatus():
  response["warming_up"] = warmingUp;
  response["warmup_remaining_ms"] = warmingUp ? max(0UL, 120000 - (millis() - startupTime)) : 0;
```

### Frontend Warm-Up Detection

The `useEsp32Status` hook will read the `warming_up` field from the ESP32 status response. If the ESP32 reports `warming_up: true`, the hook sets `isWarmingUp = true` and computes `warmUpRemaining` from `warmup_remaining_ms`. This is more accurate than frontend-only tracking since the ESP32 itself gates data.

---

## 3. Dashboard Placeholders for Empty Batches

### `StatusHero.tsx`

- Accept an optional `hasData: boolean` prop
- When `hasData` is false, show a neutral/gray state:
  - No icon (or a neutral circle icon)
  - Display `"--"` instead of "GRADE: GOOD" or "GRADE: SPOILED"
  - Use muted colors (no green/red)

### `ShelfLifeCard.tsx`

- Accept an optional `hasData: boolean` prop
- When `hasData` is false:
  - Display `"--"` instead of the numeric shelf life value
  - Hide the tips box or show a "Waiting for sensor data..." message
  - Hide simulation buttons

### `MolecularFingerprint.tsx`

- Already handles `data: null` by showing "No sensor readings yet for this batch" -- this is correct behavior, no changes needed.

### `Dashboard.tsx`

- Derive `hasData = sensorData !== null` and pass it to `StatusHero` and `ShelfLifeCard`
- When `sensorData` is null (no readings), pass `hasData={false}` and placeholder values

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `src/hooks/useEsp32Status.ts` | Create | Custom hook for ESP32 polling + warm-up state |
| `src/components/dashboard/WarmUpOverlay.tsx` | Create | 2-minute countdown overlay dialog |
| `src/pages/Dashboard.tsx` | Modify | Use hook, render overlay, pass `hasData` prop |
| `src/components/dashboard/WelcomeState.tsx` | Modify | Add ESP32 status badge |
| `src/components/dashboard/BatchSelector.tsx` | Modify | Add ESP32 status indicator |
| `src/components/dashboard/DatasetGatheringModal.tsx` | Modify | Show ESP32 status in session view |
| `src/components/dashboard/StatusHero.tsx` | Modify | Support `hasData=false` with `--` placeholder |
| `src/components/dashboard/ShelfLifeCard.tsx` | Modify | Support `hasData=false` with `--` placeholder |
| `backend/esp32/lactron_esp32.ino` | Modify | Add 120s warm-up gate + status fields |
| `src/lib/api.ts` | Modify | Update ESP32 status response type to include `warming_up` and `warmup_remaining_ms` |

## Technical Details

### ESP32 Status Response (updated)

```json
{
  "success": true,
  "ip": "192.168.8.150",
  "batch_id": "BATCH-001",
  "connected": true,
  "data_received": true,
  "uptime_ms": 45000,
  "warming_up": true,
  "warmup_remaining_ms": 75000,
  "sensors": { "ethanol": 12.5, "ammonia": 5.2, "h2s": 0.8 }
}
```

### useEsp32Status Hook Interface

```typescript
interface Esp32Status {
  isOnline: boolean;
  isWarmingUp: boolean;
  warmUpRemaining: number; // seconds
}
```

### Warm-Up Overlay Behavior

- Appears as a centered dialog (not blocking the entire screen, but clearly visible)
- Shows a circular progress ring counting down from 2:00 to 0:00
- Auto-dismisses when warm-up completes
- Cannot be manually dismissed (sensors need calibration time)
- If ESP32 goes offline again during warm-up and comes back, the ESP32 restarts its own 120s timer

### Placeholder States

When `hasData` is false:

- **StatusHero**: Gray border, no glow, muted icon, text shows `"--"` in large font
- **ShelfLifeCard**: Shows `"--"` instead of `"0.0"`, tips section replaced with "Awaiting first sensor reading..."
- **Grade in Dashboard**: The `grade` variable becomes `"--"` when no data

