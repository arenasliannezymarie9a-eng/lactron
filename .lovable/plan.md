

# Dataset Gathering Feature (with Pause/Resume and FAIR Grade)

## Overview

Add a "Dataset Gathering" mode accessible from the profile dropdown that collects real ESP32 sensor data and lets you manually annotate it with ground-truth shelf life and grade status (GOOD, FAIR, or SPOILED) based on pH meter readings. Sessions can be paused, resumed, and stopped. No ML model is used -- this is pure raw data collection for future model training.

## How It Works

```text
1. User opens "Dataset Gathering" from profile menu
2. Sets initial shelf life (default 72 hours), clicks "Start"
3. System creates a batch named "DATASET-{timestamp}" (ESP32 treats it as a normal batch)
4. ESP32 sends sensor data -> PHP inserts it WITHOUT calling the ML model
5. Shelf life = initial_hours - hours_elapsed (excluding paused time)
6. User toggles grade (GOOD / FAIR / SPOILED) at any time based on pH meter
7. User can Pause (ESP32 stops sending, elapsed time freezes) and Resume
8. User clicks "Stop" to end the session
9. Data sits in sensor_readings ready for CSV export later
```

## Database Changes

### New table: `dataset_sessions`

```sql
CREATE TABLE dataset_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    initial_shelf_life DECIMAL(10,2) DEFAULT 72.00,
    status_override ENUM('good', 'fair', 'spoiled') DEFAULT 'good',
    session_state ENUM('active', 'paused', 'stopped') DEFAULT 'active',
    total_paused_seconds INT DEFAULT 0,
    last_paused_at TIMESTAMP NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stopped_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_state (session_state),
    INDEX idx_batch (batch_id)
);
```

Key fields:
- **`status_override`**: Now includes `'fair'` alongside `'good'` and `'spoiled'`
- **`session_state`**: Tracks `active`, `paused`, or `stopped` (replaces a simple boolean)
- **`total_paused_seconds`**: Accumulates total time spent paused so paused time is excluded from shelf life degradation
- **`last_paused_at`**: Timestamp of when the session was last paused (used to calculate pause duration on resume)

### Modify `sensor_readings` table

The existing `status` ENUM needs a `'fair'` value:

```sql
ALTER TABLE sensor_readings MODIFY status ENUM('good', 'fair', 'spoiled') DEFAULT 'good';
```

### Modify `batches` table

```sql
ALTER TABLE batches MODIFY status ENUM('good', 'fair', 'spoiled') DEFAULT 'good';
```

## Backend Changes

### New file: `backend/php/api/dataset.php`

Handles all dataset session operations:

| Action (POST) | Description |
|---|---|
| `start` | Creates a `dataset_sessions` row + a matching `batches` row (collector_name = "Dataset Collection", datetime = now). Returns the generated `DATASET-{timestamp}` batch_id. |
| `pause` | Sets `session_state = 'paused'`, records `last_paused_at = NOW()`. Clears the ESP32 batch so it stops sending. |
| `resume` | Calculates pause duration (`NOW() - last_paused_at`), adds to `total_paused_seconds`, sets `session_state = 'active'`, clears `last_paused_at`. Re-syncs ESP32 with batch_id. |
| `stop` | If paused, finalizes pause duration first. Sets `session_state = 'stopped'`, records `stopped_at`. Clears ESP32 batch. |
| `update_status` | Updates `status_override` to `'good'`, `'fair'`, or `'spoiled'` on the active/paused session. |

| Action (GET) | Description |
|---|---|
| `active` | Returns the current active or paused session (if any), including computed remaining shelf life and reading count. |
| `list` | Returns all dataset sessions for the logged-in user with reading counts. |

**Shelf life computation** (done server-side):

```
effective_elapsed = TIMESTAMPDIFF(SECOND, started_at, NOW()) - total_paused_seconds
                    (if currently paused, use last_paused_at instead of NOW())
remaining_hours = initial_shelf_life - (effective_elapsed / 3600)
remaining_hours = MAX(0, remaining_hours)
```

### Modified: `backend/php/api/sensor_data.php`

When a POST arrives with a batch_id starting with `DATASET-`:
- Skip the ML server call entirely
- Look up the matching `dataset_sessions` row
- If `session_state` is `'paused'` or `'stopped'`, reject the insert (return error)
- Compute shelf life using the formula above (excluding paused time)
- Use `status_override` as the grade
- Insert into `sensor_readings` with these manual values

No changes to the ESP32 code -- it sends data to the same endpoint with the batch_id as usual.

## Frontend Changes

### New file: `src/components/dashboard/DatasetGatheringModal.tsx`

A modal with two views:

**No active session:**
- Number input for initial shelf life (default 72, max 72, min 1)
- "Start Gathering" button
- Brief explanation text
- List of past sessions (batch_id, date, duration, reading count, final grade)

**Active/Paused session:**
- **Status bar**: Batch ID, session state badge (ACTIVE / PAUSED), elapsed time (excluding paused), remaining shelf life countdown
- **Grade toggle**: Three buttons -- GOOD (green), FAIR (amber), SPOILED (red). Active selection highlighted. Changes saved immediately to database via API call.
- **Live sensor readings**: Latest ethanol, ammonia, H2S values (auto-refreshes every 5s when active, stops refreshing when paused)
- **Reading count**: Total data points collected
- **Action buttons**:
  - When active: "Pause" button and "Stop" button
  - When paused: "Resume" button and "Stop" button
- Past sessions list below

### Modified: `src/lib/api.ts`

Add `DatasetSession` type and `datasetAPI`:

```typescript
export interface DatasetSession {
  id: number;
  batch_id: string;
  user_id: number;
  initial_shelf_life: number;
  status_override: 'good' | 'fair' | 'spoiled';
  session_state: 'active' | 'paused' | 'stopped';
  total_paused_seconds: number;
  started_at: string;
  stopped_at: string | null;
  reading_count?: number;
  remaining_shelf_life?: number;
}

export const datasetAPI = {
  start(initialShelfLife: number): Promise<ApiResponse<DatasetSession>>,
  pause(batchId: string): Promise<ApiResponse<null>>,
  resume(batchId: string): Promise<ApiResponse<null>>,
  stop(batchId: string): Promise<ApiResponse<null>>,
  updateStatus(batchId: string, status: 'good' | 'fair' | 'spoiled'): Promise<ApiResponse<null>>,
  getActive(): Promise<ApiResponse<DatasetSession | null>>,
  getList(): Promise<ApiResponse<DatasetSession[]>>,
};
```

Update the `SensorReading` status type to include `'fair'`:

```typescript
export interface SensorReading extends SensorData {
  status: 'good' | 'fair' | 'spoiled';
  // ...rest unchanged
}
```

### Modified: `src/components/dashboard/ProfileDropdown.tsx`

Add a "Dataset Gathering" menu item with a `Database` icon between "Batch History" and the logout separator.

### Modified: `src/components/dashboard/DashboardNav.tsx`

Accept and pass through a new `onOpenDatasetGathering` prop to `ProfileDropdown`.

### Modified: `src/pages/Dashboard.tsx`

- Add `isDatasetModalOpen` state
- Pass `onOpenDatasetGathering` callback through `DashboardNav`
- Render `DatasetGatheringModal`

## Pause/Resume Flow

```text
ACTIVE --[Pause]--> PAUSED
  - Records last_paused_at = NOW()
  - Clears ESP32 batch (stops data flow)
  - UI stops auto-refresh, shows "PAUSED" badge

PAUSED --[Resume]--> ACTIVE
  - Calculates pause_duration = NOW() - last_paused_at
  - Adds pause_duration to total_paused_seconds
  - Clears last_paused_at
  - Re-syncs ESP32 with batch_id
  - UI resumes auto-refresh

ACTIVE/PAUSED --[Stop]--> STOPPED
  - If paused, finalizes pause duration first
  - Records stopped_at
  - Clears ESP32 batch
  - Session archived
```

## Grade Toggle UX

Three side-by-side buttons in a segmented control style:

- **GOOD** -- Green background when selected, with a check/leaf icon
- **FAIR** -- Amber/yellow background when selected, with an alert-triangle icon
- **SPOILED** -- Red background when selected, with an x-circle icon

Clicking any button immediately saves the new grade to the database. All subsequent sensor readings inserted by the ESP32 will use this grade. The toggle is available in both active and paused states.

## Files Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/sql/database.sql` | Modify | Add `dataset_sessions` table, add `'fair'` to ENUM columns |
| `backend/php/api/dataset.php` | Create | Session management (start/pause/resume/stop/update_status) |
| `backend/php/api/sensor_data.php` | Modify | Skip ML for `DATASET-*` batches, reject if paused/stopped |
| `src/lib/api.ts` | Modify | Add `DatasetSession` type, `datasetAPI`, update status types |
| `src/components/dashboard/DatasetGatheringModal.tsx` | Create | Full modal UI with pause/resume and 3-grade toggle |
| `src/components/dashboard/ProfileDropdown.tsx` | Modify | Add "Dataset Gathering" menu item |
| `src/components/dashboard/DashboardNav.tsx` | Modify | Pass through `onOpenDatasetGathering` prop |
| `src/pages/Dashboard.tsx` | Modify | Add modal state and rendering |

