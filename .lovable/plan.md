
# Dashboard Data Display Fix Plan

## Issues Identified

After analyzing the codebase, I found several critical issues causing the dashboard to not display sensor data correctly:

### Issue 1: Field Name Mismatch in API Response
The PHP API (`sensor_data.php`) returns data with field name `timestamp`, but the frontend `SensorReading` interface and `SensorHistoryChart` component expect `created_at`.

**PHP Response (line 25-26 in sensor_data.php):**
```sql
SELECT ... created_at as timestamp FROM sensor_readings
```

**Frontend expectation (SensorReading interface):**
```typescript
created_at: string;  // Expected field name
```

**SensorHistoryChart.tsx (line 17-21):**
```typescript
// Tries to access reading.created_at but PHP sends "timestamp"
const date = new Date(reading.created_at);
```

### Issue 2: Sensor Values Being Divided Twice
The sensor values are being divided in two places:
1. In `MolecularFingerprint.tsx` for SensorCard display (lines 45, 64, 83)
2. In `SensorHistoryChart.tsx` for chart display (lines 22-26)

This causes the values to be inconsistent or too small.

### Issue 3: Dashboard Uses Initial Fake Values When No Data
When no sensor readings exist yet for a batch, the dashboard shows hardcoded values (`ethanol: 15, ammonia: 10, h2s: 5`) instead of indicating "No data":

```typescript
const [sensorData, setSensorData] = useState<SensorData>({
  ethanol: 15,  // Fake initial value
  ammonia: 10,  // Fake initial value
  h2s: 5,       // Fake initial value
});
```

### Issue 4: loadSensorHistory Doesn't Handle Empty Results Properly
When `sensorAPI.getHistory()` returns no data for a batch, the existing fake values remain displayed.

---

## Solution Overview

```text
+---------------+      Fixed Field Names      +------------------+      Correct Data      +----------------+
| PHP Backend   | ----------------------->   | Frontend API     | ------------------>  | Dashboard      |
| sensor_data   |    "created_at" instead    | SensorReading    |    Uses DB values    | Components     |
+---------------+    of "timestamp"          +------------------+    not fake data     +----------------+
```

---

## Detailed Implementation

### Fix 1: Update PHP sensor_data.php - Return Consistent Field Names
Change the SQL alias from `timestamp` to `created_at` to match frontend expectations.

**File:** `backend/php/api/sensor_data.php`
- Line 13-14: Change `created_at as timestamp` to just `created_at`
- Line 16-17: Change `created_at as timestamp` to just `created_at`  
- Line 25-26: Change `created_at as timestamp` to just `created_at`

### Fix 2: Update Dashboard State - Handle No Data Gracefully  
**File:** `src/pages/Dashboard.tsx`

Instead of starting with fake values, initialize with `null` and show a proper "No data yet" state:

```typescript
// Change from fake initial values
const [sensorData, setSensorData] = useState<SensorData | null>(null);
```

Update `loadSensorHistory` to handle empty data:
```typescript
if (response.data.length > 0) {
  // Use real data
} else {
  // Set sensorData to null to show "No readings yet"
  setSensorData(null);
}
```

### Fix 3: Update MolecularFingerprint - Show Real Values
**File:** `src/components/dashboard/MolecularFingerprint.tsx`

Remove the duplicate divisions that were causing values to be too small. Display raw values from the database without additional transformations (the Arduino already sends calibrated PPM values).

Current (incorrect - divides values):
```typescript
value={data.ethanol / 5}  // Divides again
```

Fixed (use raw values):
```typescript
value={data.ethanol}  // Use actual database value
```

### Fix 4: Update SensorHistoryChart - Remove Unnecessary Divisions
**File:** `src/components/dashboard/SensorHistoryChart.tsx`

Remove the value transformations in the chart data mapping:

Current (incorrect):
```typescript
value: sensorType === "ethanol" 
  ? (reading.ethanol ?? 0) / 5 
  : sensorType === "ammonia" 
    ? (reading.ammonia ?? 0) / 10 
    : (reading.h2s ?? 0) / 100,
```

Fixed (use raw values):
```typescript
value: reading[sensorType] ?? 0
```

### Fix 5: Update SensorCard Scales
**File:** `src/components/dashboard/SensorCard.tsx` (via props in MolecularFingerprint)

Adjust `maxValue` props to reflect actual sensor ranges based on the Arduino calibration:
- Ethanol: MQ-3 outputs 0-100 ppm typically
- Ammonia (NH3): 0-100 ppm range
- H2S: 0-50 ppm range

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/php/api/sensor_data.php` | Fix SQL field names (timestamp → created_at) |
| `src/pages/Dashboard.tsx` | Handle null sensor data, show "No data" state |
| `src/components/dashboard/MolecularFingerprint.tsx` | Remove value divisions, handle null data, adjust maxValue props |
| `src/components/dashboard/SensorHistoryChart.tsx` | Remove value divisions, use raw values |

---

## Expected Behavior After Fix

1. **When selecting a batch with sensor data:**
   - Dashboard fetches history from `sensor_data.php?action=history&batch_id=XXX`
   - PHP returns records with correct `created_at` field
   - Latest reading populates SensorCards with actual database values
   - History chart shows all readings plotted over time

2. **When selecting a batch with no sensor data:**
   - Dashboard shows "No readings yet" message
   - Charts display "No historical data available" (already implemented)

3. **Real-time updates:**
   - Every 5 seconds, dashboard re-fetches sensor history
   - If ESP32 has sent new data, it appears immediately

---

## Data Flow After Fix

```text
1. User selects batch "LAC-2026-002"
                    ↓
2. Dashboard calls: sensorAPI.getHistory("LAC-2026-002", 20)
                    ↓
3. PHP executes: SELECT ethanol, ammonia, h2s, status, 
                 predicted_shelf_life, created_at 
                 FROM sensor_readings 
                 WHERE batch_id = 'LAC-2026-002'
                    ↓
4. PHP returns: {
     success: true,
     data: [
       { ethanol: 45.2, ammonia: 12.5, h2s: 3.8, status: "good", 
         predicted_shelf_life: 5.2, created_at: "2026-01-31 10:30:00" },
       ...
     ]
   }
                    ↓
5. Dashboard sets:
   - sensorData = { ethanol: 45.2, ammonia: 12.5, h2s: 3.8 }
   - status = "good"
   - shelfLife = 5.2
   - sensorHistory = [all readings]
                    ↓
6. Components render:
   - SensorCard shows 45.2 ppm ethanol
   - Chart shows historical trend
```
