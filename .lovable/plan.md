

# Refine Dataset Gathering: Fix Remaining Time, Optional Warm-Up

## Problems Identified

1. **Remaining shelf life not decreasing / showing 80h instead of 72h**: The PHP `computeRemainingShelfLife()` function uses `time()` (server UTC) vs `strtotime($session['started_at'])` which comes from MySQL `CURRENT_TIMESTAMP`. If the MySQL timezone and PHP timezone differ, `strtotime()` can misinterpret the timestamp, causing a negative elapsed time that inflates the result above the initial value. The fix is to use MySQL's own `TIMESTAMPDIFF` to compute elapsed time server-side (consistent timezone), and also clamp the result to never exceed `initial_shelf_life`.

2. **Warm-up overlay is always mandatory**: Users want the option to skip or disable it. Add a toggle switch to the dashboard (stored in localStorage) that controls whether the warm-up overlay appears and whether the ESP32 gates data during warm-up. The ESP32 warm-up gate stays in firmware (hardware calibration is real), but the UI overlay becomes optional.

## Changes

### 1. Fix Remaining Shelf Life (PHP backend)

**File: `backend/php/api/dataset.php`**

Replace the `computeRemainingShelfLife()` function to use MySQL `TIMESTAMPDIFF` instead of PHP `time()` vs `strtotime()`. This eliminates timezone mismatch issues.

Alternatively, fix the PHP function by:
- Using `UNIX_TIMESTAMP(started_at)` from MySQL instead of `strtotime()`
- Clamping result: `min($initialHours, max(0, $remainingHours))`

The simpler approach is to clamp in PHP and normalize timezone handling:

```php
function computeRemainingShelfLife($session) {
    $initialHours = floatval($session['initial_shelf_life']);
    $startedAt = strtotime($session['started_at'] . ' UTC'); // force UTC interpretation
    $totalPaused = intval($session['total_paused_seconds']);

    if ($session['session_state'] === 'stopped' && $session['stopped_at']) {
        $endTime = strtotime($session['stopped_at'] . ' UTC');
    } else if ($session['session_state'] === 'paused' && $session['last_paused_at']) {
        $endTime = strtotime($session['last_paused_at'] . ' UTC');
    } else {
        $endTime = time(); // UTC
    }

    $effectiveElapsed = max(0, ($endTime - $startedAt) - $totalPaused);
    $remainingHours = $initialHours - ($effectiveElapsed / 3600);
    return min($initialHours, max(0, round($remainingHours, 2)));
}
```

The key fixes:
- Append `' UTC'` to timestamps from MySQL so `strtotime()` interprets them consistently
- Clamp `effectiveElapsed` to never be negative
- Clamp result to never exceed `initial_shelf_life`

### 2. Frontend: Live countdown for remaining time

**File: `src/components/dashboard/DatasetGatheringModal.tsx`**

The remaining time currently only updates when the API is polled (every 5 seconds). Add a local 1-second countdown timer that decrements the displayed remaining shelf life between polls, so the user sees it ticking down in real-time.

Changes:
- Add a `displayRemaining` state initialized from `activeSession.remaining_shelf_life`
- Use a `useEffect` with a 1-second interval that decrements `displayRemaining` by `1/3600` (one second in hours) when session is active
- Sync `displayRemaining` from the API value whenever `activeSession` updates from a poll
- Display `displayRemaining` instead of `activeSession.remaining_shelf_life`

### 3. Optional Warm-Up Toggle

**File: `src/pages/Dashboard.tsx`**

- Add a `warmUpEnabled` state initialized from `localStorage.getItem('lactron_warmup_enabled')` (default: `true`)
- Pass it to `WarmUpOverlay`: only show when `warmUpEnabled && esp32Status.isWarmingUp`
- Pass a toggle callback to the settings area

**File: `src/components/dashboard/WarmUpOverlay.tsx`**

- No changes needed -- it's already controlled by `isOpen` prop

**File: `src/components/dashboard/DashboardNav.tsx` / `ProfileDropdown.tsx`**

- Add a "Sensor Warm-Up" toggle switch in the profile dropdown menu (between Dataset Gathering and Logout)
- When toggled off, the warm-up overlay won't appear (localStorage persists the preference)
- Show a small label: "Sensor Warm-Up: On/Off"

### 4. UI Refinements for Dataset Gathering Modal

**File: `src/components/dashboard/DatasetGatheringModal.tsx`**

Minor UI polish:
- Show remaining time with more precision (e.g., `71h 58m` format instead of just `72.0h`) for better feedback
- Add a subtle pulsing animation to the "ACTIVE" badge
- Show "Awaiting sensor data..." placeholder when `latestSensor` is null and session is active

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/php/api/dataset.php` | Modify | Fix timezone handling in `computeRemainingShelfLife()`, clamp result |
| `src/components/dashboard/DatasetGatheringModal.tsx` | Modify | Add local 1-second countdown, format as hours+minutes, UI polish |
| `src/pages/Dashboard.tsx` | Modify | Add `warmUpEnabled` state from localStorage, conditionally show overlay |
| `src/components/dashboard/ProfileDropdown.tsx` | Modify | Add warm-up on/off toggle switch |
| `src/components/dashboard/DashboardNav.tsx` | Modify | Pass warm-up toggle props through |

## Technical Details

### Remaining Time Fix

The root cause of the 80h bug is likely PHP's `strtotime()` interpreting a MySQL timestamp as local time when `time()` returns UTC (or vice versa). An 8-hour offset (e.g., UTC+8 timezone) would explain `72 + 8 = 80`. The fix normalizes both sides to UTC.

### Local Countdown Logic

```typescript
// In DatasetGatheringModal
const [displayRemaining, setDisplayRemaining] = useState(0);

// Sync from API
useEffect(() => {
  if (activeSession?.remaining_shelf_life !== undefined) {
    setDisplayRemaining(Number(activeSession.remaining_shelf_life));
  }
}, [activeSession?.remaining_shelf_life]);

// Local 1-second tick
useEffect(() => {
  if (!activeSession || activeSession.session_state !== 'active') return;
  const interval = setInterval(() => {
    setDisplayRemaining(prev => Math.max(0, prev - 1/3600));
  }, 1000);
  return () => clearInterval(interval);
}, [activeSession?.session_state]);
```

### Warm-Up Toggle Storage

```typescript
// In Dashboard.tsx
const [warmUpEnabled, setWarmUpEnabled] = useState(() => {
  return localStorage.getItem('lactron_warmup_enabled') !== 'false';
});

const toggleWarmUp = () => {
  setWarmUpEnabled(prev => {
    const next = !prev;
    localStorage.setItem('lactron_warmup_enabled', String(next));
    return next;
  });
};

// In JSX
<WarmUpOverlay
  isOpen={warmUpEnabled && esp32Status.isWarmingUp}
  remaining={esp32Status.warmUpRemaining}
/>
```

