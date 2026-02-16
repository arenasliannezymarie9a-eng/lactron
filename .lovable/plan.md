

# Fix Sensor Reading Retrieval: Only New Readings Per Batch

## Problem

When a batch is selected, the dashboard fetches ALL sensor readings ever recorded for that `batch_id` from the database. This means:
- If a batch was previously used and already has old readings, those stale readings count toward the 30-reading limit
- New sensor data from the ESP32 gets mixed with historical data
- The progress bar may show incorrect progress (e.g., already "complete" from old data)

The system should only track the 30 **new** readings that the ESP32 sends after the batch is created or activated.

---

## Solution

### 1. Backend: Cap at 30 Readings Per Batch

**File: `backend/php/api/sensor_data.php`** (POST handler)

Before inserting a new reading for a normal (non-dataset) batch, check the current count. If the batch already has 30 readings, reject the insert with an error response. This prevents the ESP32 from adding more than 30 readings to any batch.

```text
Before INSERT:
  SELECT COUNT(*) FROM sensor_readings WHERE batch_id = ?
  If count >= 30, return { success: false, error: "Batch reading limit reached (30/30)" }
```

### 2. Backend: Filter History by Batch Creation Time

**File: `backend/php/api/sensor_data.php`** (GET history action)

Update the history query to only return readings that were created on or after the batch's own `created_at` timestamp. This ensures old orphaned readings (if any exist) are excluded.

```sql
-- Before
SELECT ... FROM sensor_readings WHERE batch_id = ? ORDER BY created_at DESC LIMIT ?

-- After
SELECT sr.* FROM sensor_readings sr
  INNER JOIN batches b ON sr.batch_id = b.batch_id
  WHERE sr.batch_id = ? AND sr.created_at >= b.created_at
  ORDER BY sr.created_at DESC LIMIT ?
```

### 3. Backend: Include Reading Count in Batch List

**File: `backend/php/api/batches.php`** (list action)

The batch list query already includes a `reading_count` subquery. Update it to also filter by `created_at >= batch.created_at` so the count is accurate:

```sql
(SELECT COUNT(*) FROM sensor_readings sr 
 WHERE sr.batch_id = b.batch_id AND sr.created_at >= b.created_at) as reading_count
```

### 4. Frontend: Reset State on Batch Selection

**File: `src/pages/Dashboard.tsx`**

When selecting a new batch (`handleSelectBatch`), explicitly reset `sensorData`, `sensorHistory`, `status`, and `shelfLife` to their initial empty states before the first poll fetches fresh data. This prevents stale data from a previous batch from flashing in the UI.

```text
handleSelectBatch:
  setSensorData(null)
  setSensorHistory([])
  setStatus("good")
  setShelfLife(0)
  setCurrentBatch(batch)
  // Then the polling useEffect kicks in and fetches fresh data
```

### 5. Frontend: Show Proper Progress

No changes needed to `BatchSelector.tsx` or `MolecularFingerprint.tsx` -- they already use `readingCount` and `maxReadings` from Dashboard. Once the backend returns only valid readings, the progress bar will be accurate.

---

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/php/api/sensor_data.php` | Modify | Add 30-reading cap on INSERT, filter history by batch creation time |
| `backend/php/api/batches.php` | Modify | Update reading_count subquery to filter by batch creation time |
| `src/pages/Dashboard.tsx` | Modify | Reset sensor state when switching batches |

---

## Technical Details

### Data Flow After Changes

```text
1. User creates/selects batch (e.g., "LAC-2026-0010")
2. ESP32 is synced with that batch_id
3. ESP32 sends sensor data to PHP backend
4. PHP checks: does this batch already have 30 readings? 
   - No  -> INSERT reading, return prediction
   - Yes -> Return error "limit reached", ESP32 stops sending
5. Frontend polls history every 5s
6. PHP returns only readings WHERE created_at >= batch.created_at
7. Frontend updates progress bar: X / 30
8. At 30/30, polling stops, auto-save triggers, report becomes available
```

### ESP32 Handling of "Limit Reached"

The ESP32 code currently doesn't check the response from the backend. It will keep sending data, but the backend will simply reject it. This is fine -- no wasted data since the readings won't be stored. If desired, a future enhancement could have the ESP32 check the response and stop sending.

